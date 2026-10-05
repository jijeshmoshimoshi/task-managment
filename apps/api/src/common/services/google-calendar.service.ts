import { google } from 'googleapis';
import { env } from '../../config/env';
import { logger } from '../../config/logger';

export interface CalendarEventInput {
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  organizerEmail?: string;
  participantEmails: string[];
}

export interface CalendarEventResult {
  googleMeetLink: string;
  eventId?: string;
  htmlLink?: string;
}

export class GoogleCalendarService {
  public static isConfigured(): boolean {
    return Boolean(
      env.GOOGLE_CLIENT_ID &&
        env.GOOGLE_CLIENT_SECRET &&
        env.GOOGLE_REFRESH_TOKEN,
    );
  }

  private static getOAuth2Client() {
    const oauth2Client = new google.auth.OAuth2(
      env.GOOGLE_CLIENT_ID,
      env.GOOGLE_CLIENT_SECRET,
      env.GOOGLE_REDIRECT_URI || 'https://developers.google.com/oauthplayground',
    );

    if (env.GOOGLE_REFRESH_TOKEN) {
      oauth2Client.setCredentials({
        refresh_token: env.GOOGLE_REFRESH_TOKEN,
      });
    }

    return oauth2Client;
  }

  /**
   * Creates a real Google Calendar Event with an official Google Meet room
   * and automatically sends native Google Calendar invites to attendees.
   */
  public static async createMeetingEvent(
    input: CalendarEventInput,
  ): Promise<CalendarEventResult | null> {
    if (!this.isConfigured()) {
      logger.info('Google Calendar API not fully configured (missing GOOGLE_REFRESH_TOKEN). Using fallback generator.');
      return null;
    }

    try {
      const auth = this.getOAuth2Client();
      const calendar = google.calendar({ version: 'v3', auth });

      const emailList = Array.from(
        new Set([
          ...input.participantEmails,
          ...(input.organizerEmail ? [input.organizerEmail] : []),
        ]),
      );
      const attendees = emailList.map((email) => ({ email }));

      const response = await calendar.events.insert({
        calendarId: 'primary',
        conferenceDataVersion: 1,
        sendUpdates: 'all', // Send emails and calendar updates to all attendees
        requestBody: {
          summary: input.title,
          description: input.description,
          start: {
            dateTime: input.startTime.toISOString(),
          },
          end: {
            dateTime: input.endTime.toISOString(),
          },
          attendees,
          conferenceData: {
            createRequest: {
              requestId: `taskmaster-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
              conferenceSolutionKey: {
                type: 'hangoutsMeet',
              },
            },
          },
        },
      });

      const event = response.data;
      const googleMeetLink =
        event.hangoutLink ||
        event.conferenceData?.entryPoints?.find((ep) => ep.entryPointType === 'video')?.uri ||
        '';

      logger.info(
        { eventId: event.id, googleMeetLink, htmlLink: event.htmlLink },
        '✅ Google Calendar event and real Google Meet created successfully',
      );

      return {
        googleMeetLink,
        eventId: event.id || undefined,
        htmlLink: event.htmlLink || undefined,
      };
    } catch (err: any) {
      logger.error(
        { err: err?.message || err, responseData: err?.response?.data },
        '❌ Failed to create Google Calendar event',
      );
      return null;
    }
  }
}
