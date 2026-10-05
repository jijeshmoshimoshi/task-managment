import { Schema, model, Document, Types } from 'mongoose';
import { IOrganization } from '@taskmaster/shared';

export interface IOrganizationDocument extends Omit<IOrganization, 'id'>, Document {
  _id: Types.ObjectId;
}

const OrganizationSchema = new Schema<IOrganizationDocument>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 100 },
    branding: {
      logoUrl: { type: String, default: '' },
      primaryColor: { type: String, default: '#3b82f6' },
      accentColor: { type: String, default: '#6366f1' },
      companyName: { type: String, default: 'My Workspace' },
      supportEmail: { type: String, default: '' },
    },
    securityPolicy: {
      passwordMinLength: { type: Number, default: 8, min: 8, max: 32 },
      passwordRequireNumbers: { type: Boolean, default: true },
      passwordRequireSymbols: { type: Boolean, default: true },
      passwordRequireUppercase: { type: Boolean, default: true },
      enforce2FARoles: { type: [String], default: [] },
      sessionMaxLifetimeMinutes: { type: Number, default: 10080 }, // 7 days
      ipAllowList: { type: [String], default: [] },
      maxFailedLoginAttempts: { type: Number, default: 5 },
      lockoutDurationMinutes: { type: Number, default: 15 },
    },
    isSuspended: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, any>) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  },
);

export const OrganizationModel = model<IOrganizationDocument>('Organization', OrganizationSchema);
