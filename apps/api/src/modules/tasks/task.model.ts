import { Schema, model, Document, Types } from 'mongoose';
import {
  ITask,
  TASK_STATUSES,
  TASK_PRIORITIES,
  TASK_TYPES,
} from '@taskmaster/shared';

export interface ITaskDocument
  extends Omit<
      ITask,
      | 'id'
      | 'organizationId'
      | 'projectId'
      | 'assigneeIds'
      | 'reporterId'
      | 'watcherIds'
      | 'parentTaskId'
      | 'milestoneId'
      | 'createdBy'
      | 'updatedBy'
      | 'startDate'
      | 'dueDate'
      | 'createdAt'
      | 'updatedAt'
      | 'checklist'
      | 'timeEntries'
      | 'comments'
      | 'approval'
    >,
    Document {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  projectId?: Types.ObjectId;
  assigneeIds: Types.ObjectId[];
  reporterId: Types.ObjectId;
  approval?: {
    requestedBy?: Types.ObjectId | string;
    requestedAt?: Date | string;
    reviewedBy?: Types.ObjectId | string;
    reviewedAt?: Date | string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    reviewNote?: string;
  };
  watcherIds: Types.ObjectId[];
  parentTaskId?: Types.ObjectId;
  milestoneId?: Types.ObjectId;
  startDate?: Date;
  dueDate?: Date;
  checklist: Types.DocumentArray<{
    _id: Types.ObjectId;
    title: string;
    isCompleted: boolean;
    completedAt?: Date;
    completedBy?: Types.ObjectId;
  }>;
  timeEntries: Types.DocumentArray<{
    _id: Types.ObjectId;
    userId: Types.ObjectId;
    durationSeconds: number;
    description?: string;
    startedAt: Date;
    endedAt?: Date;
    isManual: boolean;
    createdAt: Date;
  }>;
  comments: Types.DocumentArray<{
    _id: Types.ObjectId;
    userId: Types.ObjectId;
    content: string;
    createdAt: Date;
    updatedAt: Date;
  }>;
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ChecklistItemSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 250 },
    isCompleted: { type: Boolean, default: false },
    completedAt: { type: Date },
    completedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, any>) => {
        ret.id = ret._id.toString();
        if (ret.completedBy) ret.completedBy = ret.completedBy.toString();
        if (ret.completedAt) ret.completedAt = ret.completedAt.toISOString();
        delete ret._id;
        return ret;
      },
    },
  },
);

const TimeEntrySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    durationSeconds: { type: Number, required: true, min: 1 },
    description: { type: String, default: '', maxlength: 500 },
    startedAt: { type: Date, required: true },
    endedAt: { type: Date },
    isManual: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
  },
  {
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, any>) => {
        ret.id = ret._id.toString();
        ret.userId = ret.userId?.toString();
        if (ret.startedAt) ret.startedAt = ret.startedAt.toISOString();
        if (ret.endedAt) ret.endedAt = ret.endedAt.toISOString();
        if (ret.createdAt) ret.createdAt = ret.createdAt.toISOString();
        delete ret._id;
        return ret;
      },
    },
  },
);

const CommentSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true, trim: true, maxlength: 5000 },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, any>) => {
        ret.id = ret._id.toString();
        if (ret.userId && typeof ret.userId === 'object') {
          const uId = ret.userId._id ? ret.userId._id.toString() : (ret.userId.id ? ret.userId.id.toString() : '');
          ret.userId = {
            id: uId,
            name: ret.userId.name || '',
            email: ret.userId.email || '',
            avatarUrl: ret.userId.avatarUrl,
            role: ret.userId.role,
          };
        } else if (ret.userId) {
          ret.userId = ret.userId.toString();
        }
        if (ret.createdAt) ret.createdAt = ret.createdAt.toISOString();
        if (ret.updatedAt) ret.updatedAt = ret.updatedAt.toISOString();
        delete ret._id;
        return ret;
      },
    },
  },
);

const ApprovalSchema = new Schema(
  {
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    requestedAt: { type: Date, default: Date.now },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING' },
    reviewNote: { type: String, default: '' },
  },
  {
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, any>) => {
        if (ret._id) ret.id = ret._id.toString();
        if (ret.requestedBy) ret.requestedBy = ret.requestedBy.toString();
        if (ret.reviewedBy) ret.reviewedBy = ret.reviewedBy.toString();
        if (ret.requestedAt && typeof ret.requestedAt === 'object' && ret.requestedAt.toISOString) {
          ret.requestedAt = ret.requestedAt.toISOString();
        }
        if (ret.reviewedAt && typeof ret.reviewedAt === 'object' && ret.reviewedAt.toISOString) {
          ret.reviewedAt = ret.reviewedAt.toISOString();
        }
        delete ret._id;
        return ret;
      },
    },
  },
);

const TaskSchema = new Schema<ITaskDocument>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      index: true,
    },
    taskKey: {
      type: String,
      trim: true,
      uppercase: true,
      index: true,
    },
    taskNumber: {
      type: Number,
      default: 0,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 250,
    },
    descriptionHtml: {
      type: String,
      default: '',
      maxlength: 50000,
    },
    status: {
      type: String,
      enum: Object.values(TASK_STATUSES),
      default: TASK_STATUSES.TODO,
      index: true,
    },
    priority: {
      type: String,
      enum: Object.values(TASK_PRIORITIES),
      default: TASK_PRIORITIES.MEDIUM,
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(TASK_TYPES),
      default: TASK_TYPES.TASK,
      index: true,
    },
    assigneeIds: [{ type: Schema.Types.ObjectId, ref: 'User', index: true }],
    reporterId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    watcherIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    parentTaskId: { type: Schema.Types.ObjectId, ref: 'Task' },
    blockedByTaskIds: [{ type: Schema.Types.ObjectId, ref: 'Task' }],
    blocksTaskIds: [{ type: Schema.Types.ObjectId, ref: 'Task' }],
    milestoneId: { type: Schema.Types.ObjectId },
    startDate: { type: Date },
    dueDate: { type: Date },
    estimatedMinutes: { type: Number, min: 0 },
    labels: [{ type: String, trim: true, maxlength: 30 }],
    checklist: [ChecklistItemSchema],
    timeEntries: [TimeEntrySchema],
    comments: [CommentSchema],
    approval: { type: ApprovalSchema },
    isPersonal: { type: Boolean, default: false, index: true },
    isDeleted: { type: Boolean, default: false, index: true },
    orderIndex: { type: Number, default: 0, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, any>) => {
        ret.id = ret._id.toString();
        ret.organizationId = ret.organizationId?.toString();
        if (ret.projectId) ret.projectId = ret.projectId.toString();
        if (ret.reporterId) {
          if (typeof ret.reporterId === 'object') {
            const rId = ret.reporterId._id ? ret.reporterId._id.toString() : (ret.reporterId.id ? ret.reporterId.id.toString() : '');
            ret.reporterId = {
              id: rId,
              name: ret.reporterId.name || '',
              email: ret.reporterId.email || '',
              avatarUrl: ret.reporterId.avatarUrl,
            };
          } else {
            ret.reporterId = ret.reporterId.toString();
          }
        }
        if (ret.createdBy) ret.createdBy = ret.createdBy.toString();
        if (ret.updatedBy) ret.updatedBy = ret.updatedBy.toString();
        if (ret.parentTaskId) ret.parentTaskId = ret.parentTaskId.toString();
        if (ret.milestoneId) ret.milestoneId = ret.milestoneId.toString();
        if (ret.assigneeIds && Array.isArray(ret.assigneeIds)) {
          ret.assigneeIds = ret.assigneeIds.map((u: any) => {
            if (u && typeof u === 'object') {
              const uId = u._id ? u._id.toString() : (u.id ? u.id.toString() : '');
              return {
                id: uId,
                name: u.name || '',
                email: u.email || '',
                avatarUrl: u.avatarUrl,
                role: u.role,
              };
            }
            return u ? u.toString() : '';
          });
        }
        if (ret.startDate) ret.startDate = ret.startDate.toISOString();
        if (ret.dueDate) ret.dueDate = ret.dueDate.toISOString();
        if (ret.createdAt) ret.createdAt = ret.createdAt.toISOString();
        if (ret.updatedAt) ret.updatedAt = ret.updatedAt.toISOString();

        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  },
);

TaskSchema.index({ organizationId: 1, projectId: 1, status: 1, orderIndex: 1 });
TaskSchema.index({ organizationId: 1, assigneeIds: 1, isDeleted: 1 });
TaskSchema.index({ organizationId: 1, isPersonal: 1, createdBy: 1 });
TaskSchema.index({ title: 'text', descriptionHtml: 'text', labels: 'text' });

export const TaskModel = model<ITaskDocument>('Task', TaskSchema);
