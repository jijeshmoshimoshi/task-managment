import { z } from 'zod';
import { ROLES } from '../constants/permissions';
import { USER_STATUSES } from '../types/user';
import { MongoIdSchema } from './common.schema';

export const InviteUserSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  role: z.enum([ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.USER]),
  departmentId: MongoIdSchema.optional(),
  teamIds: z.array(MongoIdSchema).optional(),
});

export type InviteUserInput = z.infer<typeof InviteUserSchema>;

export const UpdateUserSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  jobTitle: z.string().max(100).optional(),
  phone: z.string().max(20).optional(),
  timezone: z.string().max(50).optional(),
  avatarUrl: z.string().url().optional().or(z.literal('')),
  departmentId: MongoIdSchema.nullable().optional(),
  teamIds: z.array(MongoIdSchema).optional(),
});

export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;

export const UpdateUserRoleSchema = z.object({
  role: z.enum([ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.USER]),
});

export type UpdateUserRoleInput = z.infer<typeof UpdateUserRoleSchema>;

export const UpdateUserStatusSchema = z.object({
  status: z.enum([
    USER_STATUSES.ACTIVE,
    USER_STATUSES.SUSPENDED,
    USER_STATUSES.DEACTIVATED,
  ]),
});

export type UpdateUserStatusInput = z.infer<typeof UpdateUserStatusSchema>;
