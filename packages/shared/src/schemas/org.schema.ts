import { z } from 'zod';
import { MongoIdSchema } from './common.schema';

export const UpdateOrgBrandingSchema = z.object({
  companyName: z.string().min(1).max(100),
  logoUrl: z.string().url().optional().or(z.literal('')),
  primaryColor: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Invalid hex color'),
  accentColor: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Invalid hex color'),
  supportEmail: z.string().email().optional().or(z.literal('')),
});

export type UpdateOrgBrandingInput = z.infer<typeof UpdateOrgBrandingSchema>;

export const UpdateSecurityPolicySchema = z.object({
  passwordMinLength: z.number().int().min(8).max(32),
  passwordRequireNumbers: z.boolean(),
  passwordRequireSymbols: z.boolean(),
  passwordRequireUppercase: z.boolean(),
  enforce2FARoles: z.array(z.string()),
  sessionMaxLifetimeMinutes: z.number().int().min(15).max(43200),
  ipAllowList: z.array(z.string()),
  maxFailedLoginAttempts: z.number().int().min(3).max(10),
  lockoutDurationMinutes: z.number().int().min(5).max(1440),
});

export type UpdateSecurityPolicyInput = z.infer<typeof UpdateSecurityPolicySchema>;

export const CreateDepartmentSchema = z.object({
  name: z.string().min(1, 'Department name is required').max(100),
  description: z.string().max(500).optional().or(z.literal('')),
  leadId: MongoIdSchema.optional().nullable(),
});

export type CreateDepartmentInput = z.infer<typeof CreateDepartmentSchema>;

export const UpdateDepartmentSchema = CreateDepartmentSchema.partial();
export type UpdateDepartmentInput = z.infer<typeof UpdateDepartmentSchema>;

export const CreateTeamSchema = z.object({
  name: z.string().min(1, 'Team name is required').max(100),
  description: z.string().max(500).optional().or(z.literal('')),
  departmentId: MongoIdSchema.optional().nullable(),
  leadId: MongoIdSchema.optional().nullable(),
  memberIds: z.array(MongoIdSchema).default([]),
});

export type CreateTeamInput = z.infer<typeof CreateTeamSchema>;

export const UpdateTeamSchema = CreateTeamSchema.partial();
export type UpdateTeamInput = z.infer<typeof UpdateTeamSchema>;

export const TeamMemberSchema = z.object({
  userId: MongoIdSchema,
});
export type TeamMemberInput = z.infer<typeof TeamMemberSchema>;
