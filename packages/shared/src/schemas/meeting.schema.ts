import { z } from 'zod';

export const CreateMeetingSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters').max(150),
  description: z.string().max(1000).optional(),
  participantIds: z.array(z.string()).min(1, 'At least one participant is required').optional(),
  participantId: z.string().optional(),
  startTime: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid start time',
  }),
  endTime: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid end time',
  }),
  googleMeetLink: z.string().url().optional().or(z.literal('')),
}).refine((data) => (data.participantIds && data.participantIds.length > 0) || !!data.participantId, {
  message: 'At least one participant is required',
  path: ['participantIds'],
});

export const UpdateMeetingStatusSchema = z.object({
  status: z.enum(['SCHEDULED', 'COMPLETED', 'CANCELLED']),
});
