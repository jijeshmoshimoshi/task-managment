import nodemailer from 'nodemailer';
import { env } from '../../config/env';
import { logger } from '../../config/logger';

export class EmailService {
  private static transporter: nodemailer.Transporter | null = null;

  private static getTransporter(): nodemailer.Transporter {
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_PORT === 465,
        auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
      });
    }
    return this.transporter;
  }

  /**
   * Sends an invitation email to a new member.
   */
  public static async sendInvitationEmail(
    to: string,
    inviteToken: string,
    orgName: string,
    inviterName: string,
  ): Promise<void> {
    const inviteUrl = `${env.CORS_ORIGIN}/accept-invite?token=${inviteToken}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; rounded: 8px;">
        <h2 style="color: #2563eb;">You're invited to join ${orgName} on TaskMaster</h2>
        <p>Hello,</p>
        <p><strong>${inviterName}</strong> has invited you to join the team workspace at <strong>${orgName}</strong>.</p>
        <p style="margin: 30px 0;">
          <a href="${inviteUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            Accept Invitation & Setup Account
          </a>
        </p>
        <p style="font-size: 12px; color: #6b7280;">This invitation link will expire in 7 days. If you did not expect this invitation, you can ignore this email.</p>
      </div>
    `;

    try {
      await this.getTransporter().sendMail({
        from: env.SMTP_FROM,
        to,
        subject: `Invitation to join ${orgName} on TaskMaster`,
        html,
      });
      logger.info({ to, orgName }, '📧 Invitation email sent successfully');
    } catch (err) {
      logger.error({ err, to }, '❌ Failed to send invitation email');
    }
  }

  /**
   * Sends a password reset email.
   */
  public static async sendPasswordResetEmail(
    to: string,
    resetToken: string,
    firstName: string,
  ): Promise<void> {
    const resetUrl = `${env.CORS_ORIGIN}/reset-password?token=${resetToken}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px;">
        <h2 style="color: #2563eb;">Reset your TaskMaster password</h2>
        <p>Hi ${firstName},</p>
        <p>We received a request to reset the password for your TaskMaster account.</p>
        <p style="margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            Reset Password
          </a>
        </p>
        <p style="font-size: 12px; color: #6b7280;">This link is single-use and will expire in 1 hour. If you did not request a password reset, please change your credentials immediately.</p>
      </div>
    `;

    try {
      await this.getTransporter().sendMail({
        from: env.SMTP_FROM,
        to,
        subject: 'Reset your TaskMaster Password',
        html,
      });
      logger.info({ to }, '📧 Password reset email sent successfully');
    } catch (err) {
      logger.error({ err, to }, '❌ Failed to send password reset email');
    }
  }

  /**
   * Sends meeting details email with calendar invite (.ics) to admin and participants.
   */
  public static async sendMeetingInviteEmail(params: {
    recipients: string[];
    title: string;
    description?: string;
    startTime: Date;
    endTime: Date;
    organizerName: string;
    organizerEmail: string;
    googleMeetLink: string;
    googleCalendarUrl?: string;
  }): Promise<void> {
    const {
      recipients,
      title,
      description,
      startTime,
      endTime,
      organizerName,
      organizerEmail,
      googleMeetLink,
      googleCalendarUrl,
    } = params;

    const formattedStart = new Date(startTime).toLocaleString('en-US', {
      dateStyle: 'full',
      timeStyle: 'short',
    });
    const formattedEnd = new Date(endTime).toLocaleTimeString('en-US', {
      timeStyle: 'short',
    });

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #1e293b; margin-bottom: 8px;">📅 New Meeting Scheduled</h2>
          <p style="color: #64748b; font-size: 14px; margin: 0;">You have been invited to a meeting on TaskMaster</p>
        </div>

        <div style="background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 16px; border-radius: 6px; margin-bottom: 24px;">
          <h3 style="margin: 0 0 8px 0; color: #0f172a;">${title}</h3>
          ${description ? `<p style="margin: 0 0 12px 0; color: #475569; font-size: 14px;">${description}</p>` : ''}
          <p style="margin: 4px 0; color: #334155; font-size: 14px;"><strong>🕒 Date & Time:</strong> ${formattedStart} - ${formattedEnd}</p>
          <p style="margin: 4px 0; color: #334155; font-size: 14px;"><strong>🛡️ Organizer:</strong> ${organizerName} (${organizerEmail})</p>
        </div>

        <div style="text-align: center; margin: 32px 0;">
          <a href="${googleMeetLink}" style="background-color: #2563eb; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);">
            🎥 Join Google Meet
          </a>
        </div>

        ${
          googleCalendarUrl
            ? `
        <div style="text-align: center; margin-bottom: 24px;">
          <a href="${googleCalendarUrl}" target="_blank" style="color: #2563eb; font-size: 14px; text-decoration: underline;">
            + Add to Google Calendar web manually
          </a>
        </div>
        `
            : ''
        }

        <p style="font-size: 12px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 16px;">
          An iCalendar (.ics) event is attached to this email so it can be added to your calendar automatically.
        </p>
      </div>
    `;

    try {
      const icalGenerator = (await import('ical-generator')).default;
      const { ICalCalendarMethod, ICalAttendeeStatus, ICalAttendeeRole } = await import('ical-generator');

      const cal = icalGenerator({ name: 'TaskMaster Meeting' });
      cal.method(ICalCalendarMethod.REQUEST);

      const attendees = recipients.map((email) => ({
        email,
        rsvp: true,
        status: ICalAttendeeStatus.ACCEPTED,
        role: ICalAttendeeRole.REQ,
      }));

      cal.createEvent({
        start: new Date(startTime),
        end: new Date(endTime),
        summary: title,
        description: `${description || ''}\n\nJoin Google Meet: ${googleMeetLink}`,
        location: googleMeetLink,
        url: googleMeetLink,
        organizer: {
          name: organizerName,
          email: organizerEmail,
        },
        attendees,
      });

      const icsString = cal.toString();

      await this.getTransporter().sendMail({
        from: env.SMTP_FROM,
        to: recipients.join(','),
        subject: `📅 Meeting Invitation: ${title}`,
        html,
        icalEvent: {
          filename: 'invite.ics',
          method: 'REQUEST',
          content: icsString,
        },
      });

      logger.info({ recipients, title }, '📧 Meeting invite email with .ics calendar sent successfully');
    } catch (err: any) {
      logger.error({ err: err?.stack || err?.message || err, recipients }, '❌ Failed to send meeting invite email');
    }
  }
}
