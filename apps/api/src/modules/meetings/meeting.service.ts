import { MeetingModel } from './meeting.model';
import { UserModel } from '../users/user.model';
import { NotificationService } from '../notifications/notification.service';
import { GoogleCalendarService } from '../../common/services/google-calendar.service';
import { EmailService } from '../../common/services/email.service';
import { CreateMeetingDto, MeetingStatus, ERROR_CODES } from '@taskmaster/shared';
import { NotFoundError, ConflictError, BadRequestError } from '../../common/errors/app-error';

function formatGoogleCalendarDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toISOString().replace(/-|:|\.\d\d\d/g, '');
}

function generateGoogleMeetUrl(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  const part1 = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  const part2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  const part3 = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `https://meet.google.com/${part1}-${part2}-${part3}`;
}

export class MeetingService {
  public static async createMeeting(
    organizerId: string,
    organizationId: string,
    dto: CreateMeetingDto,
  ) {
    const { title, description, startTime, endTime, googleMeetLink } = dto;

    // Support both participantIds array and single participantId fallback
    const targetParticipantIds: string[] = Array.isArray(dto.participantIds) && dto.participantIds.length > 0
      ? dto.participantIds
      : dto.participantId
      ? [dto.participantId]
      : [];

    if (targetParticipantIds.length === 0) {
      throw new BadRequestError('At least one member must be selected for the meeting');
    }

    // 1. Verify all participants exist in the organization
    const participants = await UserModel.find({
      _id: { $in: targetParticipantIds },
      organizationId,
      isDeleted: false,
    }).lean();

    if (participants.length === 0) {
      throw new NotFoundError('No valid participant users found in this organization');
    }

    // 2. Check if ANY of the selected participants ALREADY HAS A SCHEDULED MEETING
    const existingMeetings = await MeetingModel.find({
      organizationId,
      $or: [
        { participantIds: { $in: targetParticipantIds } },
        { participantId: { $in: targetParticipantIds } },
      ],
      status: 'SCHEDULED',
    }).lean();

    if (existingMeetings.length > 0) {
      const busyParticipantIds = new Set<string>();
      existingMeetings.forEach((m) => {
        if (m.participantIds && m.participantIds.length > 0) {
          m.participantIds.forEach((id) => busyParticipantIds.add(id.toString()));
        }
        if (m.participantId) {
          busyParticipantIds.add(m.participantId.toString());
        }
      });

      const busyMembers = participants.filter((p) => busyParticipantIds.has(p._id.toString()));
      const busyNames = busyMembers.map((p) => `${p.firstName} ${p.lastName}`).join(', ');

      throw new ConflictError(
        `The following member(s) already have an active scheduled meeting: ${busyNames}. Under scheduling policy, members cannot have more than one active meeting at a time.`,
        ERROR_CODES.CONFLICT,
      );
    }

    // 3. Get organizer info
    const organizer = await UserModel.findById(organizerId).lean();
    const organizerName = organizer ? `${organizer.firstName} ${organizer.lastName}` : 'Admin';
    const organizerEmail = organizer?.email || 'admin@taskmaster.com';

    const participantEmails = participants.map((p) => p.email);
    const allRecipients = Array.from(new Set([...participantEmails, organizerEmail]));

    // 4. Try Google Calendar API for real Meet link & Google event creation
    const googleCalEvent = await GoogleCalendarService.createMeetingEvent({
      title,
      description,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      organizerEmail,
      participantEmails,
    });

    // 5. Determine Google Meet URL
    const meetLink =
      googleCalEvent?.googleMeetLink ||
      (googleMeetLink && googleMeetLink.trim() !== '' ? googleMeetLink.trim() : generateGoogleMeetUrl());

    // 6. Generate Google Calendar web link fallback
    const startIso = formatGoogleCalendarDate(startTime);
    const endIso = formatGoogleCalendarDate(endTime);
    const participantNames = participants.map((p) => `${p.firstName} ${p.lastName} (${p.email})`).join('\n• ');
    const participantEmailStr = participantEmails.join(',');

    const detailsContent = `${description ? description + '\n\n' : ''}🎥 Google Meet Link: ${meetLink}\n\n👥 Scheduled Members:\n• ${participantNames}\n\n🛡️ Organizer: ${organizerName}`;

    const calendarUrl =
      googleCalEvent?.htmlLink ||
      `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
        title,
      )}&details=${encodeURIComponent(detailsContent)}&location=${encodeURIComponent(
        meetLink,
      )}&dates=${startIso}/${endIso}&add=${encodeURIComponent(participantEmailStr)}`;

    // 7. Save meeting record
    const meeting = await MeetingModel.create({
      organizationId,
      title,
      description,
      participantIds: targetParticipantIds,
      participantId: targetParticipantIds[0],
      organizerId,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      status: 'SCHEDULED',
      googleMeetLink: meetLink,
      googleCalendarUrl: calendarUrl,
    });

    // 8. Send Nodemailer email with .ics Calendar attachment to ALL recipients (Admin + Participants)
    await EmailService.sendMeetingInviteEmail({
      recipients: allRecipients,
      title,
      description,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      organizerName,
      organizerEmail,
      googleMeetLink: meetLink,
      googleCalendarUrl: calendarUrl,
    });

    // 9. Send in-app notifications to ALL selected members
    const formattedDate = new Date(startTime).toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    await Promise.all(
      participants.map((p) =>
        NotificationService.create({
          recipientId: p._id.toString(),
          organizationId,
          senderId: organizerId,
          senderName: organizerName,
          type: 'MEETING_SCHEDULED',
          title: '📅 New Google Meet Scheduled',
          message: `You have a meeting scheduled with ${organizerName} on ${formattedDate}. Link: ${meetLink}`,
          link: meetLink,
        }),
      ),
    );

    return this.getMeetingById(meeting._id.toString(), organizationId);
  }

  public static async getMeetings(
    userId: string,
    role: string,
    organizationId: string,
  ) {
    const isManagerOrAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';

    const query: any = { organizationId };
    if (!isManagerOrAdmin) {
      query.$or = [
        { participantIds: userId },
        { participantId: userId },
        { organizerId: userId },
      ];
    }

    const meetings = await MeetingModel.find(query).sort({ startTime: -1 }).lean();

    // Collect all user IDs to populate details
    const userIds = new Set<string>();
    meetings.forEach((m) => {
      if (m.participantIds && m.participantIds.length > 0) {
        m.participantIds.forEach((id) => userIds.add(id));
      }
      if (m.participantId) {
        userIds.add(m.participantId);
      }
      userIds.add(m.organizerId);
    });

    const users = await UserModel.find({ _id: { $in: Array.from(userIds) } })
      .select('firstName lastName email avatarUrl')
      .lean();

    const userMap = new Map(users.map((u) => [u._id.toString(), u]));

    return meetings.map((m) => {
      const pIds = m.participantIds && m.participantIds.length > 0
        ? m.participantIds
        : m.participantId
        ? [m.participantId]
        : [];

      const participantsList = pIds
        .map((id) => userMap.get(id))
        .filter(Boolean)
        .map((u) => ({
          id: u!._id.toString(),
          firstName: u!.firstName,
          lastName: u!.lastName,
          email: u!.email,
          avatarUrl: u!.avatarUrl,
        }));

      const firstParticipant = participantsList[0];

      return {
        id: m._id.toString(),
        organizationId: m.organizationId,
        title: m.title,
        description: m.description,
        participantId: firstParticipant?.id,
        participant: firstParticipant,
        participantIds: pIds,
        participants: participantsList,
        organizerId: m.organizerId,
        organizer: userMap.get(m.organizerId)
          ? {
              id: m.organizerId,
              firstName: userMap.get(m.organizerId)!.firstName,
              lastName: userMap.get(m.organizerId)!.lastName,
              email: userMap.get(m.organizerId)!.email,
            }
          : undefined,
        startTime: m.startTime.toISOString(),
        endTime: m.endTime.toISOString(),
        status: m.status as MeetingStatus,
        googleMeetLink: m.googleMeetLink,
        googleCalendarUrl: m.googleCalendarUrl,
        createdAt: m.createdAt.toISOString(),
        updatedAt: m.updatedAt.toISOString(),
      };
    });
  }

  public static async getMeetingById(id: string, organizationId: string) {
    const m = await MeetingModel.findOne({ _id: id, organizationId }).lean();
    if (!m) throw new NotFoundError('Meeting not found');

    const pIds = m.participantIds && m.participantIds.length > 0
      ? m.participantIds
      : m.participantId
      ? [m.participantId]
      : [];

    const userIds = [...new Set([...pIds, m.organizerId])];

    const users = await UserModel.find({
      _id: { $in: userIds },
    })
      .select('firstName lastName email avatarUrl')
      .lean();

    const userMap = new Map(users.map((u) => [u._id.toString(), u]));

    const participantsList = pIds
      .map((id) => userMap.get(id))
      .filter(Boolean)
      .map((u) => ({
        id: u!._id.toString(),
        firstName: u!.firstName,
        lastName: u!.lastName,
        email: u!.email,
        avatarUrl: u!.avatarUrl,
      }));

    const firstParticipant = participantsList[0];

    return {
      id: m._id.toString(),
      organizationId: m.organizationId,
      title: m.title,
      description: m.description,
      participantId: firstParticipant?.id,
      participant: firstParticipant,
      participantIds: pIds,
      participants: participantsList,
      organizerId: m.organizerId,
      organizer: userMap.get(m.organizerId)
        ? {
            id: m.organizerId,
            firstName: userMap.get(m.organizerId)!.firstName,
            lastName: userMap.get(m.organizerId)!.lastName,
            email: userMap.get(m.organizerId)!.email,
          }
        : undefined,
      startTime: m.startTime.toISOString(),
      endTime: m.endTime.toISOString(),
      status: m.status as MeetingStatus,
      googleMeetLink: m.googleMeetLink,
      googleCalendarUrl: m.googleCalendarUrl,
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
    };
  }

  public static async updateMeetingStatus(
    id: string,
    organizationId: string,
    status: MeetingStatus,
  ) {
    const meeting = await MeetingModel.findOneAndUpdate(
      { _id: id, organizationId },
      { $set: { status } },
      { new: true },
    );

    if (!meeting) {
      throw new NotFoundError('Meeting not found');
    }

    return this.getMeetingById(id, organizationId);
  }

  public static async deleteMeeting(id: string, organizationId: string) {
    const result = await MeetingModel.deleteOne({ _id: id, organizationId });
    if (result.deletedCount === 0) {
      throw new NotFoundError('Meeting not found');
    }
    return { success: true };
  }
}
