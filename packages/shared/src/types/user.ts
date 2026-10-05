import { Role } from '../constants/permissions';

export const USER_STATUSES = {
  INVITED: 'INVITED',
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  DEACTIVATED: 'DEACTIVATED',
} as const;

export type UserStatus = (typeof USER_STATUSES)[keyof typeof USER_STATUSES];

export interface IUser {
  id: string;
  organizationId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  status: UserStatus;
  avatarUrl?: string;
  jobTitle?: string;
  phone?: string;
  timezone: string;
  isTwoFactorEnabled: boolean;
  departmentId?: string;
  teamIds: string[];
  lastLoginAt?: string;
  lastActiveAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IUserSession {
  id: string;
  userId: string;
  organizationId: string;
  userAgent: string;
  ipAddress: string;
  createdAt: string;
  expiresAt: string;
  isCurrent?: boolean;
}
