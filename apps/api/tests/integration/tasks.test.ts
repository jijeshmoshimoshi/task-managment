import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';
import { UserModel } from '../../src/modules/users/user.model';
import { ProjectModel } from '../../src/modules/projects/project.model';
import { TaskModel } from '../../src/modules/tasks/task.model';
import { JwtService } from '../../src/modules/auth/services/jwt.service';
import { SessionService } from '../../src/modules/auth/services/session.service';
import { AuditService } from '../../src/modules/audit/audit.service';
import { ROLES, USER_STATUSES, TASK_STATUSES, TASK_PRIORITIES } from '@taskmaster/shared';

describe('Phase 5: Tasks & Kanban System (Integration)', () => {
  const app = createApp();

  const mockOrgId = '65f000000000000000000001';
  const mockAdminId = '65f000000000000000000002';
  const mockUserId = '65f000000000000000000003';
  const mockProjectId = '65f000000000000000000010';
  const mockTaskId = '65f000000000000000000020';

  const adminToken = JwtService.signAccessToken({
    userId: mockAdminId,
    organizationId: mockOrgId,
    role: ROLES.ADMIN,
    sessionId: 'sess_admin',
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(SessionService, 'isSessionActive').mockResolvedValue(true);
    vi.spyOn(AuditService, 'log').mockResolvedValue({} as any);
    vi.spyOn(UserModel, 'findById').mockImplementation((id: any) => {
      return {
        lean: () =>
          Promise.resolve({
            _id: mockAdminId,
            organizationId: mockOrgId,
            email: 'admin@acme.com',
            firstName: 'Alice',
            lastName: 'Vance',
            role: ROLES.ADMIN,
            status: USER_STATUSES.ACTIVE,
            isDeleted: false,
          }),
      } as any;
    });
  });

  describe('Task Creation & Sequential Key Numbering', () => {
    it('POST /api/v1/tasks creates a project task with sequential key (e.g. PLAT-1)', async () => {
      vi.spyOn(ProjectModel, 'findOne').mockResolvedValue({
        _id: mockProjectId,
        name: 'Platform v2',
        key: 'PLAT',
        organizationId: mockOrgId,
      } as any);

      vi.spyOn(TaskModel, 'findOne').mockReturnValue({
        sort: () => ({
          select: () => ({
            lean: () => Promise.resolve({ taskNumber: 0 }),
          }),
        }),
      } as any);

      vi.spyOn(TaskModel, 'countDocuments').mockResolvedValue(0);

      vi.spyOn(TaskModel, 'create').mockResolvedValue({
        id: mockTaskId,
        _id: mockTaskId,
        taskKey: 'PLAT-1',
        taskNumber: 1,
        title: 'Design distributed auth subsystem',
        status: TASK_STATUSES.TODO,
        priority: TASK_PRIORITIES.HIGH,
      } as any);

      vi.spyOn(TaskModel, 'findById').mockReturnValue({
        populate: () => ({
          populate: () =>
            Promise.resolve({
              toJSON: () => ({
                id: mockTaskId,
                taskKey: 'PLAT-1',
                taskNumber: 1,
                title: 'Design distributed auth subsystem',
                status: TASK_STATUSES.TODO,
                priority: TASK_PRIORITIES.HIGH,
              }),
            }),
        }),
      } as any);

      const res = await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          projectId: mockProjectId,
          title: 'Design distributed auth subsystem',
          status: TASK_STATUSES.TODO,
          priority: TASK_PRIORITIES.HIGH,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.taskKey).toBe('PLAT-1');
    });
  });

  describe('Kanban Drag-and-Drop Reorder', () => {
    it('PATCH /api/v1/tasks/:id/reorder updates status and orderIndex', async () => {
      const mockTaskDoc = {
        _id: mockTaskId,
        id: mockTaskId,
        status: TASK_STATUSES.TODO,
        orderIndex: 0,
        save: vi.fn().mockResolvedValue(true),
      };

      vi.spyOn(TaskModel, 'findOne').mockResolvedValue(mockTaskDoc as any);

      const res = await request(app)
        .patch(`/api/v1/tasks/${mockTaskId}/reorder`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: TASK_STATUSES.IN_PROGRESS,
          orderIndex: 2,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(TASK_STATUSES.IN_PROGRESS);
      expect(res.body.data.orderIndex).toBe(2);
    });
  });

  describe('Checklists, Comments & Time Logs', () => {
    it('POST /api/v1/tasks/:id/checklist adds a checklist item', async () => {
      const mockTaskDoc = {
        _id: mockTaskId,
        id: mockTaskId,
        checklist: [],
        save: vi.fn().mockResolvedValue(true),
      };

      vi.spyOn(TaskModel, 'findOne').mockResolvedValue(mockTaskDoc as any);
      vi.spyOn(TaskModel, 'findById').mockReturnValue({
        populate: () => ({
          populate: () =>
            Promise.resolve({
              toJSON: () => ({
                id: mockTaskId,
                checklist: [{ id: 'chk_1', title: 'Write unit tests', isCompleted: false }],
              }),
            }),
        }),
      } as any);

      const res = await request(app)
        .post(`/api/v1/tasks/${mockTaskId}/checklist`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Write unit tests',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.checklist.length).toBe(1);
    });

    it('POST /api/v1/tasks/:id/time-logs logs spent time', async () => {
      const mockTaskDoc = {
        _id: mockTaskId,
        id: mockTaskId,
        timeEntries: [],
        save: vi.fn().mockResolvedValue(true),
      };

      vi.spyOn(TaskModel, 'findOne').mockResolvedValue(mockTaskDoc as any);
      vi.spyOn(TaskModel, 'findById').mockReturnValue({
        populate: () => ({
          populate: () =>
            Promise.resolve({
              toJSON: () => ({
                id: mockTaskId,
                timeEntries: [{ durationSeconds: 3600, description: 'Pair programming session' }],
              }),
            }),
        }),
      } as any);

      const res = await request(app)
        .post(`/api/v1/tasks/${mockTaskId}/time-logs`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          durationSeconds: 3600,
          description: 'Pair programming session',
          startedAt: new Date().toISOString(),
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });
  });
});
