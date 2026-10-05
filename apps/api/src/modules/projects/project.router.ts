import { Router } from 'express';
import { ProjectController } from './project.controller';
import { authMiddleware, requireRole } from '../../common/middlewares/auth.middleware';
import { validate } from '../../common/middlewares/validate.middleware';
import {
  CreateProjectSchema,
  UpdateProjectSchema,
  AddProjectMemberSchema,
  CreateMilestoneSchema,
  UpdateMilestoneSchema,
  DuplicateProjectSchema,
  ROLES,
} from '@taskmaster/shared';

const router: Router = Router();

// All project endpoints require authentication
router.use(authMiddleware);

// Project list & creation
router.get('/', ProjectController.getProjects);
router.post(
  '/',
  requireRole([ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.USER]),
  validate({ body: CreateProjectSchema }),
  ProjectController.createProject,
);

// Project detail, update & delete
router.get('/:id', ProjectController.getProjectById);
router.patch(
  '/:id',
  validate({ body: UpdateProjectSchema }),
  ProjectController.updateProject,
);
router.post('/:id/archive', ProjectController.toggleArchive);
router.delete('/:id', ProjectController.deleteProject);

// Duplicate
router.post(
  '/:id/duplicate',
  validate({ body: DuplicateProjectSchema }),
  ProjectController.duplicateProject,
);

// Members
router.post(
  '/:id/members',
  validate({ body: AddProjectMemberSchema }),
  ProjectController.addMember,
);
router.delete('/:id/members/:userId', ProjectController.removeMember);

// Milestones
router.post(
  '/:id/milestones',
  validate({ body: CreateMilestoneSchema }),
  ProjectController.addMilestone,
);
router.patch(
  '/:id/milestones/:milestoneId',
  validate({ body: UpdateMilestoneSchema }),
  ProjectController.updateMilestone,
);
router.delete('/:id/milestones/:milestoneId', ProjectController.deleteMilestone);

export { router as projectRouter };
