import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';
import { UserModel } from '../../src/modules/users/user.model';
import { ProjectModel } from '../../src/modules/projects/project.model';
import { TaskModel } from '../../src/modules/tasks/task.model';
import { AuditLogModel } from '../../src/modules/audit/audit.model';
import { JwtService } from '../../src/modules/auth/services/jwt.service';
import { SessionService } from '../../src/modules/auth/services/session.service';
import { ROLES, USER_STATUSES, TASK_STATUSES } from '@taskmaster/shared';

describe('Phase 6: Analytics & Audit Logs (Integration)', () => {
  const app = createApp();

  const mockOrgId = '65f000000000000000000001';
  const mockAdminId = '65f000000000000000000002';

  const adminToken = JwtService.signAccessToken({
    userId: mockAdminId,
    organizationId: mockOrgId,
    role: ROLES.SUPER_ADMIN,
    sessionId: 'sess_admin',
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(SessionService, 'isSessionActive').mockResolvedValue(true);
    vi.spyOn(UserModel, 'findById').mockImplementation(() => {
      return {
        lean: () =>
          Promise.resolve({
            _id: mockAdminId,
            organizationId: mockOrgId,
            email: 'superadmin@acme.com',
            firstName: 'System',
            lastName: 'SuperAdmin',
            role: ROLES.SUPER_ADMIN,
            status: USER_STATUSES.ACTIVE,
            isDeleted: false,
          }),
      } as any;
    });
  });

  describe('Analytics Overview KPI Aggregations', () => {
    it('GET /api/v1/analytics/overview returns aggregated metrics and velocity charts', async () => {
      vi.spyOn(ProjectModel, 'countDocuments').mockResolvedValue(3);
      vi.spyOn(TaskModel, 'countDocuments').mockImplementation((query: any) => {
        if (query?.status === TASK_STATUSES.DONE) return Promise.resolve(5) as any;
        if (query?.status === TASK_STATUSES.IN_PROGRESS) return Promise.resolve(2) as any;
        return Promise.resolve(10) as any;
      });
      vi.spyOn(UserModel, 'countDocuments').mockResolvedValue(8);
      vi.spyOn(ProjectModel, 'find').mockReturnValue({
        sort: () => ({
          limit: () => ({
            lean: () => Promise.resolve([]),
          }),
        }),
      } as any);
      vi.spyOn(TaskModel, 'find').mockReturnValue({
        select: () => ({
          populate: () => ({
            lean: () => Promise.resolve([]),
          }),
        }),
      } as any);
      vi.spyOn(AuditLogModel, 'find').mockReturnValue({
        sort: () => ({
          limit: () => ({
            lean: () => Promise.resolve([]),
          }),
        }),
      } as any);

      const res = await request(app)
        .get('/api/v1/analytics/overview')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.kpis).toBeDefined();
      expect(res.body.data.kpis.totalProjects).toBe(3);
      expect(res.body.data.kpis.totalTasks).toBe(10);
      expect(res.body.data.kpis.completionRate).toBe(50);
      expect(Array.isArray(res.body.data.velocityTrend)).toBe(true);
    });
  });

  describe('Audit Logs Export CSV', () => {
    it('GET /api/v1/audit-logs/export returns CSV formatted audit logs', async () => {
      vi.spyOn(AuditLogModel, 'find').mockReturnValue({
        sort: () => ({
          skip: () => ({
            limit: () => ({
              lean: () =>
                Promise.resolve([
                  {
                    _id: '65f000000000000000000099',
                    organizationId: mockOrgId,
                    actorId: mockAdminId,
                    actorEmail: 'admin@acme.com',
                    actorName: 'Alice Vance',
                    action: 'auth.login',
                    resourceType: 'auth',
                    ipAddress: '127.0.0.1',
                    userAgent: 'Chrome',
                    createdAt: new Date(),
                  },
                ]),
            }),
          }),
        }),
      } as any);
      vi.spyOn(AuditLogModel, 'countDocuments').mockResolvedValue(1);

      const res = await request(app)
        .get('/api/v1/audit-logs/export')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.text).toContain('Timestamp,Actor Name,Actor Email');
      expect(res.text).toContain('admin@acme.com');
    });
  });
});
