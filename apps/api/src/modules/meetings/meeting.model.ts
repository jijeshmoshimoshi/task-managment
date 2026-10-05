import { Schema, model, Document, Types } from 'mongoose';
import { IMeeting } from '@taskmaster/shared';

export interface IMeetingDocument extends Omit<IMeeting, 'id' | 'participant' | 'participants' | 'organizer' | 'startTime' | 'endTime' | 'createdAt' | 'updatedAt'>, Document {
  _id: Types.ObjectId;
  startTime: Date;
  endTime: Date;
  createdAt: Date;
  updatedAt: Date;
}

const meetingSchema = new Schema<IMeetingDocument>(
  {
    organizationId: {
      type: String,
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    participantIds: {
      type: [String],
      required: true,
      index: true,
    },
    participantId: {
      type: String,
      index: true,
    },
    organizerId: {
      type: String,
      required: true,
      index: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['SCHEDULED', 'COMPLETED', 'CANCELLED'],
      default: 'SCHEDULED',
      index: true,
    },
    googleMeetLink: {
      type: String,
      required: true,
    },
    googleCalendarUrl: {
      type: String,
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

meetingSchema.index({ organizationId: 1, participantIds: 1, status: 1 });

export const MeetingModel = model<IMeetingDocument>('Meeting', meetingSchema);
