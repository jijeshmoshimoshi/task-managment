import jwt from 'jsonwebtoken';
import { env } from '../../../config/env';
import { Role } from '@taskmaster/shared';
import { UnauthorizedError } from '../../../common/errors/app-error';

export interface AccessTokenPayload {
  userId: string;
  organizationId: string;
  role: Role;
  sessionId: string;
}

export interface RefreshTokenPayload {
  userId: string;
  organizationId: string;
  sessionId: string;
  tokenFamily: string;
}

export class JwtService {
  /**
   * Signs a short-lived access token.
   */
  public static signAccessToken(payload: AccessTokenPayload): string {
    return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
      expiresIn: env.JWT_ACCESS_EXPIRES_IN as any,
      algorithm: 'HS256',
    });
  }

  /**
   * Verifies an access token.
   */
  public static verifyAccessToken(token: string): AccessTokenPayload {
    try {
      return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        throw new UnauthorizedError('Access token has expired', 'AUTH_TOKEN_EXPIRED');
      }
      throw new UnauthorizedError('Invalid access token', 'AUTH_TOKEN_INVALID');
    }
  }

  /**
   * Signs a rotating refresh token.
   */
  public static signRefreshToken(payload: RefreshTokenPayload): string {
    return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
      expiresIn: env.JWT_REFRESH_EXPIRES_IN as any,
      algorithm: 'HS256',
    });
  }

  /**
   * Verifies a refresh token.
   */
  public static verifyRefreshToken(token: string): RefreshTokenPayload {
    try {
      return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        throw new UnauthorizedError('Refresh token has expired', 'AUTH_TOKEN_EXPIRED');
      }
      throw new UnauthorizedError('Invalid refresh token', 'AUTH_TOKEN_INVALID');
    }
  }
}
