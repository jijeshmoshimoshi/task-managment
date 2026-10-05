import { Schema, model, Document, Types } from 'mongoose';
import { ITeam } from '@taskmaster/shared';

export interface ITeamDocument extends Omit<ITeam, 'id' | 'organizationId' | 'departmentId' | 'leadId' | 'memberIds'>, Document {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  departmentId?: Types.ObjectId;
  leadId?: Types.ObjectId;
  memberIds: Types.ObjectId[];
  isDeleted: boolean;
  deletedAt?: Date;
}

const TeamSchema = new Schema<ITeamDocument>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department' },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, default: '', maxlength: 500 },
    leadId: { type: Schema.Types.ObjectId, ref: 'User' },
    memberIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, any>) => {
        ret.id = ret._id.toString();
        ret.organizationId = ret.organizationId?.toString();
        if (ret.departmentId) ret.departmentId = ret.departmentId.toString();
        if (ret.leadId) ret.leadId = ret.leadId.toString();
        if (ret.memberIds) ret.memberIds = ret.memberIds.map((id: any) => id.toString());
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  },
);

TeamSchema.index({ organizationId: 1, name: 1, isDeleted: 1 });
TeamSchema.index({ organizationId: 1, departmentId: 1 });

export const TeamModel = model<ITeamDocument>('Team', TeamSchema);
