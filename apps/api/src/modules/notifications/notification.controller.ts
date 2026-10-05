import { Request, Response, NextFunction } from 'express';
import { NotificationService } from './notification.service';
import { UnauthorizedError } from '../../common/errors/app-error';

export class NotificationController {
  public static async getMyNotifications(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const user = req.user;
      if (!user) throw new UnauthorizedError();

      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const unreadOnly = req.query.unreadOnly === 'true';

      const result = await NotificationService.getUserNotifications(
        user.id,
        user.organizationId,
        { page, limit, unreadOnly },
      );

      res.status(200).json({
        success: true,
        data: result.notifications,
        meta: {
          total: result.total,
          unreadCount: result.unreadCount,
          page,
          limit,
          totalPages: Math.ceil(result.total / limit),
        },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getUnreadCount(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const user = req.user;
      if (!user) throw new UnauthorizedError();

      const unreadCount = await NotificationService.getUnreadCount(user.id, user.organizationId);

      res.status(200).json({
        success: true,
        data: { unreadCount },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async markAsRead(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const user = req.user;
      if (!user) throw new UnauthorizedError();

      const notification = await NotificationService.markAsRead(
        req.params.id as string,
        user.id,
        user.organizationId,
      );

      res.status(200).json({
        success: true,
        data: notification,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async markAllAsRead(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const user = req.user;
      if (!user) throw new UnauthorizedError();

      const modifiedCount = await NotificationService.markAllAsRead(
        user.id,
        user.organizationId,
      );

      res.status(200).json({
        success: true,
        data: { modifiedCount },
      });
    } catch (err) {
      next(err);
    }
  }
}
