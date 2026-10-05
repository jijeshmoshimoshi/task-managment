import { Schema, model, Document, Types } from 'mongoose';
import { IDepartment } from '@taskmaster/shared';

export interface IDepartmentDocument extends Omit<IDepartment, 'id' | 'organizationId' | 'leadId'>, Document {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  leadId?: Types.ObjectId;
  isDeleted: boolean;
  deletedAt?: Date;
}

const DepartmentSchema = new Schema<IDepartmentDocument>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, default: '', maxlength: 500 },
    leadId: { type: Schema.Types.ObjectId, ref: 'User' },
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
        if (ret.leadId) ret.leadId = ret.leadId.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  },
);

DepartmentSchema.index({ organizationId: 1, name: 1, isDeleted: 1 });

export const DepartmentModel = model<IDepartmentDocument>('Department', DepartmentSchema);
