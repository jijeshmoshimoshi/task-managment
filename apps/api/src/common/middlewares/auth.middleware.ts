import { Request, Response, NextFunction } from 'express';
import { JwtService } from '../../modules/auth/services/jwt.service';
import { SessionService } from '../../modules/auth/services/session.service';
import { UserModel } from '../../modules/users/user.model';
import { UnauthorizedError, ForbiddenError } from '../errors/app-error';
import { Role } from '@taskmaster/shared';

// Extend Express Request interface with authenticated user details
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        organizationId: string;
        email: string;
        firstName: string;
        lastName: string;
        role: Role;
        status: string;
      };
      sessionId?: string;
      organizationId?: string;
    }
  }
}

export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    let token: string | undefined;

    // 1. Check Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies?.access_token) {
      // 2. Check signed/unsigned cookie fallback
      token = req.cookies.access_token;
    }

    if (!token) {
      throw new UnauthorizedError('Authentication required. Please log in.');
    }

    // 3. Verify JWT signature and expiration
    const payload = JwtService.verifyAccessToken(token);

    // 4. Verify session is still active in Redis
    const isSessionActive = await SessionService.isSessionActive(payload.sessionId);
    if (!isSessionActive) {
      throw new UnauthorizedError(
        'Session has been revoked or expired. Please log in again.',
        'AUTH_TOKEN_REVOKED',
      );
    }

    // 5. Fetch user and verify active status
    const user = await UserModel.findById(payload.userId).lean();
    if (!user || user.isDeleted) {
      throw new UnauthorizedError('User account not found', 'AUTH_UNAUTHORIZED');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedError(
        `Your account status is ${user.status}. Access is restricted.`,
        'AUTH_ACCOUNT_SUSPENDED',
      );
    }

    // 6. Attach to request
    req.user = {
      id: user._id.toString(),
      organizationId: user.organizationId.toString(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      status: user.status,
    };
    req.sessionId = payload.sessionId;
    req.organizationId = user.organizationId.toString();

    next();
  } catch (error) {
    next(error);
  }
};

export const authMiddleware = authenticate;

export const requireRole = (roles: Role | Role[]) => {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError());
      return;
    }
    if (!allowedRoles.includes(req.user.role)) {
      next(new ForbiddenError('You do not have permission to perform this action'));
      return;
    }
    next();
  };
};

