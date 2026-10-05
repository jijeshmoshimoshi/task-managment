import { Request, Response, NextFunction } from 'express';
import { TeamModel } from './team.model';
import { UserModel } from '../users/user.model';
import { DepartmentModel } from './department.model';
import { AuditService } from '../audit/audit.service';
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
  ConflictError,
} from '../../common/errors/app-error';
import { AUDIT_ACTIONS } from '@taskmaster/shared';

export class TeamController {
  public async listTeams(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { departmentId } = req.query;

      const filter: Record<string, any> = {
        organizationId: req.user.organizationId,
        isDeleted: false,
      };

      if (departmentId) {
        filter.departmentId = departmentId;
      }

      const teams = await TeamModel.find(filter)
        .populate('leadId', 'firstName lastName email avatarUrl jobTitle')
        .populate('departmentId', 'name')
        .populate('memberIds', 'firstName lastName email avatarUrl jobTitle role')
        .sort({ name: 1 })
        .lean();

      const transformed = teams.map((team) => ({
        id: team._id.toString(),
        organizationId: team.organizationId.toString(),
        name: team.name,
        description: team.description,
        departmentId: team.departmentId ? (team.departmentId as any)._id?.toString() || (team.departmentId as any).toString() : undefined,
        department: team.departmentId,
        leadId: team.leadId ? (team.leadId as any)._id?.toString() || (team.leadId as any).toString() : undefined,
        lead: team.leadId,
        memberIds: (team.memberIds || []).map((m: any) => m._id?.toString() || m.toString()),
        members: team.memberIds || [],
        memberCount: (team.memberIds || []).length,
        createdAt: (team as any).createdAt,
        updatedAt: (team as any).updatedAt,
      }));

      res.status(200).json({
        success: true,
        data: transformed,
      });
    } catch (error) {
      next(error);
    }
  }

  public async getTeamById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();

      const team = await TeamModel.findOne({
        _id: req.params.id,
        organizationId: req.user.organizationId,
        isDeleted: false,
      })
        .populate('leadId', 'firstName lastName email avatarUrl jobTitle')
        .populate('departmentId', 'name')
        .populate('memberIds', 'firstName lastName email avatarUrl jobTitle role');

      if (!team) throw new NotFoundError('Team', req.params.id);

      res.status(200).json({
        success: true,
        data: team.toJSON(),
      });
    } catch (error) {
      next(error);
    }
  }

  public async createTeam(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { name, description, departmentId, leadId, memberIds } = req.body;

      // Unique team name within organization
      const existing = await TeamModel.findOne({
        organizationId: req.user.organizationId,
        name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
        isDeleted: false,
      });

      if (existing) {
        throw new ConflictError(`Team with name '${name}' already exists in your organization`);
      }

      if (departmentId) {
        const dept = await DepartmentModel.findOne({
          _id: departmentId,
          organizationId: req.user.organizationId,
          isDeleted: false,
        });
        if (!dept) throw new BadRequestError('Specified department does not exist');
      }

      if (leadId) {
        const leadUser = await UserModel.findOne({
          _id: leadId,
          organizationId: req.user.organizationId,
          isDeleted: false,
        });
        if (!leadUser) throw new BadRequestError('Specified lead user does not exist');
      }

      const team = await TeamModel.create({
        organizationId: req.user.organizationId,
        name: name.trim(),
        description: description?.trim() || '',
        departmentId: departmentId || undefined,
        leadId: leadId || undefined,
        memberIds: memberIds || [],
      });

      // Synchronize teamIds array in UserModel for each assigned member
      if (memberIds && memberIds.length > 0) {
        await UserModel.updateMany(
          { _id: { $in: memberIds }, organizationId: req.user.organizationId },
          { $addToSet: { teamIds: team._id } },
        );
      }

      AuditService.log({
        organizationId: req.user.organizationId,
        actorId: req.user.id,
        actorEmail: req.user.email,
        actorName: `${req.user.firstName} ${req.user.lastName}`,
        action: AUDIT_ACTIONS.TEAM_CREATED,
        resourceType: 'team',
        resourceId: team._id.toString(),
        resourceTitle: `Created team '${team.name}'`,
        after: team.toJSON(),
        ipAddress: (req.ip || req.socket.remoteAddress || '0.0.0.0').toString(),
        userAgent: (req.get('user-agent') || 'Unknown').toString(),
      });

      res.status(201).json({
        success: true,
        data: team.toJSON(),
      });
    } catch (error) {
      next(error);
    }
  }

  public async updateTeam(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { id } = req.params;
      const { name, description, departmentId, leadId, memberIds } = req.body;

      const team = await TeamModel.findOne({
        _id: id,
        organizationId: req.user.organizationId,
        isDeleted: false,
      });

      if (!team) throw new NotFoundError('Team', id);

      if (name && name.trim() !== team.name) {
        const existing = await TeamModel.findOne({
          _id: { $ne: id },
          organizationId: req.user.organizationId,
          name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
          isDeleted: false,
        });
        if (existing) {
          throw new ConflictError(`Team with name '${name}' already exists`);
        }
        team.name = name.trim();
      }

      if (description !== undefined) team.description = description?.trim() || '';
      if (departmentId !== undefined) team.departmentId = departmentId || undefined;
      if (leadId !== undefined) team.leadId = leadId || undefined;

      if (memberIds !== undefined) {
        const previousMemberIds = team.memberIds.map((m) => m.toString());
        team.memberIds = memberIds;

        // Sync UserModel teamIds
        const removed = previousMemberIds.filter((mid) => !memberIds.includes(mid));
        const added = memberIds.filter((mid: string) => !previousMemberIds.includes(mid));

        if (removed.length > 0) {
          await UserModel.updateMany(
            { _id: { $in: removed } },
            { $pull: { teamIds: team._id } },
          );
        }
        if (added.length > 0) {
          await UserModel.updateMany(
            { _id: { $in: added } },
            { $addToSet: { teamIds: team._id } },
          );
        }
      }

      const before = team.toJSON();
      await team.save();

      AuditService.log({
        organizationId: req.user.organizationId,
        actorId: req.user.id,
        actorEmail: req.user.email,
        actorName: `${req.user.firstName} ${req.user.lastName}`,
        action: AUDIT_ACTIONS.TEAM_UPDATED,
        resourceType: 'team',
        resourceId: team._id.toString(),
        resourceTitle: `Updated team '${team.name}'`,
        before,
        after: team.toJSON(),
        ipAddress: (req.ip || req.socket.remoteAddress || '0.0.0.0').toString(),
        userAgent: (req.get('user-agent') || 'Unknown').toString(),
      });

      res.status(200).json({
        success: true,
        data: team.toJSON(),
      });
    } catch (error) {
      next(error);
    }
  }

  public async deleteTeam(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { id } = req.params;

      const team = await TeamModel.findOne({
        _id: id,
        organizationId: req.user.organizationId,
        isDeleted: false,
      });

      if (!team) throw new NotFoundError('Team', id);

      team.isDeleted = true;
      team.deletedAt = new Date();
      await team.save();

      // Remove team reference from users
      await UserModel.updateMany(
        { organizationId: req.user.organizationId, teamIds: team._id },
        { $pull: { teamIds: team._id } },
      );

      AuditService.log({
        organizationId: req.user.organizationId,
        actorId: req.user.id,
        actorEmail: req.user.email,
        actorName: `${req.user.firstName} ${req.user.lastName}`,
        action: AUDIT_ACTIONS.TEAM_DELETED,
        resourceType: 'team',
        resourceId: team._id.toString(),
        resourceTitle: `Deleted team '${team.name}'`,
        ipAddress: (req.ip || req.socket.remoteAddress || '0.0.0.0').toString(),
        userAgent: (req.get('user-agent') || 'Unknown').toString(),
      });

      res.status(200).json({
        success: true,
        data: { message: `Team '${team.name}' deleted successfully.` },
      });
    } catch (error) {
      next(error);
    }
  }

  public async addMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { id } = req.params;
      const { userId } = req.body;

      const [team, userToAdd] = await Promise.all([
        TeamModel.findOne({ _id: id, organizationId: req.user.organizationId, isDeleted: false }),
        UserModel.findOne({ _id: userId, organizationId: req.user.organizationId, isDeleted: false }),
      ]);

      if (!team) throw new NotFoundError('Team', id);
      if (!userToAdd) throw new NotFoundError('User', userId);

      await Promise.all([
        TeamModel.updateOne({ _id: id }, { $addToSet: { memberIds: userToAdd._id } }),
        UserModel.updateOne({ _id: userId }, { $addToSet: { teamIds: team._id } }),
      ]);

      res.status(200).json({
        success: true,
        data: { message: `${userToAdd.firstName} ${userToAdd.lastName} added to team '${team.name}'` },
      });
    } catch (error) {
      next(error);
    }
  }

  public async removeMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { id, userId } = req.params;

      const team = await TeamModel.findOne({ _id: id, organizationId: req.user.organizationId, isDeleted: false });
      if (!team) throw new NotFoundError('Team', id);

      await Promise.all([
        TeamModel.updateOne({ _id: id }, { $pull: { memberIds: userId } }),
        UserModel.updateOne({ _id: userId }, { $pull: { teamIds: team._id } }),
      ]);

      res.status(200).json({
        success: true,
        data: { message: `Member removed from team '${team.name}'` },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const teamController = new TeamController();
