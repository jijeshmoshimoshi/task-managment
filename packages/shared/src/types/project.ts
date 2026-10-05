import { ProjectRole } from '../constants/permissions';

export const PROJECT_STATUSES = {
  PLANNING: 'PLANNING',
  ACTIVE: 'ACTIVE',
  ON_HOLD: 'ON_HOLD',
  COMPLETED: 'COMPLETED',
  ARCHIVED: 'ARCHIVED',
} as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[keyof typeof PROJECT_STATUSES];

export const PROJECT_PRIORITIES = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  URGENT: 'URGENT',
} as const;

export type ProjectPriority = (typeof PROJECT_PRIORITIES)[keyof typeof PROJECT_PRIORITIES];

export const PROJECT_HEALTH = {
  ON_TRACK: 'ON_TRACK',
  AT_RISK: 'AT_RISK',
  DELAYED: 'DELAYED',
} as const;

export type ProjectHealth = (typeof PROJECT_HEALTH)[keyof typeof PROJECT_HEALTH];

export interface IProjectMember {
  userId: string;
  role: ProjectRole;
  joinedAt: string;
}

export interface IProjectMemberPopulated {
  userId: {
    id: string;
    _id?: string;
    name: string;
    email: string;
    avatarUrl?: string;
    role: string;
    department?: string;
    jobTitle?: string;
  };
  role: ProjectRole;
  joinedAt: string;
}

export interface IMilestone {
  id: string;
  title: string;
  description?: string;
  dueDate?: string;
  isCompleted: boolean;
  completedAt?: string;
  order?: number;
}

export interface IProjectStats {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  overdueTasks: number;
  progressPercentage: number;
  spentBudget?: number;
}

export interface IProject {
  id: string;
  organizationId: string;
  name: string;
  key: string;
  description?: string;
  client?: string;
  startDate?: string;
  endDate?: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  health: ProjectHealth;
  budget?: number;
  tags: string[];
  coverColor?: string;
  icon?: string;
  members: IProjectMember[];
  milestones: IMilestone[];
  stats?: IProjectStats;
  isTemplate?: boolean;
  isArchived: boolean;
  isDeleted: boolean;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

