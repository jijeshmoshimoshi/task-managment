import { Schema, model, Document, Types } from 'mongoose';
import { IUser, ROLES, USER_STATUSES } from '@taskmaster/shared';

export interface IUserDocument extends Omit<IUser, 'id' | 'organizationId' | 'departmentId' | 'teamIds'>, Document {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  departmentId?: Types.ObjectId;
  teamIds: Types.ObjectId[];
  passwordHash: string;
  twoFactorSecretEncrypted?: string;
  twoFactorRecoveryCodesEncrypted?: string[];
  failedLoginAttempts: number;
  lockoutUntil?: Date;
  isDeleted: boolean;
  deletedAt?: Date;
}

const UserSchema = new Schema<IUserDocument>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true, maxlength: 255 },
    passwordHash: { type: String, required: true },
    firstName: { type: String, required: true, trim: true, maxlength: 50 },
    lastName: { type: String, required: true, trim: true, maxlength: 50 },
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.USER,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(USER_STATUSES),
      default: USER_STATUSES.INVITED,
      required: true,
      index: true,
    },
    avatarUrl: { type: String, default: '' },
    jobTitle: { type: String, default: '' },
    phone: { type: String, default: '' },
    timezone: { type: String, default: 'UTC' },
    isTwoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecretEncrypted: { type: String },
    twoFactorRecoveryCodesEncrypted: { type: [String], default: [] },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department' },
    teamIds: [{ type: Schema.Types.ObjectId, ref: 'Team' }],
    failedLoginAttempts: { type: Number, default: 0 },
    lockoutUntil: { type: Date },
    lastLoginAt: { type: String },
    lastActiveAt: { type: String },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
  },
  {
    timestamps: true,
    optimisticConcurrency: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, any>) => {
        ret.id = ret._id.toString();
        ret.organizationId = ret.organizationId?.toString();
        if (ret.departmentId) ret.departmentId = ret.departmentId.toString();
        if (ret.teamIds) ret.teamIds = ret.teamIds.map((id: any) => id.toString());
        delete ret._id;
        delete ret.__v;
        delete ret.passwordHash;
        delete ret.twoFactorSecretEncrypted;
        delete ret.twoFactorRecoveryCodesEncrypted;
        return ret;
      },
    },
  },
);

// Compound indexes for multi-tenant queries
UserSchema.index({ organizationId: 1, email: 1 }, { unique: true });
UserSchema.index({ organizationId: 1, status: 1, isDeleted: 1 });
UserSchema.index({ organizationId: 1, role: 1 });

export const UserModel = model<IUserDocument>('User', UserSchema);
