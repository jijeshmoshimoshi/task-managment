import { Router } from 'express';
import { meetingController } from './meeting.controller';
import { authMiddleware, requireRole } from '../../common/middlewares/auth.middleware';
import { validate } from '../../common/middlewares/validate.middleware';
import { CreateMeetingSchema, UpdateMeetingStatusSchema, ROLES } from '@taskmaster/shared';

const router: Router = Router();

router.use(authMiddleware);

// GET all meetings accessible to user
router.get('/', meetingController.getMeetings);
router.get('/:id', meetingController.getMeetingById);

// POST create meeting - Restrict to Admin & Super Admin only!
router.post(
  '/',
  requireRole([ROLES.SUPER_ADMIN, ROLES.ADMIN]),
  validate({ body: CreateMeetingSchema }),
  meetingController.createMeeting,
);

// Update status (e.g. COMPLETED or CANCELLED)
router.patch(
  '/:id/status',
  validate({ body: UpdateMeetingStatusSchema }),
  meetingController.updateMeetingStatus,
);

// Delete meeting - Restrict to Admin & Super Admin
router.delete(
  '/:id',
  requireRole([ROLES.SUPER_ADMIN, ROLES.ADMIN]),
  meetingController.deleteMeeting,
);

export { router as meetingRouter };
