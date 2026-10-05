import { Router } from 'express';
import { orgController } from './org.controller';
import { departmentController } from './department.controller';
import { teamController } from './team.controller';
import { authMiddleware, requireRole } from '../../common/middlewares/auth.middleware';
import { validate } from '../../common/middlewares/validate.middleware';
import {
  UpdateOrgBrandingSchema,
  UpdateSecurityPolicySchema,
  CreateDepartmentSchema,
  UpdateDepartmentSchema,
  CreateTeamSchema,
  UpdateTeamSchema,
  TeamMemberSchema,
  ROLES,
} from '@taskmaster/shared';

const router: Router = Router();

// Apply authMiddleware across all org routes
router.use(authMiddleware);

// --- Organization Branding & Security Policies ---
router.get('/current', orgController.getOrganization);
router.patch(
  '/current/branding',
  requireRole(ROLES.SUPER_ADMIN),
  validate({ body: UpdateOrgBrandingSchema }),
  orgController.updateBranding,
);
router.patch(
  '/current/security',
  requireRole(ROLES.SUPER_ADMIN),
  validate({ body: UpdateSecurityPolicySchema }),
  orgController.updateSecurityPolicy,
);

// --- Departments ---
export const departmentRouter: Router = Router();
departmentRouter.use(authMiddleware);

departmentRouter.get('/', departmentController.listDepartments);
departmentRouter.get('/:id', departmentController.getDepartmentById);
departmentRouter.post(
  '/',
  requireRole([ROLES.SUPER_ADMIN, ROLES.ADMIN]),
  validate({ body: CreateDepartmentSchema }),
  departmentController.createDepartment,
);
departmentRouter.patch(
  '/:id',
  requireRole([ROLES.SUPER_ADMIN, ROLES.ADMIN]),
  validate({ body: UpdateDepartmentSchema }),
  departmentController.updateDepartment,
);
departmentRouter.delete(
  '/:id',
  requireRole([ROLES.SUPER_ADMIN, ROLES.ADMIN]),
  departmentController.deleteDepartment,
);

// --- Teams ---
export const teamRouter: Router = Router();
teamRouter.use(authMiddleware);

teamRouter.get('/', teamController.listTeams);
teamRouter.get('/:id', teamController.getTeamById);
teamRouter.post(
  '/',
  requireRole([ROLES.SUPER_ADMIN, ROLES.ADMIN]),
  validate({ body: CreateTeamSchema }),
  teamController.createTeam,
);
teamRouter.patch(
  '/:id',
  requireRole([ROLES.SUPER_ADMIN, ROLES.ADMIN]),
  validate({ body: UpdateTeamSchema }),
  teamController.updateTeam,
);
teamRouter.delete(
  '/:id',
  requireRole([ROLES.SUPER_ADMIN, ROLES.ADMIN]),
  teamController.deleteTeam,
);
teamRouter.post(
  '/:id/members',
  requireRole([ROLES.SUPER_ADMIN, ROLES.ADMIN]),
  validate({ body: TeamMemberSchema }),
  teamController.addMember,
);
teamRouter.delete(
  '/:id/members/:userId',
  requireRole([ROLES.SUPER_ADMIN, ROLES.ADMIN]),
  teamController.removeMember,
);

export { router as orgRouter };
