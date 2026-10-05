import { Request, Response, NextFunction } from 'express';
import { UserModel } from '../users/user.model';
import { OrganizationModel } from '../orgs/org.model';
import { InvitationModel } from './models/invitation.model';
import { PasswordResetModel } from './models/password-reset.model';
import { CryptoService } from '../../common/services/crypto.service';
import { JwtService } from './services/jwt.service';
import { SessionService } from './services/session.service';
import { TwoFactorService } from './services/two-factor.service';
import { EmailService } from '../../common/services/email.service';
import { AuditService } from '../audit/audit.service';
import {
  BadRequestError,
  UnauthorizedError,
  NotFoundError,
} from '../../common/errors/app-error';
import {
  AUDIT_ACTIONS,
  ERROR_CODES,
  USER_STATUSES,
} from '@taskmaster/shared';
import { env } from '../../config/env';

export class AuthController {
  /**
   * Helper to set secure refresh token cookie.
   */
  private static setRefreshTokenCookie(res: Response, token: string): void {
    res.cookie('refresh_token', token, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/api/v1/auth',
    });
  }

  /**
   * Login with email and password, progressive lockout, and optional 2FA.
   */
  public async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password, twoFactorCode } = req.body;
      const ipAddress = req.ip || req.socket.remoteAddress || '0.0.0.0';
      const userAgent = req.get('user-agent') || 'Unknown';

      // 1. Find user by email
      const user = await UserModel.findOne({ email: email.toLowerCase(), isDeleted: false });
      if (!user) {
        // Generic error response to prevent user enumeration
        throw new UnauthorizedError('Invalid email or password', ERROR_CODES.AUTH_INVALID_CREDENTIALS);
      }

      // 2. Check if user account is locked out
      if (user.lockoutUntil && user.lockoutUntil > new Date()) {
        const remainingMinutes = Math.ceil(
          (user.lockoutUntil.getTime() - Date.now()) / (60 * 1000),
        );
        throw new UnauthorizedError(
          `Account is temporarily locked due to multiple failed login attempts. Please try again in ${remainingMinutes} minute(s).`,
          ERROR_CODES.AUTH_ACCOUNT_LOCKED,
        );
      }

      // 3. Verify password with Argon2id
      const isPasswordValid = await CryptoService.verifyPassword(user.passwordHash, password);
      if (!isPasswordValid) {
        // Increment failed attempts and trigger lockout if threshold reached
        user.failedLoginAttempts += 1;
        if (user.failedLoginAttempts >= 5) {
          user.lockoutUntil = new Date(Date.now() + 15 * 60 * 1000); // 15-min lockout
        }
        await user.save();
        throw new UnauthorizedError('Invalid email or password', ERROR_CODES.AUTH_INVALID_CREDENTIALS);
      }

      // 4. Check user status
      if (user.status !== USER_STATUSES.ACTIVE) {
        throw new UnauthorizedError(
          `Your account is ${user.status.toLowerCase()}. Please contact your organization administrator.`,
          ERROR_CODES.AUTH_ACCOUNT_SUSPENDED,
        );
      }

      // 5. 2FA Verification if enabled
      if (user.isTwoFactorEnabled) {
        if (!twoFactorCode) {
          res.status(200).json({
            success: true,
            data: {
              twoFactorRequired: true,
              message: 'Please provide your 6-digit authenticator code or recovery code.',
            },
          });
          return;
        }

        let is2FAValid = false;

        // Try TOTP code first
        if (user.twoFactorSecretEncrypted) {
          const decryptedSecret = CryptoService.decrypt(user.twoFactorSecretEncrypted);
          is2FAValid = TwoFactorService.verifyToken(twoFactorCode, decryptedSecret);
        }

        // Try backup recovery code if TOTP failed
        if (!is2FAValid && user.twoFactorRecoveryCodesEncrypted?.length) {
          const matchedIndex = TwoFactorService.verifyRecoveryCode(
            twoFactorCode,
            user.twoFactorRecoveryCodesEncrypted,
          );
          if (matchedIndex !== null) {
            is2FAValid = true;
            // Consume and remove the used recovery code
            user.twoFactorRecoveryCodesEncrypted.splice(matchedIndex, 1);
            await user.save();
          }
        }

        if (!is2FAValid) {
          throw new UnauthorizedError('Invalid two-factor authentication code', ERROR_CODES.AUTH_2FA_INVALID);
        }
      }

      // Reset failed login counter on successful authentication
      if (user.failedLoginAttempts > 0 || user.lockoutUntil) {
        user.failedLoginAttempts = 0;
        user.lockoutUntil = undefined;
      }
      user.lastLoginAt = new Date().toISOString();
      await user.save();

      // 6. Create session in Redis & Mongo with token family tracking
      const session = await SessionService.createSession({
        userId: user._id.toString(),
        organizationId: user.organizationId.toString(),
        userAgent,
        ipAddress,
      });

      // 7. Generate JWT access token
      const accessToken = JwtService.signAccessToken({
        userId: user._id.toString(),
        organizationId: user.organizationId.toString(),
        role: user.role,
        sessionId: session.sessionId,
      });

      // 8. Set rotating refresh token in httpOnly Secure cookie
      AuthController.setRefreshTokenCookie(res, session.refreshToken);

      // 9. Emit immutable audit log
      AuditService.log({
        organizationId: user.organizationId.toString(),
        actorId: user._id.toString(),
        actorEmail: user.email,
        actorName: `${user.firstName} ${user.lastName}`,
        action: AUDIT_ACTIONS.LOGIN,
        resourceType: 'auth',
        resourceTitle: 'User Logged In',
        ipAddress,
        userAgent,
      });

      // 10. Fetch org details for client
      const org = await OrganizationModel.findById(user.organizationId).lean();

      res.status(200).json({
        success: true,
        data: {
          accessToken,
          user: {
            id: user._id.toString(),
            organizationId: user.organizationId.toString(),
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            status: user.status,
            avatarUrl: user.avatarUrl,
            jobTitle: user.jobTitle,
            timezone: user.timezone,
            isTwoFactorEnabled: user.isTwoFactorEnabled,
          },
          organization: org ? {
            id: org._id.toString(),
            name: org.name,
            slug: org.slug,
            branding: org.branding,
          } : null,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Rotates refresh token and issues a new access token.
   */
  public async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawRefreshToken = req.cookies?.refresh_token;
      if (!rawRefreshToken) {
        throw new UnauthorizedError('Refresh token required', ERROR_CODES.AUTH_UNAUTHORIZED);
      }

      const ipAddress = req.ip || req.socket.remoteAddress || '0.0.0.0';
      const userAgent = req.get('user-agent') || 'Unknown';

      // Verify token payload to extract sessionId and tokenFamily
      // If signature is invalid/expired, we look up session by raw token
      const payload = JwtService.verifyRefreshToken(rawRefreshToken);

      const rotated = await SessionService.rotateRefreshToken(
        payload.sessionId,
        payload.tokenFamily,
        rawRefreshToken,
        ipAddress,
        userAgent,
      );

      const user = await UserModel.findById(rotated.userId).lean();
      if (!user || user.status !== USER_STATUSES.ACTIVE || user.isDeleted) {
        throw new UnauthorizedError('User account inactive or deleted', ERROR_CODES.AUTH_ACCOUNT_SUSPENDED);
      }

      // Generate new access token
      const newAccessToken = JwtService.signAccessToken({
        userId: user._id.toString(),
        organizationId: user.organizationId.toString(),
        role: user.role,
        sessionId: payload.sessionId,
      });

      // Set new rotated refresh token in cookie
      AuthController.setRefreshTokenCookie(res, rotated.newRefreshToken);

      res.status(200).json({
        success: true,
        data: {
          accessToken: newAccessToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Log out from the current session.
   */
  public async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (req.user && req.sessionId) {
        await SessionService.revokeSession(req.sessionId, req.user.id, 'User initiated logout');

        AuditService.log({
          organizationId: req.user.organizationId,
          actorId: req.user.id,
          actorEmail: req.user.email,
          actorName: `${req.user.firstName} ${req.user.lastName}`,
          action: AUDIT_ACTIONS.LOGOUT,
          resourceType: 'auth',
          resourceTitle: 'User Logged Out',
          ipAddress: req.ip || req.socket.remoteAddress,
          userAgent: req.get('user-agent'),
        });
      }

      res.clearCookie('refresh_token', { path: '/api/v1/auth' });
      res.status(200).json({
        success: true,
        data: { message: 'Logged out successfully' },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Log out everywhere (revoke all active sessions).
   */
  public async logoutAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError();
      }

      await SessionService.revokeAllUserSessions(
        req.user.id,
        req.user.organizationId,
        'User triggered log out everywhere',
      );

      res.clearCookie('refresh_token', { path: '/api/v1/auth' });
      res.status(200).json({
        success: true,
        data: { message: 'All active sessions have been revoked.' },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get current authenticated user profile & permissions.
   */
  public async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError();
      }

      const user = await UserModel.findById(req.user.id).lean();
      if (!user) {
        throw new NotFoundError('User');
      }

      const org = await OrganizationModel.findById(user.organizationId).lean();

      res.status(200).json({
        success: true,
        data: {
          user: {
            id: user._id.toString(),
            organizationId: user.organizationId.toString(),
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            status: user.status,
            avatarUrl: user.avatarUrl,
            jobTitle: user.jobTitle,
            timezone: user.timezone,
            isTwoFactorEnabled: user.isTwoFactorEnabled,
            departmentId: user.departmentId?.toString(),
            teamIds: user.teamIds?.map((id: any) => id.toString()) || [],
          },
          organization: org ? {
            id: org._id.toString(),
            name: org.name,
            slug: org.slug,
            branding: org.branding,
          } : null,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * List all active sessions for current user.
   */
  public async getSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError();
      }

      const sessions = await SessionService.getUserActiveSessions(req.user.id, req.sessionId);
      res.status(200).json({
        success: true,
        data: sessions,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Revoke a specific session.
   */
  public async revokeSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError();
      }
      const sessionId = req.params.sessionId as string;
      if (!sessionId) {
        throw new BadRequestError('Session ID required');
      }

      await SessionService.revokeSession(sessionId, req.user.id, 'User manually revoked session');
      res.status(200).json({
        success: true,
        data: { message: 'Session revoked successfully' },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Accept invitation and create password.
   */
  public async acceptInvite(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token, firstName, lastName, password } = req.body;

      // 1. Hash token to match DB
      const tokenHash = CryptoService.hashToken(token);
      const invite = await InvitationModel.findOne({ tokenHash, acceptedAt: null });

      if (!invite || invite.expiresAt < new Date()) {
        throw new BadRequestError('Invalid or expired invitation token');
      }

      // 2. Check if password was breached
      const isBreached = await CryptoService.isPasswordBreached(password);
      if (isBreached) {
        throw new BadRequestError(
          'This password has appeared in known data breaches. Please choose a different, secure password.',
        );
      }

      // 3. Hash password with Argon2id
      const passwordHash = await CryptoService.hashPassword(password);

      // 4. Create or activate User
      let user = await UserModel.findOne({ email: invite.email, organizationId: invite.organizationId });
      if (user) {
        user.firstName = firstName;
        user.lastName = lastName;
        user.passwordHash = passwordHash;
        user.status = USER_STATUSES.ACTIVE;
        user.role = invite.role;
        if (invite.departmentId) user.departmentId = invite.departmentId;
        if (invite.teamIds?.length) user.teamIds = invite.teamIds;
        await user.save();
      } else {
        user = await UserModel.create({
          organizationId: invite.organizationId,
          email: invite.email,
          firstName,
          lastName,
          passwordHash,
          role: invite.role,
          status: USER_STATUSES.ACTIVE,
          departmentId: invite.departmentId,
          teamIds: invite.teamIds || [],
        });
      }

      // 5. Mark invite accepted
      invite.acceptedAt = new Date();
      await invite.save();

      // 6. Emit audit log
      AuditService.log({
        organizationId: invite.organizationId.toString(),
        actorId: user._id.toString(),
        actorEmail: user.email,
        actorName: `${firstName} ${lastName}`,
        action: AUDIT_ACTIONS.USER_CREATED,
        resourceType: 'user',
        resourceId: user._id.toString(),
        resourceTitle: `${firstName} ${lastName} accepted invitation`,
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.get('user-agent'),
      });

      res.status(201).json({
        success: true,
        data: {
          message: 'Account successfully created and activated. You can now sign in.',
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Request password reset token.
   */
  public async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body;
      const user = await UserModel.findOne({ email: email.toLowerCase(), isDeleted: false });

      if (user && user.status === USER_STATUSES.ACTIVE) {
        const rawToken = CryptoService.generateRandomToken(32);
        const tokenHash = CryptoService.hashToken(rawToken);
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        await PasswordResetModel.create({
          userId: user._id,
          tokenHash,
          expiresAt,
          ipAddress: req.ip || req.socket.remoteAddress || '0.0.0.0',
          userAgent: req.get('user-agent') || 'Unknown',
        });

        await EmailService.sendPasswordResetEmail(user.email, rawToken, user.firstName);

        AuditService.log({
          organizationId: user.organizationId.toString(),
          actorId: user._id.toString(),
          actorEmail: user.email,
          actorName: `${user.firstName} ${user.lastName}`,
          action: AUDIT_ACTIONS.PASSWORD_RESET_REQUESTED,
          resourceType: 'auth',
          resourceTitle: 'Password reset requested',
          ipAddress: req.ip || req.socket.remoteAddress,
          userAgent: req.get('user-agent'),
        });
      }

      // Always return same message to prevent user enumeration
      res.status(200).json({
        success: true,
        data: {
          message:
            'If an account exists with this email address, you will receive a password reset link shortly.',
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Complete password reset with token.
   */
  public async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token, newPassword } = req.body;
      const tokenHash = CryptoService.hashToken(token);

      const resetDoc = await PasswordResetModel.findOne({
        tokenHash,
        usedAt: null,
        expiresAt: { $gt: new Date() },
      });

      if (!resetDoc) {
        throw new BadRequestError('Invalid or expired password reset token');
      }

      // Check breach list
      const isBreached = await CryptoService.isPasswordBreached(newPassword);
      if (isBreached) {
        throw new BadRequestError(
          'This password has appeared in known data breaches. Please choose a different, secure password.',
        );
      }

      const user = await UserModel.findById(resetDoc.userId);
      if (!user || user.isDeleted) {
        throw new NotFoundError('User');
      }

      // Hash new password with Argon2id
      user.passwordHash = await CryptoService.hashPassword(newPassword);
      user.failedLoginAttempts = 0;
      user.lockoutUntil = undefined;
      await user.save();

      // Invalidate all active sessions everywhere for security
      await SessionService.revokeAllUserSessions(
        user._id.toString(),
        user.organizationId.toString(),
        'Password changed via reset link',
      );

      // Mark token used
      resetDoc.usedAt = new Date();
      await resetDoc.save();

      AuditService.log({
        organizationId: user.organizationId.toString(),
        actorId: user._id.toString(),
        actorEmail: user.email,
        actorName: `${user.firstName} ${user.lastName}`,
        action: AUDIT_ACTIONS.PASSWORD_RESET_COMPLETED,
        resourceType: 'auth',
        resourceTitle: 'Password reset successfully completed',
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.get('user-agent'),
      });

      res.status(200).json({
        success: true,
        data: {
          message: 'Your password has been successfully reset. Please log in with your new credentials.',
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Generate 2FA secret and QR code for Authenticator setup.
   */
  public async generate2FA(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError();
      }

      const org = await OrganizationModel.findById(req.user.organizationId).lean();
      const appName = org?.name ? `TaskMaster (${org.name})` : 'TaskMaster';

      const result = await TwoFactorService.generateSecret(req.user.email, appName);

      res.status(200).json({
        success: true,
        data: {
          secret: result.secret,
          qrCodeDataUrl: result.qrCodeDataUrl,
          otpauthUrl: result.otpauthUrl,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Enable 2FA after verifying the user entered a valid TOTP code.
   */
  public async enable2FA(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError();
      }
      const { secret, code } = req.body;

      const isValid = TwoFactorService.verifyToken(code, secret);
      if (!isValid) {
        throw new BadRequestError('Invalid 6-digit code. Please verify and try again.');
      }

      const user = await UserModel.findById(req.user.id);
      if (!user) {
        throw new NotFoundError('User');
      }

      // Generate recovery codes and encrypt secret & codes at rest with AES-256-GCM
      const { plainCodes, encryptedCodes } = TwoFactorService.generateEncryptedRecoveryCodes();
      const encryptedSecret = CryptoService.encrypt(secret);

      user.isTwoFactorEnabled = true;
      user.twoFactorSecretEncrypted = encryptedSecret;
      user.twoFactorRecoveryCodesEncrypted = encryptedCodes;
      await user.save();

      AuditService.log({
        organizationId: user.organizationId.toString(),
        actorId: user._id.toString(),
        actorEmail: user.email,
        actorName: `${user.firstName} ${user.lastName}`,
        action: AUDIT_ACTIONS.TWO_FACTOR_ENABLED,
        resourceType: 'auth',
        resourceTitle: 'Two-factor authentication enabled',
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.get('user-agent'),
      });

      res.status(200).json({
        success: true,
        data: {
          message: 'Two-factor authentication successfully enabled.',
          recoveryCodes: plainCodes,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Disable 2FA.
   */
  public async disable2FA(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError();
      }

      const user = await UserModel.findById(req.user.id);
      if (!user) {
        throw new NotFoundError('User');
      }

      user.isTwoFactorEnabled = false;
      user.twoFactorSecretEncrypted = undefined;
      user.twoFactorRecoveryCodesEncrypted = [];
      await user.save();

      AuditService.log({
        organizationId: user.organizationId.toString(),
        actorId: user._id.toString(),
        actorEmail: user.email,
        actorName: `${user.firstName} ${user.lastName}`,
        action: AUDIT_ACTIONS.TWO_FACTOR_DISABLED,
        resourceType: 'auth',
        resourceTitle: 'Two-factor authentication disabled',
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.get('user-agent'),
      });

      res.status(200).json({
        success: true,
        data: { message: 'Two-factor authentication has been disabled.' },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
