import { Request, Response, NextFunction } from 'express';
import { OrganizationModel } from './org.model';
import { UserModel } from '../users/user.model';
import { DepartmentModel } from './department.model';
import { TeamModel } from './team.model';
import { AuditService } from '../audit/audit.service';
import { NotFoundError, UnauthorizedError } from '../../common/errors/app-error';
import { AUDIT_ACTIONS } from '@taskmaster/shared';

export class OrgController {
  public async getOrganization(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();

      const org = await OrganizationModel.findById(req.user.organizationId);
      if (!org) throw new NotFoundError('Organization');

      // Aggregate department, team, and user counts for summary cards
      const [userCount, departmentCount, teamCount] = await Promise.all([
        UserModel.countDocuments({ organizationId: org._id, isDeleted: false }),
        DepartmentModel.countDocuments({ organizationId: org._id, isDeleted: false }),
        TeamModel.countDocuments({ organizationId: org._id, isDeleted: false }),
      ]);

      res.status(200).json({
        success: true,
        data: {
          organization: org.toJSON(),
          stats: {
            totalUsers: userCount,
            totalDepartments: departmentCount,
            totalTeams: teamCount,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  public async updateBranding(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();

      const org = await OrganizationModel.findById(req.user.organizationId);
      if (!org) throw new NotFoundError('Organization');

      const before = { branding: { ...org.branding } };
      org.branding = {
        ...org.branding,
        ...req.body,
      };

      if (req.body.companyName) {
        org.name = req.body.companyName;
      }

      await org.save();

      AuditService.log({
        organizationId: req.user.organizationId,
        actorId: req.user.id,
        actorEmail: req.user.email,
        actorName: `${req.user.firstName} ${req.user.lastName}`,
        action: AUDIT_ACTIONS.ORGANIZATION_UPDATED,
        resourceType: 'organization',
        resourceId: org._id.toString(),
        resourceTitle: `Updated branding for ${org.name}`,
        before,
        after: { branding: org.branding },
        ipAddress: (req.ip || req.socket.remoteAddress || '0.0.0.0').toString(),
        userAgent: (req.get('user-agent') || 'Unknown').toString(),
      });

      res.status(200).json({
        success: true,
        data: {
          organization: org.toJSON(),
          message: 'Organization branding updated successfully.',
        },
      });
    } catch (error) {
      next(error);
    }
  }

  public async updateSecurityPolicy(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();

      const org = await OrganizationModel.findById(req.user.organizationId);
      if (!org) throw new NotFoundError('Organization');

      const before = { securityPolicy: { ...org.securityPolicy } };
      org.securityPolicy = {
        ...org.securityPolicy,
        ...req.body,
      };

      await org.save();

      AuditService.log({
        organizationId: req.user.organizationId,
        actorId: req.user.id,
        actorEmail: req.user.email,
        actorName: `${req.user.firstName} ${req.user.lastName}`,
        action: AUDIT_ACTIONS.SECURITY_POLICY_UPDATED,
        resourceType: 'organization',
        resourceId: org._id.toString(),
        resourceTitle: `Updated security policies for ${org.name}`,
        before,
        after: { securityPolicy: org.securityPolicy },
        ipAddress: (req.ip || req.socket.remoteAddress || '0.0.0.0').toString(),
        userAgent: (req.get('user-agent') || 'Unknown').toString(),
      });

      res.status(200).json({
        success: true,
        data: {
          organization: org.toJSON(),
          message: 'Security policy settings updated successfully.',
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const orgController = new OrgController();
