import { Schema, model, Document, Types } from 'mongoose';
import {
  IProject,
  PROJECT_STATUSES,
  PROJECT_PRIORITIES,
  PROJECT_HEALTH,
  PROJECT_ROLES,
} from '@taskmaster/shared';

export interface IProjectDocument
  extends Omit<
      IProject,
      | 'id'
      | 'organizationId'
      | 'createdBy'
      | 'updatedBy'
      | 'members'
      | 'milestones'
      | 'startDate'
      | 'endDate'
      | 'createdAt'
      | 'updatedAt'
    >,
    Document {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  startDate?: Date;
  endDate?: Date;
  members: Array<{
    userId: Types.ObjectId;
    role: string;
    joinedAt: Date;
  }>;
  milestones: Types.DocumentArray<{
    _id: Types.ObjectId;
    title: string;
    description?: string;
    dueDate?: Date;
    isCompleted: boolean;
    completedAt?: Date;
    order: number;
  }>;
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
  deletedAt?: Date;
}

const MilestoneSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, default: '', maxlength: 1000 },
    dueDate: { type: Date },
    isCompleted: { type: Boolean, default: false },
    completedAt: { type: Date },
    order: { type: Number, default: 0 },
  },
  {
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, any>) => {
        ret.id = ret._id.toString();
        if (ret.dueDate) ret.dueDate = ret.dueDate.toISOString();
        if (ret.completedAt) ret.completedAt = ret.completedAt.toISOString();
        delete ret._id;
        return ret;
      },
    },
  },
);

const ProjectMemberSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: {
      type: String,
      enum: Object.values(PROJECT_ROLES),
      default: PROJECT_ROLES.CONTRIBUTOR,
    },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const ProjectSchema = new Schema<IProjectDocument>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    key: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 10,
    },
    description: { type: String, default: '', maxlength: 2000 },
    client: { type: String, default: '', maxlength: 100 },
    startDate: { type: Date },
    endDate: { type: Date },
    status: {
      type: String,
      enum: Object.values(PROJECT_STATUSES),
      default: PROJECT_STATUSES.PLANNING,
      index: true,
    },
    priority: {
      type: String,
      enum: Object.values(PROJECT_PRIORITIES),
      default: PROJECT_PRIORITIES.MEDIUM,
      index: true,
    },
    health: {
      type: String,
      enum: Object.values(PROJECT_HEALTH),
      default: PROJECT_HEALTH.ON_TRACK,
      index: true,
    },
    budget: { type: Number, min: 0 },
    tags: [{ type: String, trim: true, maxlength: 30 }],
    coverColor: { type: String, default: '#3b82f6' },
    icon: { type: String, default: 'folder' },
    members: [ProjectMemberSchema],
    milestones: [MilestoneSchema],
    isTemplate: { type: Boolean, default: false, index: true },
    isArchived: { type: Boolean, default: false, index: true },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
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
        if (ret.createdBy) ret.createdBy = ret.createdBy.toString();
        if (ret.updatedBy) ret.updatedBy = ret.updatedBy.toString();
        if (ret.startDate) ret.startDate = ret.startDate.toISOString();
        if (ret.endDate) ret.endDate = ret.endDate.toISOString();
        if (ret.createdAt) ret.createdAt = ret.createdAt.toISOString();
        if (ret.updatedAt) ret.updatedAt = ret.updatedAt.toISOString();
        if (ret.members && Array.isArray(ret.members)) {
          ret.members = ret.members.map((m: any) => {
            const u = m.userId;
            let resolvedUser = u;

            if (u && typeof u === 'object') {
              const uId = u._id ? u._id.toString() : (u.id ? u.id.toString() : '');
              resolvedUser = {
                id: uId,
                name: u.name || '',
                email: u.email || '',
                avatarUrl: u.avatarUrl,
                role: u.role,
                jobTitle: u.jobTitle,
                department: u.department,
              };
            } else if (u) {
              resolvedUser = typeof u.toString === 'function' ? u.toString() : String(u);
            }

            return {
              userId: resolvedUser,
              role: m.role,
              joinedAt: m.joinedAt instanceof Date ? m.joinedAt.toISOString() : m.joinedAt,
            };
          });
        }
        if (ret.milestones && Array.isArray(ret.milestones)) {
          ret.milestones = ret.milestones.map((m: any) => ({
            id: m._id ? m._id.toString() : m.id,
            title: m.title,
            description: m.description,
            dueDate: m.dueDate instanceof Date ? m.dueDate.toISOString() : m.dueDate,
            isCompleted: m.isCompleted,
            completedAt: m.completedAt instanceof Date ? m.completedAt.toISOString() : m.completedAt,
            order: m.order,
          }));
        }
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  },
);

ProjectSchema.index({ organizationId: 1, key: 1, isDeleted: 1 });
ProjectSchema.index({ organizationId: 1, 'members.userId': 1 });
ProjectSchema.index({ organizationId: 1, status: 1, isArchived: 1, isDeleted: 1 });
ProjectSchema.index({ name: 'text', description: 'text', client: 'text' });

export const ProjectModel = model<IProjectDocument>('Project', ProjectSchema);
