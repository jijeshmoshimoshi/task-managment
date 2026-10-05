import { Schema, model, Document, Types } from 'mongoose';

export interface ISessionDocument extends Document {
  _id: Types.ObjectId;
  sessionId: string;
  userId: Types.ObjectId;
  organizationId: Types.ObjectId;
  tokenFamily: string;
  refreshTokenHash: string;
  userAgent: string;
  ipAddress: string;
  isRevoked: boolean;
  revokedReason?: string;
  expiresAt: Date;
  lastUsedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SessionSchema = new Schema<ISessionDocument>(
  {
    sessionId: { type: String, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    tokenFamily: { type: String, required: true, index: true },
    refreshTokenHash: { type: String, required: true },
    userAgent: { type: String, default: 'Unknown' },
    ipAddress: { type: String, default: '0.0.0.0' },
    isRevoked: { type: Boolean, default: false },
    revokedReason: { type: String },
    expiresAt: { type: Date, required: true },
    lastUsedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  },
);

// TTL index to automatically remove expired session records after 30 days
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });
SessionSchema.index({ userId: 1, isRevoked: 1 });

export const SessionModel = model<ISessionDocument>('Session', SessionSchema);
