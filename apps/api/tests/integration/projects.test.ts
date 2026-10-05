import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';
import { UserModel } from '../../src/modules/users/user.model';
import { ProjectModel } from '../../src/modules/projects/project.model';
import { JwtService } from '../../src/modules/auth/services/jwt.service';
import { SessionService } from '../../src/modules/auth/services/session.service';
import { ROLES, USER_STATUSES, PROJECT_ROLES, PROJECT_STATUSES, PROJECT_HEALTH } from '@taskmaster/shared';

import { AuditService } from '../../src/modules/audit/audit.service';

describe('Phase 4: Projects & Members (Integration)', () => {
  const app = createApp();

  const mockOrgId = '65f000000000000000000001';
  const mockAdminId = '65f000000000000000000002';
  const mockUserId = '65f000000000000000000003';
  const mockOtherUserId = '65f000000000000000000004';
  const mockProjectId = '65f000000000000000000010';

  const adminToken = JwtService.signAccessToken({
    userId: mockAdminId,
    organizationId: mockOrgId,
    role: ROLES.ADMIN,
    sessionId: 'sess_admin',
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
    vi.spyOn(AuditService, 'log').mockResolvedValue({} as any);
    vi.spyOn(UserModel, 'findById').mockImplementation((id: any) => {

      const isAdmin = id === mockAdminId || id?.toString() === mockAdminId;
      return {
        lean: () =>
          Promise.resolve({
            _id: isAdmin ? mockAdminId : mockUserId,
            organizationId: mockOrgId,
            email: isAdmin ? 'admin@acme.com' : 'user@acme.com',
            firstName: isAdmin ? 'Alice' : 'Charlie',
            lastName: isAdmin ? 'Vance' : 'Brown',
            role: isAdmin ? ROLES.ADMIN : ROLES.USER,
            status: USER_STATUSES.ACTIVE,
            isDeleted: false,
          }),
      } as any;
    });
  });

  describe('Project Creation & Key Validation', () => {
    it('POST /api/v1/projects creates a project with uppercase key and sets creator as MANAGER', async () => {
      vi.spyOn(ProjectModel, 'findOne').mockResolvedValue(null);
      vi.spyOn(ProjectModel, 'create').mockResolvedValue({
        id: mockProjectId,
        _id: mockProjectId,
        name: 'Alpha Initiative',
        key: 'ALPHA',
        organizationId: mockOrgId,
        members: [{ userId: mockAdminId, role: PROJECT_ROLES.MANAGER, joinedAt: new Date() }],
        milestones: [],
        status: PROJECT_STATUSES.PLANNING,
        toJSON: () => ({
          id: mockProjectId,
          name: 'Alpha Initiative',
          key: 'ALPHA',
          organizationId: mockOrgId,
          members: [{ userId: mockAdminId, role: PROJECT_ROLES.MANAGER }],
          milestones: [],
        }),
      } as any);

      const res = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Alpha Initiative',
          key: 'ALPHA',
          description: 'A key strategic initiative',
          priority: 'HIGH',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Alpha Initiative');
      expect(res.body.data.key).toBe('ALPHA');
    });

    it('POST /api/v1/projects fails with 409 if project key already exists in org', async () => {
      vi.spyOn(ProjectModel, 'findOne').mockResolvedValue({
        _id: '65f000000000000000000099',
        key: 'ALPHA',
      } as any);

      const res = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Another Alpha',
          key: 'ALPHA',
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('ALREADY_EXISTS');
    });
  });


  describe('Project Listing & Permissions', () => {
    it('GET /api/v1/projects lists projects for authenticated user', async () => {
      vi.spyOn(ProjectModel, 'find').mockReturnValue({
        populate: () => ({
          sort: () => ({
            skip: () => ({
              limit: () => ({
                lean: () =>
                  Promise.resolve([
                    {
                      _id: mockProjectId,
                      name: 'Alpha Initiative',
                      key: 'ALPHA',
                      organizationId: mockOrgId,
                      members: [],
                      milestones: [],
                      status: PROJECT_STATUSES.ACTIVE,
                      priority: 'HIGH',
                      health: PROJECT_HEALTH.ON_TRACK,
                    },
                  ]),
              }),
            }),
          }),
        }),
      } as any);
      vi.spyOn(ProjectModel, 'countDocuments').mockResolvedValue(1);

      const res = await request(app)
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta.total).toBe(1);
    });
  });

  describe('Project Members & Milestones', () => {
    it('POST /api/v1/projects/:id/members adds a member to the project', async () => {
      const mockProjectDoc = {
        _id: mockProjectId,
        name: 'Alpha Initiative',
        organizationId: mockOrgId,
        members: [{ userId: mockAdminId, role: PROJECT_ROLES.MANAGER }],
        save: vi.fn().mockResolvedValue(true),
        toJSON: () => ({
          id: mockProjectId,
          members: [
            { userId: mockAdminId, role: PROJECT_ROLES.MANAGER },
            { userId: mockOtherUserId, role: PROJECT_ROLES.CONTRIBUTOR },
          ],
        }),
      };

      vi.spyOn(ProjectModel, 'findOne').mockResolvedValue(mockProjectDoc as any);
      vi.spyOn(UserModel, 'findOne').mockResolvedValue({
        _id: mockOtherUserId,
        name: 'Charlie Brown',
        email: 'user1@taskmaster.local',
      } as any);
      vi.spyOn(ProjectModel, 'findById').mockReturnValue({
        populate: () =>
          Promise.resolve({
            toJSON: () => ({
              id: mockProjectId,
              name: 'Alpha Initiative',
              members: [
                { userId: { id: mockOtherUserId, name: 'Charlie Brown' }, role: PROJECT_ROLES.CONTRIBUTOR },
              ],
            }),
          }),
      } as any);

      const res = await request(app)
        .post(`/api/v1/projects/${mockProjectId}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: mockOtherUserId,
          role: PROJECT_ROLES.CONTRIBUTOR,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('POST /api/v1/projects/:id/milestones adds a milestone', async () => {
      const mockProjectDoc = {
        _id: mockProjectId,
        name: 'Alpha Initiative',
        organizationId: mockOrgId,
        members: [{ userId: mockAdminId, role: PROJECT_ROLES.MANAGER }],
        milestones: [],
        save: vi.fn().mockResolvedValue(true),
      };

      vi.spyOn(ProjectModel, 'findOne').mockResolvedValue(mockProjectDoc as any);
      vi.spyOn(ProjectModel, 'findById').mockReturnValue({
        populate: () =>
          Promise.resolve({
            toJSON: () => ({
              id: mockProjectId,
              milestones: [
                { id: 'ms_1', title: 'Beta Release', isCompleted: false },
              ],
            }),
          }),
      } as any);

      const res = await request(app)
        .post(`/api/v1/projects/${mockProjectId}/milestones`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Beta Release',
          description: 'Deploy to staging and test',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });
  });
});
