import crypto from 'crypto';
import { redisClient } from '../../../config/redis';
import { SessionModel } from '../models/session.model';
import { CryptoService } from '../../../common/services/crypto.service';
import { UnauthorizedError } from '../../../common/errors/app-error';
import { logger } from '../../../config/logger';
import { AuditService } from '../../audit/audit.service';
import { AUDIT_ACTIONS } from '@taskmaster/shared';

export interface CreateSessionParams {
  userId: string;
  organizationId: string;
  userAgent: string;
  ipAddress: string;
}

export interface SessionData {
  sessionId: string;
  userId: string;
  organizationId: string;
  tokenFamily: string;
  refreshTokenHash: string;
  userAgent: string;
  ipAddress: string;
  expiresAt: string;
}

export class SessionService {
  private static readonly SESSION_PREFIX = 'sess:';
  private static readonly USER_SESSIONS_PREFIX = 'user_sess:';
  private static readonly SESSION_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

  /**
   * Creates a new user session with rotating refresh token and token family tracking.
   */
  public static async createSession(params: CreateSessionParams): Promise<{
    sessionId: string;
    tokenFamily: string;
    refreshToken: string;
  }> {
    const sessionId = `sess_${crypto.randomUUID()}`;
    const tokenFamily = `fam_${crypto.randomUUID()}`;
    const rawRefreshToken = CryptoService.generateRandomToken(48);
    const refreshTokenHash = CryptoService.hashToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + this.SESSION_TTL_SECONDS * 1000);

    const sessionData: SessionData = {
      sessionId,
      userId: params.userId,
      organizationId: params.organizationId,
      tokenFamily,
      refreshTokenHash,
      userAgent: params.userAgent,
      ipAddress: params.ipAddress,
      expiresAt: expiresAt.toISOString(),
    };

    // 1. Save in Redis for ultra-fast lookup & revocation
    const multi = redisClient.multi();
    multi.set(
      `${this.SESSION_PREFIX}${sessionId}`,
      JSON.stringify(sessionData),
      'EX',
      this.SESSION_TTL_SECONDS,
    );
    multi.sadd(`${this.USER_SESSIONS_PREFIX}${params.userId}`, sessionId);
    multi.expire(`${this.USER_SESSIONS_PREFIX}${params.userId}`, this.SESSION_TTL_SECONDS);
    await multi.exec();

    // 2. Persist in MongoDB for audit history & reporting
    await SessionModel.create({
      sessionId,
      userId: params.userId,
      organizationId: params.organizationId,
      tokenFamily,
      refreshTokenHash,
      userAgent: params.userAgent,
      ipAddress: params.ipAddress,
      expiresAt,
    });

    return {
      sessionId,
      tokenFamily,
      refreshToken: rawRefreshToken,
    };
  }

  /**
   * Validates refresh token and rotates it.
   * If reuse of an old refresh token is detected: Revokes the entire token family immediately!
   */
  public static async rotateRefreshToken(
    sessionId: string,
    tokenFamily: string,
    rawRefreshToken: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<{
    userId: string;
    organizationId: string;
    newRefreshToken: string;
  }> {
    const redisKey = `${this.SESSION_PREFIX}${sessionId}`;
    const sessionJson = await redisClient.get(redisKey);

    let session: SessionData | null = null;
    if (sessionJson) {
      session = JSON.parse(sessionJson);
    } else {
      // Fallback to Mongo if Redis cache evicted
      const mongoDoc = await SessionModel.findOne({ sessionId, isRevoked: false });
      if (mongoDoc) {
        session = {
          sessionId: mongoDoc.sessionId,
          userId: mongoDoc.userId.toString(),
          organizationId: mongoDoc.organizationId.toString(),
          tokenFamily: mongoDoc.tokenFamily,
          refreshTokenHash: mongoDoc.refreshTokenHash,
          userAgent: mongoDoc.userAgent,
          ipAddress: mongoDoc.ipAddress,
          expiresAt: mongoDoc.expiresAt.toISOString(),
        };
      }
    }

    if (!session) {
      throw new UnauthorizedError('Session does not exist or has expired', 'AUTH_TOKEN_INVALID');
    }

    const providedHash = CryptoService.hashToken(rawRefreshToken);

    // 🛡️ REUSE DETECTION: If token hash doesn't match the current active one, token theft suspected!
    if (session.refreshTokenHash !== providedHash) {
      logger.warn(
        { userId: session.userId, sessionId, tokenFamily, ipAddress },
        '🚨 REFRESH TOKEN REUSE DETECTED! Revoking entire token family.',
      );

      // Invalidate all sessions for this user across all devices
      await this.revokeAllUserSessions(
        session.userId,
        session.organizationId,
        'Compromised refresh token family reuse detected',
      );

      throw new UnauthorizedError(
        'Suspicious session activity detected. All active sessions have been revoked for your security.',
        'AUTH_TOKEN_REVOKED',
      );
    }

    // Generate new rotated refresh token
    const newRawRefreshToken = CryptoService.generateRandomToken(48);
    const newRefreshTokenHash = CryptoService.hashToken(newRawRefreshToken);

    session.refreshTokenHash = newRefreshTokenHash;
    session.ipAddress = ipAddress;
    session.userAgent = userAgent;

    // Update Redis
    await redisClient.set(redisKey, JSON.stringify(session), 'EX', this.SESSION_TTL_SECONDS);

    // Update Mongo
    await SessionModel.updateOne(
      { sessionId },
      {
        $set: {
          refreshTokenHash: newRefreshTokenHash,
          ipAddress,
          userAgent,
          lastUsedAt: new Date(),
        },
      },
    );

    return {
      userId: session.userId,
      organizationId: session.organizationId,
      newRefreshToken: newRawRefreshToken,
    };
  }

  /**
   * Revokes a single session.
   */
  public static async revokeSession(
    sessionId: string,
    userId: string,
    reason = 'User logged out',
  ): Promise<void> {
    await redisClient.del(`${this.SESSION_PREFIX}${sessionId}`);
    await redisClient.srem(`${this.USER_SESSIONS_PREFIX}${userId}`, sessionId);
    await SessionModel.updateOne(
      { sessionId },
      { $set: { isRevoked: true, revokedReason: reason } },
    );
  }

  /**
   * Revokes all active sessions for a user ("log out everywhere").
   */
  public static async revokeAllUserSessions(
    userId: string,
    organizationId?: string,
    reason = 'All sessions revoked',
  ): Promise<void> {
    const sessionIds = await redisClient.smembers(`${this.USER_SESSIONS_PREFIX}${userId}`);
    if (sessionIds.length > 0) {
      const keys = sessionIds.map((id) => `${this.SESSION_PREFIX}${id}`);
      await redisClient.del(...keys);
      await redisClient.del(`${this.USER_SESSIONS_PREFIX}${userId}`);
    }

    await SessionModel.updateMany(
      { userId, isRevoked: false },
      { $set: { isRevoked: true, revokedReason: reason } },
    );

    if (organizationId) {
      await AuditService.log({
        organizationId,
        actorId: userId,
        actorEmail: '',
        actorName: '',
        action: AUDIT_ACTIONS.SESSION_REVOKED,
        resourceType: 'session',
        resourceTitle: 'All sessions revoked',
      });
    }
  }

  /**
   * Lists all active sessions for a user.
   */
  public static async getUserActiveSessions(
    userId: string,
    currentSessionId?: string,
  ): Promise<
    Array<{
      id: string;
      userAgent: string;
      ipAddress: string;
      createdAt: string;
      lastUsedAt: string;
      isCurrent: boolean;
    }>
  > {
    const mongoSessions = await SessionModel.find({
      userId,
      isRevoked: false,
      expiresAt: { $gt: new Date() },
    })
      .sort({ lastUsedAt: -1 })
      .lean();

    return mongoSessions.map((s) => ({
      id: s.sessionId,
      userAgent: s.userAgent,
      ipAddress: s.ipAddress,
      createdAt: s.createdAt.toISOString(),
      lastUsedAt: s.lastUsedAt.toISOString(),
      isCurrent: s.sessionId === currentSessionId,
    }));
  }

  /**
   * Fast verification if a session is currently active in Redis.
   */
  public static async isSessionActive(sessionId: string): Promise<boolean> {
    const exists = await redisClient.exists(`${this.SESSION_PREFIX}${sessionId}`);
    return exists === 1;
  }
}
