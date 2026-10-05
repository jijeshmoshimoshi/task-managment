import { Permission, PERMISSIONS, Role, ROLES, ROLE_PERMISSIONS, ProjectRole } from '../constants/permissions';
import { IUser } from '../types/user';

export type PolicyResource =
  | 'organization'
  | 'user'
  | 'department'
  | 'team'
  | 'project'
  | 'task'
  | 'personal_task'
  | 'comment'
  | 'attachment'
  | 'audit'
  | 'analytics';

export interface PolicyContext {
  targetUser?: Partial<IUser>;
  targetProject?: {
    id: string;
    organizationId: string;
    members?: Array<{ userId: string; role: ProjectRole }>;
  };
  targetTask?: {
    id: string;
    organizationId: string;
    projectId?: string;
    assigneeIds?: string[];
    reporterId?: string;
    createdBy?: string;
    isPersonal?: boolean;
  };
  targetComment?: {
    authorId: string;
  };
  projectRole?: ProjectRole;
}

/**
 * Checks if a user has a specific permission in their base role.
 */
export function hasBasePermission(role: Role, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) return false;
  return permissions.includes(permission);
}

/**
 * Central Policy Engine: Evaluates if a given user can perform an action on a resource given the context.
 * Enforces multi-tenancy, hierarchy, and context-specific rules.
 */
export function can(
  user: {
    id: string;
    organizationId: string;
    role: Role;
    status: string;
  },
  permission: Permission,
  resource: PolicyResource,
  context?: PolicyContext,
): boolean {
  // 1. Inactive or suspended users cannot perform any actions
  if (user.status !== 'ACTIVE') {
    return false;
  }

  // 2. Multi-tenancy check: If target resource has an organizationId, it must match user's organizationId
  if (context?.targetProject && context.targetProject.organizationId !== user.organizationId) {
    return false;
  }
  if (context?.targetTask && context.targetTask.organizationId !== user.organizationId) {
    return false;
  }

  // 3. Super Admin Hierarchy & Safeguards
  if (user.role === ROLES.SUPER_ADMIN) {
    // Super admin cannot delete self or modify other super admins if safety rule applies
    if (permission === PERMISSIONS.USER_DELETE && context?.targetUser?.role === ROLES.SUPER_ADMIN) {
      // Super admin deletion protection
      return false;
    }
    return true;
  }

  // 4. Base Role Permission Check
  if (!hasBasePermission(user.role, permission)) {
    return false;
  }

  // 5. Context-specific rules for ADMIN
  if (user.role === ROLES.ADMIN) {
    // Admin cannot modify, suspend, delete, or reset credentials of SUPER_ADMIN or other ADMINs
    if (
      (permission === PERMISSIONS.USER_DELETE ||
        permission === PERMISSIONS.USER_SUSPEND ||
        permission === PERMISSIONS.USER_UPDATE ||
        permission === PERMISSIONS.USER_RESET_CREDENTIALS ||
        permission === PERMISSIONS.USER_ASSIGN_ROLES) &&
      context?.targetUser
    ) {
      if (context.targetUser.role === ROLES.SUPER_ADMIN || context.targetUser.role === ROLES.ADMIN) {
        return false;
      }
    }
    return true;
  }

  // 6. Context-specific rules for regular USER (Employee)
  if (user.role === ROLES.USER) {
    // Personal task ownership
    if (resource === 'personal_task' || context?.targetTask?.isPersonal) {
      if (context?.targetTask?.createdBy && context.targetTask.createdBy !== user.id) {
        return false;
      }
      return true;
    }

    // Task updates: user can only update tasks assigned to them or created by them
    if (permission === PERMISSIONS.TASK_UPDATE_ASSIGNED || permission === PERMISSIONS.TASK_LOG_TIME) {
      if (!context?.targetTask) return true;
      const isAssignee = context.targetTask.assigneeIds?.includes(user.id);
      const isReporter = context.targetTask.reporterId === user.id;
      const isCreator = context.targetTask.createdBy === user.id;
      return isAssignee || isReporter || isCreator;
    }

    // Task view: must belong to the user's project or be personal
    if (permission === PERMISSIONS.TASK_VIEW && context?.targetProject) {
      const isMember = context.targetProject.members?.some((m) => m.userId === user.id);
      return Boolean(isMember);
    }

    // Comments: editing/deleting comments only allowed for the author
    if (resource === 'comment' && context?.targetComment) {
      return context.targetComment.authorId === user.id;
    }

    return true;
  }

  return false;
}
