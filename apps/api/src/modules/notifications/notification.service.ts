import { NotificationModel } from './notification.model';
import { SocketService } from './socket.service';
import { WS_EVENTS, NotificationType } from '@taskmaster/shared';
import { logger } from '../../config/logger';

export interface CreateNotificationDto {
  recipientId: string;
  organizationId: string;
  senderId?: string;
  senderName?: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
}

export class NotificationService {
  public static async create(data: CreateNotificationDto): Promise<any> {
    try {
      const notification = await NotificationModel.create(data);
      const json = notification.toJSON();

      // Emit real-time WebSocket event directly to recipient's personal room
      SocketService.emitToUser(data.recipientId, WS_EVENTS.NOTIFICATION_RECEIVED, json);

      return json;
    } catch (err) {
      logger.error({ err, recipientId: data.recipientId }, 'Failed to create notification');
    }
  }

  public static async getUserNotifications(
    userId: string,
    organizationId: string,
    options: { page?: number; limit?: number; unreadOnly?: boolean } = {},
  ): Promise<{ notifications: any[]; total: number; unreadCount: number }> {
    const page = options.page || 1;
    const limit = Math.min(options.limit || 20, 50);
    const skip = (page - 1) * limit;

    const query: any = {
      recipientId: userId,
      organizationId,
    };

    if (options.unreadOnly) {
      query.isRead = false;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      NotificationModel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      NotificationModel.countDocuments(query),
      NotificationModel.countDocuments({
        recipientId: userId,
        organizationId,
        isRead: false,
      }),
    ]);

    return {
      notifications: notifications.map((n: any) => ({
        id: n._id.toString(),
        recipientId: n.recipientId,
        organizationId: n.organizationId,
        senderId: n.senderId,
        senderName: n.senderName,
        type: n.type,
        title: n.title,
        message: n.message,
        link: n.link,
        isRead: n.isRead,
        readAt: n.readAt,
        createdAt: n.createdAt,
        updatedAt: n.updatedAt,
      })),
      total,
      unreadCount,
    };
  }

  public static async markAsRead(
    notificationId: string,
    userId: string,
    organizationId: string,
  ): Promise<any> {
    const notification = await NotificationModel.findOneAndUpdate(
      { _id: notificationId, recipientId: userId, organizationId },
      { $set: { isRead: true, readAt: new Date() } },
      { new: true },
    );

    if (notification) {
      SocketService.emitToUser(userId, WS_EVENTS.NOTIFICATION_READ, {
        id: notification._id.toString(),
      });
      return notification.toJSON();
    }
    return null;
  }

  public static async markAllAsRead(userId: string, organizationId: string): Promise<number> {
    const result = await NotificationModel.updateMany(
      { recipientId: userId, organizationId, isRead: false },
      { $set: { isRead: true, readAt: new Date() } },
    );

    SocketService.emitToUser(userId, WS_EVENTS.NOTIFICATION_READ, { all: true });

    return result.modifiedCount;
  }

  public static async getUnreadCount(userId: string, organizationId: string): Promise<number> {
    return NotificationModel.countDocuments({
      recipientId: userId,
      organizationId,
      isRead: false,
    });
  }
}
