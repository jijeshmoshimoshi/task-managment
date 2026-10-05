import { z } from 'zod';
import {
  TASK_STATUSES,
  TASK_PRIORITIES,
  TASK_TYPES,
} from '../types/task';
import { MongoIdSchema } from './common.schema';

export const CreateTaskSchema = z.object({
  projectId: MongoIdSchema.optional(), // Omitted for personal tasks
  title: z.string().min(1, 'Task title is required').max(250),
  descriptionHtml: z.string().max(50000).optional(),
  status: z.enum([
    TASK_STATUSES.BACKLOG,
    TASK_STATUSES.TODO,
    TASK_STATUSES.IN_PROGRESS,
    TASK_STATUSES.IN_REVIEW,
    TASK_STATUSES.BLOCKED,
    TASK_STATUSES.DONE,
  ]).default(TASK_STATUSES.TODO),
  priority: z.enum([
    TASK_PRIORITIES.LOW,
    TASK_PRIORITIES.MEDIUM,
    TASK_PRIORITIES.HIGH,
    TASK_PRIORITIES.URGENT,
  ]).default(TASK_PRIORITIES.MEDIUM),
  type: z.enum([
    TASK_TYPES.TASK,
    TASK_TYPES.BUG,
    TASK_TYPES.FEATURE,
    TASK_TYPES.CHORE,
  ]).default(TASK_TYPES.TASK),
  assigneeIds: z.array(MongoIdSchema).default([]),
  watcherIds: z.array(MongoIdSchema).default([]),
  parentTaskId: MongoIdSchema.optional(),
  blockedByTaskIds: z.array(MongoIdSchema).default([]),
  milestoneId: MongoIdSchema.optional(),
  startDate: z.string().datetime().optional(),
  dueDate: z.string().datetime().optional(),
  estimatedMinutes: z.number().int().nonnegative().optional(),
  labels: z.array(z.string().max(30)).default([]),
  isPersonal: z.boolean().default(false),
});

export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;

export const UpdateTaskSchema = CreateTaskSchema.partial().omit({ projectId: true });

export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;

export const CreateChecklistItemSchema = z.object({
  title: z.string().min(1).max(250),
});

export type CreateChecklistItemInput = z.infer<typeof CreateChecklistItemSchema>;

export const UpdateChecklistItemSchema = z.object({
  title: z.string().min(1).max(250).optional(),
  isCompleted: z.boolean().optional(),
});

export type UpdateChecklistItemInput = z.infer<typeof UpdateChecklistItemSchema>;

export const AddCommentSchema = z.object({
  content: z.string().min(1, 'Comment content cannot be empty').max(5000),
});

export type AddCommentInput = z.infer<typeof AddCommentSchema>;

export const ReorderTaskSchema = z.object({
  status: z.enum([
    TASK_STATUSES.BACKLOG,
    TASK_STATUSES.TODO,
    TASK_STATUSES.IN_PROGRESS,
    TASK_STATUSES.IN_REVIEW,
    TASK_STATUSES.BLOCKED,
    TASK_STATUSES.DONE,
  ]),
  orderIndex: z.number().int().nonnegative(),
});

export type ReorderTaskInput = z.infer<typeof ReorderTaskSchema>;

export const LogTimeSchema = z.object({
  durationSeconds: z.number().int().positive(),
  description: z.string().max(500).optional(),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime().optional(),
  isManual: z.boolean().default(true),
});

export type LogTimeInput = z.infer<typeof LogTimeSchema>;

export const ReviewTaskSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  reviewNote: z.string().max(1000).optional(),
});

export type ReviewTaskInput = z.infer<typeof ReviewTaskSchema>;

export const BulkTaskActionSchema = z.object({
  taskIds: z.array(MongoIdSchema).min(1),
  action: z.enum(['CHANGE_STATUS', 'ASSIGN', 'SET_PRIORITY', 'DELETE', 'MOVE_PROJECT']),
  status: z.enum([
    TASK_STATUSES.BACKLOG,
    TASK_STATUSES.TODO,
    TASK_STATUSES.IN_PROGRESS,
    TASK_STATUSES.IN_REVIEW,
    TASK_STATUSES.BLOCKED,
    TASK_STATUSES.DONE,
  ]).optional(),
  assigneeIds: z.array(MongoIdSchema).optional(),
  priority: z.enum([
    TASK_PRIORITIES.LOW,
    TASK_PRIORITIES.MEDIUM,
    TASK_PRIORITIES.HIGH,
    TASK_PRIORITIES.URGENT,
  ]).optional(),
  targetProjectId: MongoIdSchema.optional(),
});

export type BulkTaskActionInput = z.infer<typeof BulkTaskActionSchema>;

