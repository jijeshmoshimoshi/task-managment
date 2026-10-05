import { Request, Response, NextFunction } from 'express';
import { UserModel } from './user.model';
import { InvitationModel } from '../auth/models/invitation.model';
import { SessionService } from '../auth/services/session.service';
import { CryptoService } from '../../common/services/crypto.service';
import { EmailService } from '../../common/services/email.service';
import { AuditService } from '../audit/audit.service';
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
} from '../../common/errors/app-error';
import {
  ROLES,
  USER_STATUSES,
  AUDIT_ACTIONS,
} from '@taskmaster/shared';

export class UserController {
  /**
   * List users in organization with search, filters, and pagination.
   */
  public async listUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();

      const {
        search,
        role,
        status,
        departmentId,
        teamId,
        page = '1',
        limit = '50',
      } = req.query;

      const filter: Record<string, any> = {
        organizationId: req.user.organizationId,
        isDeleted: false,
      };

      if (role) filter.role = role;
      if (status) filter.status = status;
      if (departmentId) filter.departmentId = departmentId;
      if (teamId) filter.teamIds = teamId;

      if (search && typeof search === 'string') {
        const searchRegex = new RegExp(search.trim(), 'i');
        filter.$or = [
          { firstName: searchRegex },
          { lastName: searchRegex },
          { email: searchRegex },
          { jobTitle: searchRegex },
        ];
      }

      const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 50));
      const skip = (pageNum - 1) * limitNum;

      const [users, total] = await Promise.all([
        UserModel.find(filter)
          .populate('departmentId', 'name')
          .populate('teamIds', 'name')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .lean(),
        UserModel.countDocuments(filter),
      ]);

      const transformed = users.map((u) => ({
        id: u._id.toString(),
        organizationId: u.organizationId.toString(),
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role,
        status: u.status,
        avatarUrl: u.avatarUrl,
        jobTitle: u.jobTitle,
        phone: u.phone,
        timezone: u.timezone,
        isTwoFactorEnabled: u.isTwoFactorEnabled,
        departmentId: u.departmentId ? (u.departmentId as any)._id?.toString() || (u.departmentId as any).toString() : undefined,
        department: u.departmentId,
        teamIds: (u.teamIds || []).map((t: any) => t._id?.toString() || t.toString()),
        teams: u.teamIds || [],
        lastLoginAt: u.lastLoginAt,
        createdAt: (u as any).createdAt,
        updatedAt: (u as any).updatedAt,
      }));

      res.status(200).json({
        success: true,
        data: transformed,
        meta: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get single user by ID.
   */
  public async getUserById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();

      const user = await UserModel.findOne({
        _id: req.params.id,
        organizationId: req.user.organizationId,
        isDeleted: false,
      })
        .populate('departmentId', 'name')
        .populate('teamIds', 'name');

      if (!user) throw new NotFoundError('User', req.params.id);

      res.status(200).json({
        success: true,
        data: user.toJSON(),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Invite new user to organization.
   */
  public async inviteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { email, firstName, lastName, role, departmentId, teamIds } = req.body;

      // Admins cannot invite Super Admins
      if (req.user.role === ROLES.ADMIN && role === ROLES.SUPER_ADMIN) {
        throw new ForbiddenError('Admins cannot invite Super Admins');
      }

      // Check if user is already an active member in this organization
      const existingUser = await UserModel.findOne({
        email: email.toLowerCase(),
        organizationId: req.user.organizationId,
        isDeleted: false,
      });

      if (existingUser) {
        throw new ConflictError(`User with email '${email}' is already a member of this organization`);
      }

      // Generate secure 32-byte invitation token
      const rawToken = CryptoService.generateRandomToken(32);
      const tokenHash = CryptoService.hashToken(rawToken);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      // Invalidate any previous pending invites for this email
      await InvitationModel.deleteMany({
        organizationId: req.user.organizationId,
        email: email.toLowerCase(),
        acceptedAt: null,
      });

      const invitation = await InvitationModel.create({
        organizationId: req.user.organizationId,
        email: email.toLowerCase(),
        firstName,
        lastName,
        role,
        departmentId: departmentId || undefined,
        teamIds: teamIds || [],
        tokenHash,
        expiresAt,
        invitedBy: req.user.id,
      });

      // Send email via Nodemailer/Resend
      await EmailService.sendInvitationEmail(
        email,
        rawToken,
        `${req.user.firstName} ${req.user.lastName}`,
        'TaskMaster Workspace',
      );

      AuditService.log({
        organizationId: req.user.organizationId,
        actorId: req.user.id,
        actorEmail: req.user.email,
        actorName: `${req.user.firstName} ${req.user.lastName}`,
        action: AUDIT_ACTIONS.USER_INVITED,
        resourceType: 'user',
        resourceTitle: `Invited ${firstName} ${lastName} (${email}) as ${role}`,
        ipAddress: (req.ip || req.socket.remoteAddress || '0.0.0.0').toString(),
        userAgent: (req.get('user-agent') || 'Unknown').toString(),
      });

      res.status(201).json({
        success: true,
        data: {
          id: invitation._id.toString(),
          email: invitation.email,
          role: invitation.role,
          expiresAt: invitation.expiresAt,
          message: `Invitation successfully sent to ${email}`,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update user profile / roles / departments / teams.
   */
  public async updateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { id } = req.params;
      const { firstName, lastName, jobTitle, phone, timezone, avatarUrl, departmentId, teamIds } = req.body;

      const targetUser = await UserModel.findOne({
        _id: id,
        organizationId: req.user.organizationId,
        isDeleted: false,
      });

      if (!targetUser) throw new NotFoundError('User', id);

      // Admin restrictions: Cannot edit Super Admin or another Admin
      if (req.user.role === ROLES.ADMIN) {
        if (targetUser.role === ROLES.SUPER_ADMIN || (targetUser.role === ROLES.ADMIN && targetUser._id.toString() !== req.user.id)) {
          throw new ForbiddenError('Admins cannot modify other administrators or Super Admins');
        }
      }

      const before = targetUser.toJSON();

      if (firstName) targetUser.firstName = firstName;
      if (lastName) targetUser.lastName = lastName;
      if (jobTitle !== undefined) targetUser.jobTitle = jobTitle;
      if (phone !== undefined) targetUser.phone = phone;
      if (timezone !== undefined) targetUser.timezone = timezone;
      if (avatarUrl !== undefined) targetUser.avatarUrl = avatarUrl;
      if (departmentId !== undefined) targetUser.departmentId = departmentId || undefined;
      if (teamIds !== undefined) targetUser.teamIds = teamIds;

      await targetUser.save();

      AuditService.log({
        organizationId: req.user.organizationId,
        actorId: req.user.id,
        actorEmail: req.user.email,
        actorName: `${req.user.firstName} ${req.user.lastName}`,
        action: AUDIT_ACTIONS.USER_UPDATED,
        resourceType: 'user',
        resourceId: targetUser._id.toString(),
        resourceTitle: `Updated profile for ${targetUser.firstName} ${targetUser.lastName}`,
        before,
        after: targetUser.toJSON(),
        ipAddress: (req.ip || req.socket.remoteAddress || '0.0.0.0').toString(),
        userAgent: (req.get('user-agent') || 'Unknown').toString(),
      });

      res.status(200).json({
        success: true,
        data: targetUser.toJSON(),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update user role (Super Admin only).
   */
  public async updateUserRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { id } = req.params;
      const { role } = req.body;

      const targetUser = await UserModel.findOne({
        _id: id,
        organizationId: req.user.organizationId,
        isDeleted: false,
      });

      if (!targetUser) throw new NotFoundError('User', id);

      // Enforce at least one Super Admin rule
      if (targetUser.role === ROLES.SUPER_ADMIN && role !== ROLES.SUPER_ADMIN) {
        const superAdminCount = await UserModel.countDocuments({
          organizationId: req.user.organizationId,
          role: ROLES.SUPER_ADMIN,
          status: USER_STATUSES.ACTIVE,
          isDeleted: false,
        });

        if (superAdminCount <= 1) {
          throw new BadRequestError('Cannot demote the last active Super Admin in the organization');
        }
      }

      const beforeRole = targetUser.role;
      targetUser.role = role;
      await targetUser.save();

      // Revoke sessions so new JWT with updated role is issued
      await SessionService.revokeAllUserSessions(
        targetUser._id.toString(),
        req.user.organizationId,
        `Role changed from ${beforeRole} to ${role}`,
      );

      AuditService.log({
        organizationId: req.user.organizationId,
        actorId: req.user.id,
        actorEmail: req.user.email,
        actorName: `${req.user.firstName} ${req.user.lastName}`,
        action: AUDIT_ACTIONS.ROLE_CHANGED,
        resourceType: 'user',
        resourceId: targetUser._id.toString(),
        resourceTitle: `Changed role of ${targetUser.firstName} ${targetUser.lastName} to ${role}`,
        before: { role: beforeRole },
        after: { role },
        ipAddress: (req.ip || req.socket.remoteAddress || '0.0.0.0').toString(),
        userAgent: (req.get('user-agent') || 'Unknown').toString(),
      });

      res.status(200).json({
        success: true,
        data: targetUser.toJSON(),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update user status (Active, Suspended, Deactivated).
   */
  public async updateUserStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { id } = req.params;
      const { status } = req.body;

      const targetUser = await UserModel.findOne({
        _id: id,
        organizationId: req.user.organizationId,
        isDeleted: false,
      });

      if (!targetUser) throw new NotFoundError('User', id);

      // Prevent disabling the last Super Admin
      if (targetUser.role === ROLES.SUPER_ADMIN && status !== USER_STATUSES.ACTIVE) {
        const superAdminCount = await UserModel.countDocuments({
          organizationId: req.user.organizationId,
          role: ROLES.SUPER_ADMIN,
          status: USER_STATUSES.ACTIVE,
          isDeleted: false,
          _id: { $ne: targetUser._id },
        });

        if (superAdminCount === 0) {
          throw new BadRequestError('Cannot suspend or deactivate the last active Super Admin');
        }
      }

      // Admin restrictions
      if (req.user.role === ROLES.ADMIN && targetUser.role !== ROLES.USER) {
        throw new ForbiddenError('Admins can only change the status of standard users');
      }

      const beforeStatus = targetUser.status;
      targetUser.status = status;
      await targetUser.save();

      // If suspended or deactivated, immediately revoke all active sessions
      if (status === USER_STATUSES.SUSPENDED || status === USER_STATUSES.DEACTIVATED) {
        await SessionService.revokeAllUserSessions(
          targetUser._id.toString(),
          req.user.organizationId,
          `Account status changed to ${status}`,
        );
      }

      AuditService.log({
        organizationId: req.user.organizationId,
        actorId: req.user.id,
        actorEmail: req.user.email,
        actorName: `${req.user.firstName} ${req.user.lastName}`,
        action: status === USER_STATUSES.SUSPENDED ? AUDIT_ACTIONS.USER_SUSPENDED : AUDIT_ACTIONS.USER_UPDATED,
        resourceType: 'user',
        resourceId: targetUser._id.toString(),
        resourceTitle: `Changed status of ${targetUser.firstName} ${targetUser.lastName} to ${status}`,
        before: { status: beforeStatus },
        after: { status },
        ipAddress: (req.ip || req.socket.remoteAddress || '0.0.0.0').toString(),
        userAgent: (req.get('user-agent') || 'Unknown').toString(),
      });

      res.status(200).json({
        success: true,
        data: targetUser.toJSON(),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Force logout (revoke all active sessions for user).
   */
  public async forceLogout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { id } = req.params;

      const targetUser = await UserModel.findOne({
        _id: id,
        organizationId: req.user.organizationId,
        isDeleted: false,
      });

      if (!targetUser) throw new NotFoundError('User', id);

      if (req.user.role === ROLES.ADMIN && targetUser.role === ROLES.SUPER_ADMIN) {
        throw new ForbiddenError('Admins cannot force logout Super Admins');
      }

      await SessionService.revokeAllUserSessions(
        targetUser._id.toString(),
        req.user.organizationId,
        `Forced logout by ${req.user.role} (${req.user.email})`,
      );

      AuditService.log({
        organizationId: req.user.organizationId,
        actorId: req.user.id,
        actorEmail: req.user.email,
        actorName: `${req.user.firstName} ${req.user.lastName}`,
        action: AUDIT_ACTIONS.FORCE_LOGOUT,
        resourceType: 'user',
        resourceId: targetUser._id.toString(),
        resourceTitle: `Forced logout for ${targetUser.firstName} ${targetUser.lastName}`,
        ipAddress: (req.ip || req.socket.remoteAddress || '0.0.0.0').toString(),
        userAgent: (req.get('user-agent') || 'Unknown').toString(),
      });

      res.status(200).json({
        success: true,
        data: { message: `All active sessions for ${targetUser.firstName} ${targetUser.lastName} have been revoked.` },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Soft delete user.
   */
  public async deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { id } = req.params;

      const targetUser = await UserModel.findOne({
        _id: id,
        organizationId: req.user.organizationId,
        isDeleted: false,
      });

      if (!targetUser) throw new NotFoundError('User', id);

      // Cannot delete last Super Admin
      if (targetUser.role === ROLES.SUPER_ADMIN) {
        const superAdminCount = await UserModel.countDocuments({
          organizationId: req.user.organizationId,
          role: ROLES.SUPER_ADMIN,
          status: USER_STATUSES.ACTIVE,
          isDeleted: false,
          _id: { $ne: targetUser._id },
        });

        if (superAdminCount === 0) {
          throw new BadRequestError('Cannot delete the last active Super Admin');
        }
      }

      targetUser.isDeleted = true;
      targetUser.deletedAt = new Date();
      targetUser.status = USER_STATUSES.DEACTIVATED;
      await targetUser.save();

      // Revoke all sessions
      await SessionService.revokeAllUserSessions(
        targetUser._id.toString(),
        req.user.organizationId,
        'User account deleted',
      );

      AuditService.log({
        organizationId: req.user.organizationId,
        actorId: req.user.id,
        actorEmail: req.user.email,
        actorName: `${req.user.firstName} ${req.user.lastName}`,
        action: AUDIT_ACTIONS.USER_DELETED,
        resourceType: 'user',
        resourceId: targetUser._id.toString(),
        resourceTitle: `Deleted user ${targetUser.firstName} ${targetUser.lastName} (${targetUser.email})`,
        ipAddress: (req.ip || req.socket.remoteAddress || '0.0.0.0').toString(),
        userAgent: (req.get('user-agent') || 'Unknown').toString(),
      });

      res.status(200).json({
        success: true,
        data: { message: `User '${targetUser.firstName} ${targetUser.lastName}' has been deleted.` },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update own profile.
   */
  public async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { firstName, lastName, phone, timezone, jobTitle, avatarUrl } = req.body;

      const user = await UserModel.findById(req.user.id);
      if (!user || user.isDeleted) throw new NotFoundError('User');

      if (firstName) user.firstName = firstName;
      if (lastName) user.lastName = lastName;
      if (phone !== undefined) user.phone = phone;
      if (timezone !== undefined) user.timezone = timezone;
      if (jobTitle !== undefined) user.jobTitle = jobTitle;
      if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;

      await user.save();

      res.status(200).json({
        success: true,
        data: user.toJSON(),
      });
    } catch (error) {
      next(error);
    }
  }
}

export const userController = new UserController();
