import { Router } from 'express';
import { authController } from './auth.controller';
import { authenticate } from '../../common/middlewares/auth.middleware';
import { validate } from '../../common/middlewares/validate.middleware';
import { authRateLimiter } from '../../common/middlewares/rate-limiter.middleware';
import {
  LoginSchema,
  AcceptInviteSchema,
  RequestPasswordResetSchema,
  ResetPasswordSchema,
  Enable2FASchema,
} from '@taskmaster/shared';

const router: Router = Router();

// Public auth routes (rate-limited)
router.post('/login', authRateLimiter, validate({ body: LoginSchema }), authController.login);
router.post('/refresh', authController.refresh);
router.post(
  '/forgot-password',
  authRateLimiter,
  validate({ body: RequestPasswordResetSchema }),
  authController.forgotPassword,
);
router.post(
  '/reset-password',
  authRateLimiter,
  validate({ body: ResetPasswordSchema }),
  authController.resetPassword,
);
router.post(
  '/accept-invite',
  authRateLimiter,
  validate({ body: AcceptInviteSchema }),
  authController.acceptInvite,
);

// Protected routes (require valid JWT + active session)
router.get('/me', authenticate, authController.getMe);
router.post('/logout', authenticate, authController.logout);
router.post('/logout-all', authenticate, authController.logoutAll);
router.get('/sessions', authenticate, authController.getSessions);
router.delete('/sessions/:sessionId', authenticate, authController.revokeSession);

// 2FA Management
router.post('/2fa/generate', authenticate, authController.generate2FA);
router.post('/2fa/enable', authenticate, validate({ body: Enable2FASchema }), authController.enable2FA);
router.post('/2fa/disable', authenticate, authController.disable2FA);

export const authRouter: Router = router;
