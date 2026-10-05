import { Schema, model, Document, Types } from 'mongoose';
import { INotification } from '@taskmaster/shared';

export interface INotificationDocument extends Omit<INotification, 'id'>, Document {
  _id: Types.ObjectId;
}

const notificationSchema = new Schema<INotificationDocument>(
  {
    recipientId: {
      type: String,
      required: true,
      index: true,
    },
    organizationId: {
      type: String,
      required: true,
      index: true,
    },
    senderId: {
      type: String,
    },
    senderName: {
      type: String,
    },
    type: {
      type: String,
      required: true,
      enum: [
        'TASK_ASSIGNED',
        'TASK_STATUS_CHANGED',
        'TASK_COMMENT',
        'PROJECT_MEMBER_ADDED',
        'SYSTEM_ALERT',
        'MEETING_SCHEDULED',
      ],
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    link: {
      type: String,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: any) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  },
);

notificationSchema.index({ organizationId: 1, recipientId: 1, isRead: 1, createdAt: -1 });

export const NotificationModel = model<INotificationDocument>('Notification', notificationSchema);
