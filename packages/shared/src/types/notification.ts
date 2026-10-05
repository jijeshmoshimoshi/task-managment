export type NotificationType =
  | 'TASK_ASSIGNED'
  | 'TASK_STATUS_CHANGED'
  | 'TASK_COMMENT'
  | 'PROJECT_MEMBER_ADDED'
  | 'SYSTEM_ALERT'
  | 'MEETING_SCHEDULED';

export interface INotification {
  id: string;
  recipientId: string;
  organizationId: string;
  senderId?: string;
  senderName?: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  readAt?: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;
}
