import { Router } from 'express';
import { NotificationController } from './notification.controller';
import { authenticate } from '../../common/middlewares/auth.middleware';

const router: Router = Router();

router.use(authenticate);

router.get('/', NotificationController.getMyNotifications);
router.get('/unread-count', NotificationController.getUnreadCount);
router.patch('/read-all', NotificationController.markAllAsRead);
router.patch('/:id/read', NotificationController.markAsRead);

export const notificationRouter: Router = router;
