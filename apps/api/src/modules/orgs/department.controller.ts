import { Request, Response, NextFunction } from 'express';
import { DepartmentModel } from './department.model';
import { UserModel } from '../users/user.model';
import { TeamModel } from './team.model';
import { AuditService } from '../audit/audit.service';
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
  ConflictError,
} from '../../common/errors/app-error';
import { AUDIT_ACTIONS } from '@taskmaster/shared';

export class DepartmentController {
  public async listDepartments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();

      const departments = await DepartmentModel.find({
        organizationId: req.user.organizationId,
        isDeleted: false,
      })
        .populate('leadId', 'firstName lastName email avatarUrl jobTitle')
        .sort({ name: 1 })
        .lean();

      // Attach member counts and team counts to each department
      const enriched = await Promise.all(
        departments.map(async (dept) => {
          const [userCount, teamCount] = await Promise.all([
            UserModel.countDocuments({
              organizationId: req.user!.organizationId,
              departmentId: dept._id,
              isDeleted: false,
            }),
            TeamModel.countDocuments({
              organizationId: req.user!.organizationId,
              departmentId: dept._id,
              isDeleted: false,
            }),
          ]);

          return {
            id: dept._id.toString(),
            organizationId: dept.organizationId.toString(),
            name: dept.name,
            description: dept.description,
            lead: dept.leadId,
            leadId: dept.leadId ? (dept.leadId as any)._id?.toString() || (dept.leadId as any).toString() : undefined,
            userCount,
            teamCount,
            createdAt: (dept as any).createdAt,
            updatedAt: (dept as any).updatedAt,
          };
        }),
      );

      res.status(200).json({
        success: true,
        data: enriched,
      });
    } catch (error) {
      next(error);
    }
  }

  public async getDepartmentById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();

      const dept = await DepartmentModel.findOne({
        _id: req.params.id,
        organizationId: req.user.organizationId,
        isDeleted: false,
      }).populate('leadId', 'firstName lastName email avatarUrl jobTitle');

      if (!dept) throw new NotFoundError('Department', req.params.id);

      res.status(200).json({
        success: true,
        data: dept.toJSON(),
      });
    } catch (error) {
      next(error);
    }
  }

  public async createDepartment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { name, description, leadId } = req.body;

      // Check unique department name in org
      const existing = await DepartmentModel.findOne({
        organizationId: req.user.organizationId,
        name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
        isDeleted: false,
      });

      if (existing) {
        throw new ConflictError(`Department with name '${name}' already exists in your organization`);
      }

      if (leadId) {
        const leadUser = await UserModel.findOne({
          _id: leadId,
          organizationId: req.user.organizationId,
          isDeleted: false,
        });
        if (!leadUser) throw new BadRequestError('Specified lead user does not exist in this organization');
      }

      const dept = await DepartmentModel.create({
        organizationId: req.user.organizationId,
        name: name.trim(),
        description: description?.trim() || '',
        leadId: leadId || undefined,
      });

      AuditService.log({
        organizationId: req.user.organizationId,
        actorId: req.user.id,
        actorEmail: req.user.email,
        actorName: `${req.user.firstName} ${req.user.lastName}`,
        action: AUDIT_ACTIONS.DEPARTMENT_CREATED,
        resourceType: 'department',
        resourceId: dept._id.toString(),
        resourceTitle: `Created department '${dept.name}'`,
        after: dept.toJSON(),
        ipAddress: (req.ip || req.socket.remoteAddress || '0.0.0.0').toString(),
        userAgent: (req.get('user-agent') || 'Unknown').toString(),
      });

      res.status(201).json({
        success: true,
        data: dept.toJSON(),
      });
    } catch (error) {
      next(error);
    }
  }

  public async updateDepartment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { id } = req.params;
      const { name, description, leadId } = req.body;

      const dept = await DepartmentModel.findOne({
        _id: id,
        organizationId: req.user.organizationId,
        isDeleted: false,
      });

      if (!dept) throw new NotFoundError('Department', id);

      if (name && name.trim() !== dept.name) {
        const existing = await DepartmentModel.findOne({
          _id: { $ne: id },
          organizationId: req.user.organizationId,
          name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
          isDeleted: false,
        });
        if (existing) {
          throw new ConflictError(`Department with name '${name}' already exists`);
        }
        dept.name = name.trim();
      }

      if (description !== undefined) {
        dept.description = description?.trim() || '';
      }

      if (leadId !== undefined) {
        if (leadId) {
          const leadUser = await UserModel.findOne({
            _id: leadId,
            organizationId: req.user.organizationId,
            isDeleted: false,
          });
          if (!leadUser) throw new BadRequestError('Specified lead user does not exist');
          dept.leadId = leadId;
        } else {
          dept.leadId = undefined;
        }
      }

      const before = dept.toJSON();
      await dept.save();

      AuditService.log({
        organizationId: req.user.organizationId,
        actorId: req.user.id,
        actorEmail: req.user.email,
        actorName: `${req.user.firstName} ${req.user.lastName}`,
        action: AUDIT_ACTIONS.DEPARTMENT_UPDATED,
        resourceType: 'department',
        resourceId: dept._id.toString(),
        resourceTitle: `Updated department '${dept.name}'`,
        before,
        after: dept.toJSON(),
        ipAddress: (req.ip || req.socket.remoteAddress || '0.0.0.0').toString(),
        userAgent: (req.get('user-agent') || 'Unknown').toString(),
      });

      res.status(200).json({
        success: true,
        data: dept.toJSON(),
      });
    } catch (error) {
      next(error);
    }
  }

  public async deleteDepartment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { id } = req.params;

      const dept = await DepartmentModel.findOne({
        _id: id,
        organizationId: req.user.organizationId,
        isDeleted: false,
      });

      if (!dept) throw new NotFoundError('Department', id);

      dept.isDeleted = true;
      dept.deletedAt = new Date();
      await dept.save();

      // Unlink users and teams from this deleted department
      await Promise.all([
        UserModel.updateMany(
          { organizationId: req.user.organizationId, departmentId: dept._id },
          { $unset: { departmentId: 1 } },
        ),
        TeamModel.updateMany(
          { organizationId: req.user.organizationId, departmentId: dept._id },
          { $unset: { departmentId: 1 } },
        ),
      ]);

      AuditService.log({
        organizationId: req.user.organizationId,
        actorId: req.user.id,
        actorEmail: req.user.email,
        actorName: `${req.user.firstName} ${req.user.lastName}`,
        action: AUDIT_ACTIONS.DEPARTMENT_DELETED,
        resourceType: 'department',
        resourceId: dept._id.toString(),
        resourceTitle: `Deleted department '${dept.name}'`,
        ipAddress: (req.ip || req.socket.remoteAddress || '0.0.0.0').toString(),
        userAgent: (req.get('user-agent') || 'Unknown').toString(),
      });

      res.status(200).json({
        success: true,
        data: { message: `Department '${dept.name}' deleted successfully.` },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const departmentController = new DepartmentController();
