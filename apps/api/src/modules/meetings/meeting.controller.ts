import { Request, Response, NextFunction } from 'express';
import { MeetingService } from './meeting.service';
import { MeetingStatus } from '@taskmaster/shared';

export class MeetingController {
  public createMeeting = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const meeting = await MeetingService.createMeeting(
        req.user!.id,
        req.organizationId!,
        req.body,
      );
      res.status(201).json({
        success: true,
        data: meeting,
      });
    } catch (error) {
      next(error);
    }
  };

  public getMeetings = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const meetings = await MeetingService.getMeetings(
        req.user!.id,
        req.user!.role,
        req.organizationId!,
      );
      res.json({
        success: true,
        data: meetings,
      });
    } catch (error) {
      next(error);
    }
  };

  public getMeetingById = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const meetingId = req.params.id as string;
      const meeting = await MeetingService.getMeetingById(
        meetingId,
        req.organizationId!,
      );
      res.json({
        success: true,
        data: meeting,
      });
    } catch (error) {
      next(error);
    }
  };

  public updateMeetingStatus = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const meetingId = req.params.id as string;
      const { status } = req.body as { status: MeetingStatus };
      const meeting = await MeetingService.updateMeetingStatus(
        meetingId,
        req.organizationId!,
        status,
      );
      res.json({
        success: true,
        data: meeting,
      });
    } catch (error) {
      next(error);
    }
  };

  public deleteMeeting = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const meetingId = req.params.id as string;
      await MeetingService.deleteMeeting(meetingId, req.organizationId!);
      res.json({
        success: true,
        message: 'Meeting deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  };
}

export const meetingController = new MeetingController();
