export type MeetingStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';

export interface IMeetingParticipant {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl?: string;
}

export interface IMeeting {
  id: string;
  organizationId: string;
  title: string;
  description?: string;
  participantId?: string;
  participant?: IMeetingParticipant;
  participantIds: string[];
  participants: IMeetingParticipant[];
  organizerId: string;
  organizer?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  startTime: string;
  endTime: string;
  status: MeetingStatus;
  googleMeetLink: string;
  googleCalendarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMeetingDto {
  title: string;
  description?: string;
  participantIds: string[];
  participantId?: string; // Fallback
  startTime: string;
  endTime: string;
  googleMeetLink?: string;
}
