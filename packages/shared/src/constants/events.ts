export const WS_EVENTS = {
  // Connection
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  AUTHENTICATE: 'authenticate',

  // Real-time Rooms
  JOIN_ORG: 'join:org',
  LEAVE_ORG: 'leave:org',
  JOIN_PROJECT: 'join:project',
  LEAVE_PROJECT: 'leave:project',
  JOIN_TASK: 'join:task',
  LEAVE_TASK: 'leave:task',

  // Task Events
  TASK_CREATED: 'task:created',
  TASK_UPDATED: 'task:updated',
  TASK_DELETED: 'task:deleted',
  TASK_MOVED: 'task:moved',
  TASK_ASSIGNED: 'task:assigned',
  TASK_STATUS_CHANGED: 'task:status_changed',
  TASK_COMMENT_ADDED: 'task:comment_added',
  TASK_ATTACHMENT_ADDED: 'task:attachment_added',

  // Project Events
  PROJECT_UPDATED: 'project:updated',
  PROJECT_MEMBER_ADDED: 'project:member_added',
  PROJECT_MEMBER_REMOVED: 'project:member_removed',

  // Notification Events
  NOTIFICATION_RECEIVED: 'notification:received',
  NOTIFICATION_READ: 'notification:read',
} as const;

export const QUEUE_NAMES = {
  EMAIL: 'email-queue',
  NOTIFICATIONS: 'notifications-queue',
  REMINDERS: 'reminders-queue',
  RECURRING_TASKS: 'recurring-tasks-queue',
  EXPORTS: 'exports-queue',
  AUDIT_LOG: 'audit-log-queue',
} as const;
