export const AUDIT_ACTIONS = {
  // Auth
  LOGIN: 'auth.login',
  LOGOUT: 'auth.logout',
  PASSWORD_RESET_REQUESTED: 'auth.password_reset_requested',
  PASSWORD_RESET_COMPLETED: 'auth.password_reset_completed',
  TWO_FACTOR_ENABLED: 'auth.two_factor_enabled',
  TWO_FACTOR_DISABLED: 'auth.two_factor_disabled',
  SESSION_REVOKED: 'auth.session_revoked',

  // Org & Settings
  ORGANIZATION_UPDATED: 'org.updated',
  ORG_SETTINGS_UPDATED: 'org.settings_updated',
  SECURITY_POLICY_UPDATED: 'org.security_policy_updated',

  // Departments & Teams
  DEPARTMENT_CREATED: 'department.created',
  DEPARTMENT_UPDATED: 'department.updated',
  DEPARTMENT_DELETED: 'department.deleted',
  TEAM_CREATED: 'team.created',
  TEAM_UPDATED: 'team.updated',
  TEAM_DELETED: 'team.deleted',

  // Users
  USER_INVITED: 'user.invited',
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_SUSPENDED: 'user.suspended',
  USER_ACTIVATED: 'user.activated',
  USER_DELETED: 'user.deleted',
  USER_ROLE_CHANGED: 'user.role_changed',
  ROLE_CHANGED: 'user.role_changed',
  FORCE_LOGOUT: 'auth.force_logout',

  // Projects
  PROJECT_CREATED: 'project.created',
  PROJECT_UPDATED: 'project.updated',
  PROJECT_ARCHIVED: 'project.archived',
  PROJECT_DELETED: 'project.deleted',
  PROJECT_MEMBER_ADDED: 'project.member_added',
  PROJECT_MEMBER_REMOVED: 'project.member_removed',

  // Tasks
  TASK_CREATED: 'task.created',
  TASK_UPDATED: 'task.updated',
  TASK_STATUS_CHANGED: 'task.status_changed',
  TASK_ASSIGNED: 'task.assigned',
  TASK_DELETED: 'task.deleted',
  TASK_APPROVED: 'task.approved',
  TASK_REJECTED: 'task.rejected',
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

export interface IAuditLog {
  id: string;
  organizationId: string;
  actorId: string;
  actorEmail: string;
  actorName: string;
  action: AuditAction;
  resourceType: string;
  resourceId?: string;
  resourceTitle?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
}
