export const TASK_STATUSES = {
  BACKLOG: 'BACKLOG',
  TODO: 'TODO',
  IN_PROGRESS: 'IN_PROGRESS',
  IN_REVIEW: 'IN_REVIEW',
  BLOCKED: 'BLOCKED',
  DONE: 'DONE',
} as const;

export type TaskStatus = (typeof TASK_STATUSES)[keyof typeof TASK_STATUSES];

export const TASK_PRIORITIES = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  URGENT: 'URGENT',
} as const;

export type TaskPriority = (typeof TASK_PRIORITIES)[keyof typeof TASK_PRIORITIES];

export const TASK_TYPES = {
  TASK: 'TASK',
  BUG: 'BUG',
  FEATURE: 'FEATURE',
  CHORE: 'CHORE',
} as const;

export type TaskType = (typeof TASK_TYPES)[keyof typeof TASK_TYPES];

export const RECURRENCE_FREQUENCIES = {
  DAILY: 'DAILY',
  WEEKLY: 'WEEKLY',
  MONTHLY: 'MONTHLY',
  CUSTOM: 'CUSTOM',
} as const;

export type RecurrenceFrequency = (typeof RECURRENCE_FREQUENCIES)[keyof typeof RECURRENCE_FREQUENCIES];

export interface IChecklistItem {
  id: string;
  title: string;
  isCompleted: boolean;
  completedAt?: string;
  completedBy?: string;
}

export interface ITaskComment {
  id: string;
  userId: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
    role?: string;
  } | string;
  content: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ITimeEntry {

  id: string;
  userId: string;
  durationSeconds: number;
  description?: string;
  startedAt: string;
  endedAt?: string;
  isManual: boolean;
  createdAt: string;
}

export interface ITaskRecurrence {
  frequency: RecurrenceFrequency;
  interval: number;
  nextRunAt: string;
  endDate?: string;
}

export interface ITaskApproval {
  requestedBy: string;
  requestedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewNote?: string;
}

export interface ITask {
  id: string;
  organizationId: string;
  projectId?: string; // Optional for personal tasks
  taskKey?: string; // e.g. PLAT-1
  taskNumber?: number; // e.g. 1
  title: string;
  descriptionHtml?: string;
  status: TaskStatus;
  priority: TaskPriority;
  type: TaskType;
  assigneeIds: string[];
  reporterId: string;
  watcherIds: string[];
  parentTaskId?: string;
  blockedByTaskIds: string[];
  blocksTaskIds: string[];
  milestoneId?: string;
  startDate?: string;
  dueDate?: string;
  estimatedMinutes?: number;
  labels: string[];
  checklist: IChecklistItem[];
  timeEntries: ITimeEntry[];
  comments?: ITaskComment[];
  recurrence?: ITaskRecurrence;
  approval?: ITaskApproval;
  isPersonal: boolean;
  isDeleted: boolean;

  orderIndex: number;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}
