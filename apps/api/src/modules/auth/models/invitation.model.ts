import { Schema, model, Document, Types } from 'mongoose';
import { Role, ROLES } from '@taskmaster/shared';

export interface IInvitationDocument extends Document {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  departmentId?: Types.ObjectId;
  teamIds: Types.ObjectId[];
  tokenHash: string;
  expiresAt: Date;
  acceptedAt?: Date;
  invitedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const InvitationSchema = new Schema<IInvitationDocument>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    role: { type: String, enum: Object.values(ROLES), default: ROLES.USER, required: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department' },
    teamIds: [{ type: Schema.Types.ObjectId, ref: 'Team' }],
    tokenHash: { type: String, required: true, index: true },
    expiresAt: { type: Date, required: true },
    acceptedAt: { type: Date },
    invitedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  {
    timestamps: true,
  },
);

// TTL index to automatically purge expired invitations after 30 days
InvitationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });
InvitationSchema.index({ organizationId: 1, email: 1 });

export const InvitationModel = model<IInvitationDocument>('Invitation', InvitationSchema);
