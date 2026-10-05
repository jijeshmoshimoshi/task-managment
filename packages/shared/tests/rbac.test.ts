import { describe, it, expect } from 'vitest';
import { can, hasBasePermission } from '../src/policy/rbac';
import { PERMISSIONS, ROLES } from '../src/constants/permissions';

describe('RBAC Central Policy Layer', () => {
  const superAdmin = {
    id: 'user_super_1',
    organizationId: 'org_1',
    role: ROLES.SUPER_ADMIN,
    status: 'ACTIVE',
  };

  const admin = {
    id: 'user_admin_1',
    organizationId: 'org_1',
    role: ROLES.ADMIN,
    status: 'ACTIVE',
  };

  const regularUser = {
    id: 'user_regular_1',
    organizationId: 'org_1',
    role: ROLES.USER,
    status: 'ACTIVE',
  };

  const suspendedUser = {
    id: 'user_suspended_1',
    organizationId: 'org_1',
    role: ROLES.USER,
    status: 'SUSPENDED',
  };

  describe('Status Checks', () => {
    it('denies all actions for suspended users', () => {
      expect(can(suspendedUser, PERMISSIONS.TASK_VIEW, 'task')).toBe(false);
      expect(can(suspendedUser, PERMISSIONS.ORG_VIEW, 'organization')).toBe(false);
    });
  });

  describe('Multi-Tenancy Isolation', () => {
    it('denies access to resources from a different organization', () => {
      expect(
        can(superAdmin, PERMISSIONS.PROJECT_VIEW_ALL, 'project', {
          targetProject: { id: 'p1', organizationId: 'org_2' },
        }),
      ).toBe(false);

      expect(
        can(admin, PERMISSIONS.TASK_VIEW, 'task', {
          targetTask: { id: 't1', organizationId: 'org_2' },
        }),
      ).toBe(false);
    });
  });

  describe('Super Admin Privileges & Safeguards', () => {
    it('allows super admin to manage organization settings and policies', () => {
      expect(can(superAdmin, PERMISSIONS.ORG_MANAGE, 'organization')).toBe(true);
      expect(can(superAdmin, PERMISSIONS.ORG_SECURITY_POLICIES, 'organization')).toBe(true);
      expect(can(superAdmin, PERMISSIONS.ORG_SYSTEM_HEALTH, 'organization')).toBe(true);
    });

    it('prevents deletion of super admins to protect organization ownership', () => {
      expect(
        can(superAdmin, PERMISSIONS.USER_DELETE, 'user', {
          targetUser: { role: ROLES.SUPER_ADMIN },
        }),
      ).toBe(false);
    });
  });

  describe('Admin Role Controls & Hierarchy Limits', () => {
    it('allows admin to manage projects and assign tasks', () => {
      expect(can(admin, PERMISSIONS.PROJECT_CREATE, 'project')).toBe(true);
      expect(can(admin, PERMISSIONS.TASK_ASSIGN, 'task')).toBe(true);
      expect(can(admin, PERMISSIONS.TASK_APPROVE, 'task')).toBe(true);
    });

    it('prevents admin from modifying or deleting super admin or other admins', () => {
      expect(
        can(admin, PERMISSIONS.USER_DELETE, 'user', {
          targetUser: { role: ROLES.SUPER_ADMIN },
        }),
      ).toBe(false);

      expect(
        can(admin, PERMISSIONS.USER_SUSPEND, 'user', {
          targetUser: { role: ROLES.ADMIN },
        }),
      ).toBe(false);

      expect(
        can(admin, PERMISSIONS.USER_RESET_CREDENTIALS, 'user', {
          targetUser: { role: ROLES.SUPER_ADMIN },
        }),
      ).toBe(false);
    });

    it('allows admin to manage regular users', () => {
      expect(
        can(admin, PERMISSIONS.USER_SUSPEND, 'user', {
          targetUser: { role: ROLES.USER },
        }),
      ).toBe(true);
    });
  });

  describe('Employee / Regular User Permissions', () => {
    it('denies regular user from creating projects or deleting tasks of others', () => {
      expect(can(regularUser, PERMISSIONS.PROJECT_CREATE, 'project')).toBe(false);
      expect(can(regularUser, PERMISSIONS.TASK_DELETE, 'task')).toBe(false);
      expect(can(regularUser, PERMISSIONS.TASK_APPROVE, 'task')).toBe(false);
    });

    it('allows user to update tasks assigned to them', () => {
      expect(
        can(regularUser, PERMISSIONS.TASK_UPDATE_ASSIGNED, 'task', {
          targetTask: {
            id: 'task_1',
            organizationId: 'org_1',
            assigneeIds: ['user_regular_1'],
          },
        }),
      ).toBe(true);
    });

    it('denies user from updating tasks assigned to others', () => {
      expect(
        can(regularUser, PERMISSIONS.TASK_UPDATE_ASSIGNED, 'task', {
          targetTask: {
            id: 'task_1',
            organizationId: 'org_1',
            assigneeIds: ['user_other'],
          },
        }),
      ).toBe(false);
    });

    it('allows personal task management for task owner', () => {
      expect(
        can(regularUser, PERMISSIONS.PERSONAL_TASK_MANAGE, 'personal_task', {
          targetTask: {
            id: 'pt_1',
            organizationId: 'org_1',
            createdBy: 'user_regular_1',
            isPersonal: true,
          },
        }),
      ).toBe(true);
    });
  });
});
