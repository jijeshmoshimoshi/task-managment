import { z } from 'zod';
import { PROJECT_ROLES } from '../constants/permissions';
import { PROJECT_STATUSES, PROJECT_PRIORITIES } from '../types/project';
import { MongoIdSchema } from './common.schema';

export const CreateProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(100),
  key: z
    .string()
    .min(2, 'Project key must be at least 2 characters')
    .max(10, 'Project key cannot exceed 10 characters')
    .regex(/^[A-Z0-9]+$/, 'Project key must be uppercase alphanumeric'),
  description: z.string().max(2000).optional(),
  client: z.string().max(100).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  status: z.enum([
    PROJECT_STATUSES.PLANNING,
    PROJECT_STATUSES.ACTIVE,
    PROJECT_STATUSES.ON_HOLD,
    PROJECT_STATUSES.COMPLETED,
    PROJECT_STATUSES.ARCHIVED,
  ]).default(PROJECT_STATUSES.PLANNING),
  priority: z.enum([
    PROJECT_PRIORITIES.LOW,
    PROJECT_PRIORITIES.MEDIUM,
    PROJECT_PRIORITIES.HIGH,
    PROJECT_PRIORITIES.URGENT,
  ]).default(PROJECT_PRIORITIES.MEDIUM),
  budget: z.number().nonnegative().optional(),
  tags: z.array(z.string().max(30)).default([]),
  coverColor: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/).optional(),
  icon: z.string().max(30).optional(),
});

export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;

export const UpdateProjectSchema = CreateProjectSchema.partial().omit({ key: true });

export type UpdateProjectInput = z.infer<typeof UpdateProjectSchema>;

export const AddProjectMemberSchema = z.object({
  userId: MongoIdSchema,
  role: z.enum([
    PROJECT_ROLES.MANAGER,
    PROJECT_ROLES.CONTRIBUTOR,
    PROJECT_ROLES.VIEWER,
  ]),
});

export type AddProjectMemberInput = z.infer<typeof AddProjectMemberSchema>;

export const CreateMilestoneSchema = z.object({
  title: z.string().min(1, 'Milestone title is required').max(100),
  description: z.string().max(1000).optional(),
  dueDate: z.string().datetime().optional(),
});

export type CreateMilestoneInput = z.infer<typeof CreateMilestoneSchema>;

export const UpdateMilestoneSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  description: z.string().max(1000).optional(),
  dueDate: z.string().datetime().optional().nullable(),
  isCompleted: z.boolean().optional(),
});

export type UpdateMilestoneInput = z.infer<typeof UpdateMilestoneSchema>;

export const DuplicateProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(100),
  key: z
    .string()
    .min(2, 'Project key must be at least 2 characters')
    .max(10, 'Project key cannot exceed 10 characters')
    .regex(/^[A-Z0-9]+$/, 'Project key must be uppercase alphanumeric'),
  copyMembers: z.boolean().default(true),
  copyMilestones: z.boolean().default(true),
});

export type DuplicateProjectInput = z.infer<typeof DuplicateProjectSchema>;

