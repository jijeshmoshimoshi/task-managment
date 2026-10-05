import { Router } from 'express';
import { TaskController } from './task.controller';
import { authMiddleware } from '../../common/middlewares/auth.middleware';
import { validate } from '../../common/middlewares/validate.middleware';
import {
  CreateTaskSchema,
  UpdateTaskSchema,
  ReorderTaskSchema,
  CreateChecklistItemSchema,
  UpdateChecklistItemSchema,
  AddCommentSchema,
  LogTimeSchema,
} from '@taskmaster/shared';

const router: Router = Router();

// All task endpoints require authentication
router.use(authMiddleware);

// Task CRUD
router.get('/', TaskController.getTasks);
router.post('/', validate({ body: CreateTaskSchema }), TaskController.createTask);
router.get('/:id', TaskController.getTaskById);
router.patch('/:id', validate({ body: UpdateTaskSchema }), TaskController.updateTask);
router.delete('/:id', TaskController.deleteTask);

// Task Request Approvals
router.patch('/:id/approve', TaskController.approveTask);
router.patch('/:id/reject', TaskController.rejectTask);
router.patch('/:id/resubmit', TaskController.resubmitTask);

// Kanban drag & drop reorder
router.patch('/:id/reorder', validate({ body: ReorderTaskSchema }), TaskController.reorderTask);

// Checklist items
router.post(
  '/:id/checklist',
  validate({ body: CreateChecklistItemSchema }),
  TaskController.addChecklistItem,
);
router.patch(
  '/:id/checklist/:itemId',
  validate({ body: UpdateChecklistItemSchema }),
  TaskController.updateChecklistItem,
);
router.delete('/:id/checklist/:itemId', TaskController.deleteChecklistItem);

// Comments
router.post('/:id/comments', validate({ body: AddCommentSchema }), TaskController.addComment);

// Time tracking
router.post('/:id/time-logs', validate({ body: LogTimeSchema }), TaskController.logTime);

export { router as taskRouter };
