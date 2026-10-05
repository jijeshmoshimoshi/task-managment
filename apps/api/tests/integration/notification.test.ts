import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';
import { UserModel } from '../../src/modules/users/user.model';
import { NotificationModel } from '../../src/modules/notifications/notification.model';
import { SocketService } from '../../src/modules/notifications/socket.service';
import { JwtService } from '../../src/modules/auth/services/jwt.service';
import { SessionService } from '../../src/modules/auth/services/session.service';
import { ROLES, USER_STATUSES } from '@taskmaster/shared';

describe('Phase 7: Realtime Notifications & In-App Activity (Integration)', () => {
  const app = createApp();

  const mockOrgId = '65f000000000000000000001';
  const mockUserId = '65f000000000000000000002';
  const mockNotificationId = '65f000000000000000000099';

  const userToken = JwtService.signAccessToken({
    userId: mockUserId,
    organizationId: mockOrgId,
    role: ROLES.MEMBER,
    sessionId: 'sess_user_7',
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(SessionService, 'isSessionActive').mockResolvedValue(true);
    vi.spyOn(UserModel, 'findById').mockImplementation(() => {
      return {
        lean: () =>
          Promise.resolve({
            _id: mockUserId,
            organizationId: mockOrgId,
            email: 'member@acme.com',
            firstName: 'Alex',
            lastName: 'Developer',
            role: ROLES.MEMBER,
            status: USER_STATUSES.ACTIVE,
            isDeleted: false,
          }),
      } as any;
    });
  });

  describe('GET /api/v1/notifications', () => {
    it('returns paginated notifications for current authenticated user', async () => {
      const mockNotifications = [
        {
          _id: mockNotificationId,
          recipientId: mockUserId,
          organizationId: mockOrgId,
          senderName: 'Jane Manager',
          type: 'TASK_ASSIGNED',
          title: 'Task Assignment',
          message: 'Jane assigned you to PLAT-10',
          isRead: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.spyOn(NotificationModel, 'find').mockReturnValue({
        sort: () => ({
          skip: () => ({
            limit: () => ({
              lean: () => Promise.resolve(mockNotifications),
            }),
          }),
        }),
      } as any);

      vi.spyOn(NotificationModel, 'countDocuments').mockResolvedValue(1);

      const res = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].title).toBe('Task Assignment');
      expect(res.body.meta.unreadCount).toBe(1);
    });
  });

  describe('GET /api/v1/notifications/unread-count', () => {
    it('returns unread count', async () => {
      vi.spyOn(NotificationModel, 'countDocuments').mockResolvedValue(3);

      const res = await request(app)
        .get('/api/v1/notifications/unread-count')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.unreadCount).toBe(3);
    });
  });

  describe('PATCH /api/v1/notifications/:id/read', () => {
    it('marks a single notification as read', async () => {
      const emitSpy = vi.spyOn(SocketService, 'emitToUser').mockImplementation(() => {});

      vi.spyOn(NotificationModel, 'findOneAndUpdate').mockResolvedValue({
        _id: mockNotificationId,
        recipientId: mockUserId,
        organizationId: mockOrgId,
        isRead: true,
        readAt: new Date(),
        toJSON: () => ({
          id: mockNotificationId,
          recipientId: mockUserId,
          isRead: true,
        }),
      } as any);

      const res = await request(app)
        .patch(`/api/v1/notifications/${mockNotificationId}/read`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isRead).toBe(true);
      expect(emitSpy).toHaveBeenCalled();
    });
  });

  describe('PATCH /api/v1/notifications/read-all', () => {
    it('marks all notifications as read for current user', async () => {
      const emitSpy = vi.spyOn(SocketService, 'emitToUser').mockImplementation(() => {});
      vi.spyOn(NotificationModel, 'updateMany').mockResolvedValue({ modifiedCount: 4 } as any);

      const res = await request(app)
        .patch('/api/v1/notifications/read-all')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.modifiedCount).toBe(4);
      expect(emitSpy).toHaveBeenCalled();
    });
  });
});
