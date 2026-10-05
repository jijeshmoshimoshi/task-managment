import { z } from 'zod';

export const StrongPasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .max(128, 'Password cannot exceed 128 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

export const LoginSchema = z.object({
  email: z.string().email('Please enter a valid email address').toLowerCase().trim(),
  password: z.string().min(1, 'Password is required'),
  twoFactorCode: z.string().length(6, '2FA code must be 6 digits').optional(),
});

export type LoginInput = z.infer<typeof LoginSchema>;

export const AcceptInviteSchema = z.object({
  token: z.string().min(1, 'Invitation token is required'),
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  password: StrongPasswordSchema,
});

export type AcceptInviteInput = z.infer<typeof AcceptInviteSchema>;

export const RequestPasswordResetSchema = z.object({
  email: z.string().email('Please enter a valid email address').toLowerCase().trim(),
});

export type RequestPasswordResetInput = z.infer<typeof RequestPasswordResetSchema>;

export const ResetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: StrongPasswordSchema,
});

export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;

export const Enable2FASchema = z.object({
  secret: z.string().min(1, 'Secret is required'),
  code: z.string().length(6, '2FA code must be 6 digits'),
});

export type Enable2FAInput = z.infer<typeof Enable2FASchema>;

export const Verify2FASchema = z.object({
  code: z.string().length(6, '2FA code must be 6 digits'),
});

export type Verify2FAInput = z.infer<typeof Verify2FASchema>;
