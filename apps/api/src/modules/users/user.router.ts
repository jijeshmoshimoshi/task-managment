import { Router } from 'express';
import { userController } from './user.controller';
import { authMiddleware, requireRole } from '../../common/middlewares/auth.middleware';
import { validate } from '../../common/middlewares/validate.middleware';
import {
  InviteUserSchema,
  UpdateUserSchema,
  UpdateUserRoleSchema,
  UpdateUserStatusSchema,
  ROLES,
} from '@taskmaster/shared';

const router: Router = Router();

// Require authentication for all user endpoints
router.use(authMiddleware);

// Profile endpoint for authenticated user
router.patch('/profile/me', userController.updateProfile);

// List users and get user by ID
router.get('/', userController.listUsers);
router.get('/:id', userController.getUserById);

// Super Admin & Admin management operations
router.post(
  '/invite',
  requireRole([ROLES.SUPER_ADMIN, ROLES.ADMIN]),
  validate({ body: InviteUserSchema }),
  userController.inviteUser,
);

router.patch(
  '/:id',
  requireRole([ROLES.SUPER_ADMIN, ROLES.ADMIN]),
  validate({ body: UpdateUserSchema }),
  userController.updateUser,
);

router.post(
  '/:id/status',
  requireRole([ROLES.SUPER_ADMIN, ROLES.ADMIN]),
  validate({ body: UpdateUserStatusSchema }),
  userController.updateUserStatus,
);

router.post(
  '/:id/force-logout',
  requireRole([ROLES.SUPER_ADMIN, ROLES.ADMIN]),
  userController.forceLogout,
);

// Super Admin only operations
router.patch(
  '/:id/role',
  requireRole(ROLES.SUPER_ADMIN),
  validate({ body: UpdateUserRoleSchema }),
  userController.updateUserRole,
);

router.delete(
  '/:id',
  requireRole(ROLES.SUPER_ADMIN),
  userController.deleteUser,
);

export { router as userRouter };
