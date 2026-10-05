import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';
import { UserModel } from '../../src/modules/users/user.model';
import { OrganizationModel } from '../../src/modules/orgs/org.model';
import { DepartmentModel } from '../../src/modules/orgs/department.model';
import { TeamModel } from '../../src/modules/orgs/team.model';
import { JwtService } from '../../src/modules/auth/services/jwt.service';
import { ROLES, USER_STATUSES } from '@taskmaster/shared';

import { SessionService } from '../../src/modules/auth/services/session.service';

describe('Phase 3: Organization, Users, Departments & Teams (Integration)', () => {
  const app = createApp();

  const mockOrgId = '65f000000000000000000001';
  const mockSuperAdminId = '65f000000000000000000002';
  const mockUserId = '65f000000000000000000003';

  const superAdminToken = JwtService.signAccessToken({
    userId: mockSuperAdminId,
    organizationId: mockOrgId,
    role: ROLES.SUPER_ADMIN,
    sessionId: 'sess_superadmin',
  });

  const userToken = JwtService.signAccessToken({
    userId: mockUserId,
    organizationId: mockOrgId,
    role: ROLES.USER,
    sessionId: 'sess_user',
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(SessionService, 'isSessionActive').mockResolvedValue(true);
    vi.spyOn(UserModel, 'findById').mockImplementation((id: any) => {
      const isSuper = id === mockSuperAdminId || id?.toString() === mockSuperAdminId;
      return {
        lean: () =>
          Promise.resolve({
            _id: isSuper ? mockSuperAdminId : mockUserId,
            organizationId: mockOrgId,
            email: isSuper ? 'superadmin@acme.com' : 'user@acme.com',
            firstName: isSuper ? 'System' : 'Regular',
            lastName: isSuper ? 'SuperAdmin' : 'User',
            role: isSuper ? ROLES.SUPER_ADMIN : ROLES.USER,
            status: USER_STATUSES.ACTIVE,
            isDeleted: false,
          }),
      } as any;
    });
  });

  describe('Organization & Security Policies', () => {
    it('GET /api/v1/orgs/current returns organization data and stats', async () => {
      vi.spyOn(OrganizationModel, 'findById').mockResolvedValue({
        _id: mockOrgId,
        name: 'Acme Corp',
        slug: 'acme-corp',
        branding: { primaryColor: '#3b82f6', accentColor: '#6366f1', companyName: 'Acme Corp' },
        securityPolicy: { passwordMinLength: 8 },
        toJSON: () => ({ id: mockOrgId, name: 'Acme Corp' }),
      } as any);

      vi.spyOn(UserModel, 'countDocuments').mockResolvedValue(12);
      vi.spyOn(DepartmentModel, 'countDocuments').mockResolvedValue(3);
      vi.spyOn(TeamModel, 'countDocuments').mockResolvedValue(4);

      const res = await request(app)
        .get('/api/v1/orgs/current')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.stats.totalUsers).toBe(12);
    });

    it('PATCH /api/v1/orgs/current/branding requires SUPER_ADMIN role (blocks USER with 403)', async () => {
      const res = await request(app)
        .patch('/api/v1/orgs/current/branding')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          companyName: 'Hacked Corp',
          primaryColor: '#ff0000',
          accentColor: '#00ff00',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('User Management RBAC', () => {
    it('GET /api/v1/users returns paginated list of organization users', async () => {
      vi.spyOn(UserModel, 'find').mockReturnValue({
        populate: () => ({
          populate: () => ({
            sort: () => ({
              skip: () => ({
                limit: () => ({
                  lean: () =>
                    Promise.resolve([
                      {
                        _id: mockSuperAdminId,
                        organizationId: mockOrgId,
                        email: 'admin@acme.com',
                        firstName: 'Super',
                        lastName: 'Admin',
                        role: ROLES.SUPER_ADMIN,
                        status: USER_STATUSES.ACTIVE,
                      },
                    ]),
                }),
              }),
            }),
          }),
        }),
      } as any);

      vi.spyOn(UserModel, 'countDocuments').mockResolvedValue(1);

      const res = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
    });

    it('POST /api/v1/users/invite rejects non-admins with 403', async () => {
      const res = await request(app)
        .post('/api/v1/users/invite')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          email: 'newuser@acme.com',
          firstName: 'New',
          lastName: 'User',
          role: ROLES.USER,
        });

      expect(res.status).toBe(403);
    });
  });
});
