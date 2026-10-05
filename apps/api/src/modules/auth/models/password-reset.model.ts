import { Schema, model, Document, Types } from 'mongoose';

export interface IPasswordResetDocument extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  usedAt?: Date;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
}

const PasswordResetSchema = new Schema<IPasswordResetDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, index: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date },
    ipAddress: { type: String, required: true },
    userAgent: { type: String, required: true },
  },
  {
    timestamps: true,
  },
);

// TTL index to automatically purge expired password reset tokens after 7 days
PasswordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });

export const PasswordResetModel = model<IPasswordResetDocument>(
  'PasswordReset',
  PasswordResetSchema,
);
