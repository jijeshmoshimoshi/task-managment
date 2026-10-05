import { Schema, model, Document, Types } from 'mongoose';
import { IAuditLog } from '@taskmaster/shared';

export interface IAuditLogDocument extends Omit<IAuditLog, 'id' | 'organizationId' | 'actorId'>, Document {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  actorId: Types.ObjectId;
}

const AuditLogSchema = new Schema<IAuditLogDocument>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    actorEmail: { type: String, required: true },
    actorName: { type: String, required: true },
    action: { type: String, required: true, index: true },
    resourceType: { type: String, required: true, index: true },
    resourceId: { type: String, index: true },
    resourceTitle: { type: String },
    before: { type: Schema.Types.Mixed },
    after: { type: Schema.Types.Mixed },
    ipAddress: { type: String, default: '0.0.0.0' },
    userAgent: { type: String, default: 'Unknown' },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Immutable: no updatedAt
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, any>) => {
        ret.id = ret._id.toString();
        ret.organizationId = ret.organizationId?.toString();
        ret.actorId = ret.actorId?.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  },
);

// Compound index for organization audit timeline queries
AuditLogSchema.index({ organizationId: 1, createdAt: -1 });
AuditLogSchema.index({ organizationId: 1, action: 1, createdAt: -1 });
AuditLogSchema.index({ organizationId: 1, resourceType: 1, resourceId: 1 });

export const AuditLogModel = model<IAuditLogDocument>('AuditLog', AuditLogSchema);
