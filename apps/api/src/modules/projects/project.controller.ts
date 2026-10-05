import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import {
  ROLES,
  PROJECT_ROLES,
  PROJECT_STATUSES,
  PROJECT_HEALTH,
  AUDIT_ACTIONS,
  CreateProjectSchema,
  UpdateProjectSchema,
  AddProjectMemberSchema,
  CreateMilestoneSchema,
  UpdateMilestoneSchema,
  DuplicateProjectSchema,
} from '@taskmaster/shared';
import { ProjectModel } from './project.model';
import { UserModel } from '../users/user.model';
import { AuditService } from '../audit/audit.service';
import {
  NotFoundError,
  ForbiddenError,
  ConflictError,
  BadRequestError,
} from '../../common/errors/app-error';

export class ProjectController {
  /**
   * Helper to check if a user is authorized to manage a project
   */
  private static canManageProject(req: Request, project: any): boolean {
    const user = req.user!;
    if (user.role === ROLES.SUPER_ADMIN || user.role === ROLES.ADMIN) {
      return true;
    }
    const member = project.members?.find(
      (m: any) =>
        (m.userId?._id?.toString() || m.userId?.toString()) === user.id.toString(),
    );
    return member?.role === PROJECT_ROLES.MANAGER;
  }

  /**
   * Helper to check if a user is a member of a project
   */
  private static isProjectMember(req: Request, project: any): boolean {
    const user = req.user!;
    if (user.role === ROLES.SUPER_ADMIN || user.role === ROLES.ADMIN) {
      return true;
    }
    return project.members?.some(
      (m: any) =>
        (m.userId?._id?.toString() || m.userId?.toString()) === user.id.toString(),
    );
  }

  /**
   * POST /api/v1/projects - Create a new project
   */
  public static async createProject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const data = CreateProjectSchema.parse(req.body);

      // Verify unique project key within the organisation
      const existingKey = await ProjectModel.findOne({
        organizationId: new Types.ObjectId(user.organizationId),
        key: data.key.toUpperCase(),
        isDeleted: false,
      });

      if (existingKey) {
        throw new ConflictError(`Project with key "${data.key.toUpperCase()}" already exists`);
      }

      // Automatically add creator as MANAGER
      const members = [
        {
          userId: new Types.ObjectId(user.id),
          role: PROJECT_ROLES.MANAGER,
          joinedAt: new Date(),
        },
      ];

      const project = await ProjectModel.create({
        ...data,
        key: data.key.toUpperCase(),
        organizationId: new Types.ObjectId(user.organizationId),
        createdBy: new Types.ObjectId(user.id),
        updatedBy: new Types.ObjectId(user.id),
        members,
        milestones: [],
      });

      await AuditService.log({
        organizationId: user.organizationId,
        actorId: user.id,
        actorEmail: user.email,
        actorName: `${user.firstName} ${user.lastName}`,
        action: AUDIT_ACTIONS.PROJECT_CREATED,
        resourceType: 'project',
        resourceId: project.id,
        resourceTitle: project.name,
        after: project.toJSON(),
        ipAddress: (req.ip || '127.0.0.1') as string,
        userAgent: (req.get('user-agent') || 'system') as string,
      });

      res.status(201).json({
        success: true,
        data: project.toJSON(),
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/projects - List projects with search & filtering
   */
  public static async getProjects(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const {
        q,
        status,
        priority,
        health,
        isArchived,
        isTemplate,
        myProjectsOnly,
        page = '1',
        limit = '20',
        sortBy = 'updatedAt',
        sortOrder = 'desc',
      } = req.query as Record<string, string>;

      const query: Record<string, any> = {
        organizationId: new Types.ObjectId(user.organizationId),
        isDeleted: false,
      };

      // Filter archived
      if (isArchived !== undefined) {
        query.isArchived = isArchived === 'true';
      } else {
        query.isArchived = false; // default show unarchived
      }

      // Filter templates
      if (isTemplate !== undefined) {
        query.isTemplate = isTemplate === 'true';
      }

      // Role restriction: regular users only see projects they belong to unless searching or viewing
      if (user.role === ROLES.USER || myProjectsOnly === 'true') {
        query['members.userId'] = new Types.ObjectId(user.id);
      }

      if (status) query.status = status;
      if (priority) query.priority = priority;
      if (health) query.health = health;

      if (q && q.trim()) {
        const regex = new RegExp(q.trim(), 'i');
        query.$or = [{ name: regex }, { key: regex }, { client: regex }, { description: regex }];
      }

      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
      const skip = (pageNum - 1) * limitNum;

      const sortOptions: Record<string, 1 | -1> = {
        [sortBy]: sortOrder === 'asc' ? 1 : -1,
      };

      const [projects, total] = await Promise.all([
        ProjectModel.find(query)
          .populate('members.userId', 'name email avatarUrl role jobTitle department')
          .sort(sortOptions)
          .skip(skip)
          .limit(limitNum)
          .lean(),
        ProjectModel.countDocuments(query),
      ]);

      // Map populated fields cleanly
      const mappedProjects = projects.map((p) => {
        const doc = ProjectModel.hydrate(p);
        const json = doc.toJSON();
        return json;
      });

      res.status(200).json({
        success: true,
        data: mappedProjects,
        meta: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/projects/:id - Get project detail
   */
  public static async getProjectById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const id = req.params.id as string;

      if (!Types.ObjectId.isValid(id)) {
        throw new NotFoundError(`Project ${id}`);
      }

      const project = await ProjectModel.findOne({
        _id: new Types.ObjectId(id),
        organizationId: new Types.ObjectId(user.organizationId),
        isDeleted: false,
      }).populate('members.userId', 'name email avatarUrl role jobTitle department');

      if (!project) {
        throw new NotFoundError(`Project ${id}`);
      }

      if (!ProjectController.isProjectMember(req, project)) {
        throw new ForbiddenError('You do not have access to this project');
      }

      const json = project.toJSON();

      // Compute sample stats
      json.stats = {
        totalTasks: 0,
        completedTasks: 0,
        inProgressTasks: 0,
        overdueTasks: 0,
        progressPercentage: 0,
        spentBudget: 0,
      };

      res.status(200).json({
        success: true,
        data: json,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/v1/projects/:id - Update project details
   */
  public static async updateProject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const id = req.params.id as string;
      const data = UpdateProjectSchema.parse(req.body);

      if (!Types.ObjectId.isValid(id)) {
        throw new NotFoundError(`Project ${id}`);
      }

      const project = await ProjectModel.findOne({
        _id: new Types.ObjectId(id),
        organizationId: new Types.ObjectId(user.organizationId),
        isDeleted: false,
      });

      if (!project) {
        throw new NotFoundError(`Project ${id}`);
      }

      if (!ProjectController.canManageProject(req, project)) {
        throw new ForbiddenError('You do not have permission to update this project');
      }

      const before = project.toJSON();

      // Update fields
      Object.assign(project, data);
      project.updatedBy = new Types.ObjectId(user.id);

      // Auto compute health if end date is passed and not completed
      if (
        project.endDate &&
        new Date(project.endDate).getTime() < Date.now() &&
        project.status !== PROJECT_STATUSES.COMPLETED
      ) {
        project.health = PROJECT_HEALTH.DELAYED;
      }

      await project.save();

      const populatedProject = await ProjectModel.findById(project._id).populate(
        'members.userId',
        'name email avatarUrl role jobTitle department',
      );

      await AuditService.log({
        organizationId: user.organizationId,
        actorId: user.id,
        actorEmail: user.email,
        actorName: `${user.firstName} ${user.lastName}`,
        action: AUDIT_ACTIONS.PROJECT_UPDATED,
        resourceType: 'project',
        resourceId: project.id,
        resourceTitle: project.name,
        before,
        after: populatedProject?.toJSON(),
        ipAddress: (req.ip || '127.0.0.1') as string,
        userAgent: (req.get('user-agent') || 'system') as string,
      });

      res.status(200).json({
        success: true,
        data: populatedProject?.toJSON(),
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/projects/:id/archive - Archive / Unarchive project
   */
  public static async toggleArchive(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const id = req.params.id as string;

      if (!Types.ObjectId.isValid(id)) {
        throw new NotFoundError(`Project ${id}`);
      }

      const project = await ProjectModel.findOne({
        _id: new Types.ObjectId(id),
        organizationId: new Types.ObjectId(user.organizationId),
        isDeleted: false,
      });

      if (!project) {
        throw new NotFoundError(`Project ${id}`);
      }

      if (!ProjectController.canManageProject(req, project)) {
        throw new ForbiddenError('You do not have permission to archive this project');
      }

      const before = project.toJSON();
      project.isArchived = !project.isArchived;
      if (project.isArchived) {
        project.status = PROJECT_STATUSES.ARCHIVED;
      } else if (project.status === PROJECT_STATUSES.ARCHIVED) {
        project.status = PROJECT_STATUSES.ACTIVE;
      }
      project.updatedBy = new Types.ObjectId(user.id);

      await project.save();

      await AuditService.log({
        organizationId: user.organizationId,
        actorId: user.id,
        actorEmail: user.email,
        actorName: `${user.firstName} ${user.lastName}`,
        action: AUDIT_ACTIONS.PROJECT_ARCHIVED,
        resourceType: 'project',
        resourceId: project.id,
        resourceTitle: project.name,
        before,
        after: project.toJSON(),
        ipAddress: (req.ip || '127.0.0.1') as string,
        userAgent: (req.get('user-agent') || 'system') as string,
      });

      res.status(200).json({
        success: true,
        data: project.toJSON(),
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/v1/projects/:id - Soft delete project
   */
  public static async deleteProject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const id = req.params.id as string;

      if (!Types.ObjectId.isValid(id)) {
        throw new NotFoundError(`Project ${id}`);
      }

      const project = await ProjectModel.findOne({
        _id: new Types.ObjectId(id),
        organizationId: new Types.ObjectId(user.organizationId),
        isDeleted: false,
      });

      if (!project) {
        throw new NotFoundError(`Project ${id}`);
      }

      if (!ProjectController.canManageProject(req, project)) {
        throw new ForbiddenError('You do not have permission to delete this project');
      }

      const before = project.toJSON();
      project.isDeleted = true;
      project.deletedAt = new Date();
      project.updatedBy = new Types.ObjectId(user.id);

      await project.save();

      await AuditService.log({
        organizationId: user.organizationId,
        actorId: user.id,
        actorEmail: user.email,
        actorName: `${user.firstName} ${user.lastName}`,
        action: AUDIT_ACTIONS.PROJECT_DELETED,
        resourceType: 'project',
        resourceId: project.id,
        resourceTitle: project.name,
        before,
        ipAddress: (req.ip || '127.0.0.1') as string,
        userAgent: (req.get('user-agent') || 'system') as string,
      });

      res.status(200).json({
        success: true,
        message: 'Project deleted successfully',
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/projects/:id/members - Add or update a project member
   */
  public static async addMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const id = req.params.id as string;
      const { userId, role } = AddProjectMemberSchema.parse(req.body);

      if (!Types.ObjectId.isValid(id)) {
        throw new NotFoundError(`Project ${id}`);
      }

      const project = await ProjectModel.findOne({
        _id: new Types.ObjectId(id),
        organizationId: new Types.ObjectId(user.organizationId),
        isDeleted: false,
      });

      if (!project) {
        throw new NotFoundError(`Project ${id}`);
      }

      if (!ProjectController.canManageProject(req, project)) {
        throw new ForbiddenError('You do not have permission to manage members in this project');
      }

      // Check if target user belongs to same org
      const targetUser = await UserModel.findOne({
        _id: new Types.ObjectId(userId),
        organizationId: new Types.ObjectId(user.organizationId),
        isDeleted: false,
      });

      if (!targetUser) {
        throw new NotFoundError(`User ${userId}`);
      }

      // Find existing member
      const memberIndex = project.members.findIndex(
        (m) => m.userId.toString() === userId,
      );

      if (memberIndex >= 0 && project.members[memberIndex]) {
        project.members[memberIndex]!.role = role;
      } else {
        project.members.push({
          userId: new Types.ObjectId(userId),
          role,
          joinedAt: new Date(),
        });
      }

      project.updatedBy = new Types.ObjectId(user.id);
      await project.save();

      const populatedProject = await ProjectModel.findById(project._id).populate(
        'members.userId',
        'name email avatarUrl role jobTitle department',
      );

      await AuditService.log({
        organizationId: user.organizationId,
        actorId: user.id,
        actorEmail: user.email,
        actorName: `${user.firstName} ${user.lastName}`,
        action: AUDIT_ACTIONS.PROJECT_MEMBER_ADDED,
        resourceType: 'project',
        resourceId: project.id,
        resourceTitle: `${targetUser.firstName} ${targetUser.lastName} (${role}) added to ${project.name}`,
        after: populatedProject?.toJSON(),
        ipAddress: (req.ip || '127.0.0.1') as string,
        userAgent: (req.get('user-agent') || 'system') as string,
      });

      res.status(200).json({
        success: true,
        data: populatedProject?.toJSON(),
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/v1/projects/:id/members/:userId - Remove a project member
   */
  public static async removeMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const id = req.params.id as string;
      const userId = req.params.userId as string;

      if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(userId)) {
        throw new BadRequestError('Invalid project or user ID');
      }

      const project = await ProjectModel.findOne({
        _id: new Types.ObjectId(id),
        organizationId: new Types.ObjectId(user.organizationId),
        isDeleted: false,
      });

      if (!project) {
        throw new NotFoundError(`Project ${id}`);
      }

      if (!ProjectController.canManageProject(req, project)) {
        throw new ForbiddenError('You do not have permission to manage members in this project');
      }

      // Check if trying to remove last manager
      const remainingManagers = project.members.filter(
        (m) => m.userId.toString() !== userId && m.role === PROJECT_ROLES.MANAGER,
      );

      const removingManager = project.members.find(
        (m) => m.userId.toString() === userId && m.role === PROJECT_ROLES.MANAGER,
      );

      if (removingManager && remainingManagers.length === 0) {
        throw new BadRequestError('Cannot remove the only project manager. Promote another member first.');
      }

      project.members = project.members.filter(
        (m) => m.userId.toString() !== userId,
      );
      project.updatedBy = new Types.ObjectId(user.id);
      await project.save();

      const populatedProject = await ProjectModel.findById(project._id).populate(
        'members.userId',
        'name email avatarUrl role jobTitle department',
      );

      await AuditService.log({
        organizationId: user.organizationId,
        actorId: user.id,
        actorEmail: user.email,
        actorName: `${user.firstName} ${user.lastName}`,
        action: AUDIT_ACTIONS.PROJECT_MEMBER_REMOVED,
        resourceType: 'project',
        resourceId: project.id,
        resourceTitle: `Member removed from ${project.name}`,
        after: populatedProject?.toJSON(),
        ipAddress: (req.ip || '127.0.0.1') as string,
        userAgent: (req.get('user-agent') || 'system') as string,
      });

      res.status(200).json({
        success: true,
        data: populatedProject?.toJSON(),
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/projects/:id/milestones - Add milestone
   */
  public static async addMilestone(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const id = req.params.id as string;
      const data = CreateMilestoneSchema.parse(req.body);

      if (!Types.ObjectId.isValid(id)) {
        throw new NotFoundError(`Project ${id}`);
      }

      const project = await ProjectModel.findOne({
        _id: new Types.ObjectId(id),
        organizationId: new Types.ObjectId(user.organizationId),
        isDeleted: false,
      });

      if (!project) {
        throw new NotFoundError(`Project ${id}`);
      }

      if (!ProjectController.canManageProject(req, project)) {
        throw new ForbiddenError('You do not have permission to manage milestones');
      }

      const newMilestone: any = {
        _id: new Types.ObjectId(),
        title: data.title,
        description: data.description || '',
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        isCompleted: false,
        order: project.milestones.length,
      };

      project.milestones.push(newMilestone);
      project.updatedBy = new Types.ObjectId(user.id);
      await project.save();

      const populatedProject = await ProjectModel.findById(project._id).populate(
        'members.userId',
        'name email avatarUrl role jobTitle department',
      );

      res.status(201).json({
        success: true,
        data: populatedProject?.toJSON(),
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/v1/projects/:id/milestones/:milestoneId - Update milestone
   */
  public static async updateMilestone(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const id = req.params.id as string;
      const milestoneId = req.params.milestoneId as string;
      const data = UpdateMilestoneSchema.parse(req.body);

      if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(milestoneId)) {
        throw new BadRequestError('Invalid project or milestone ID');
      }

      const project = await ProjectModel.findOne({
        _id: new Types.ObjectId(id),
        organizationId: new Types.ObjectId(user.organizationId),
        isDeleted: false,
      });

      if (!project) {
        throw new NotFoundError(`Project ${id}`);
      }

      if (!ProjectController.canManageProject(req, project)) {
        throw new ForbiddenError('You do not have permission to manage milestones');
      }

      const milestone = project.milestones.id(milestoneId);
      if (!milestone) {
        throw new NotFoundError(`Milestone ${milestoneId}`);
      }

      if (data.title !== undefined) milestone.title = data.title;
      if (data.description !== undefined) milestone.description = data.description;
      if (data.dueDate !== undefined) {
        milestone.dueDate = data.dueDate ? new Date(data.dueDate) : undefined;
      }
      if (data.isCompleted !== undefined) {
        milestone.isCompleted = data.isCompleted;
        milestone.completedAt = data.isCompleted ? new Date() : undefined;
      }

      project.updatedBy = new Types.ObjectId(user.id);
      await project.save();

      const populatedProject = await ProjectModel.findById(project._id).populate(
        'members.userId',
        'name email avatarUrl role jobTitle department',
      );

      res.status(200).json({
        success: true,
        data: populatedProject?.toJSON(),
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/v1/projects/:id/milestones/:milestoneId - Delete milestone
   */
  public static async deleteMilestone(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const id = req.params.id as string;
      const milestoneId = req.params.milestoneId as string;

      if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(milestoneId)) {
        throw new BadRequestError('Invalid project or milestone ID');
      }

      const project = await ProjectModel.findOne({
        _id: new Types.ObjectId(id),
        organizationId: new Types.ObjectId(user.organizationId),
        isDeleted: false,
      });

      if (!project) {
        throw new NotFoundError(`Project ${id}`);
      }

      if (!ProjectController.canManageProject(req, project)) {
        throw new ForbiddenError('You do not have permission to manage milestones');
      }

      const milestone = project.milestones.id(milestoneId);
      if (!milestone) {
        throw new NotFoundError(`Milestone ${milestoneId}`);
      }

      milestone.deleteOne();
      project.updatedBy = new Types.ObjectId(user.id);
      await project.save();

      const populatedProject = await ProjectModel.findById(project._id).populate(
        'members.userId',
        'name email avatarUrl role jobTitle department',
      );

      res.status(200).json({
        success: true,
        data: populatedProject?.toJSON(),
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/projects/:id/duplicate - Duplicate / Clone project
   */
  public static async duplicateProject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const id = req.params.id as string;
      const data = DuplicateProjectSchema.parse(req.body);

      if (!Types.ObjectId.isValid(id)) {
        throw new NotFoundError(`Project ${id}`);
      }

      const sourceProject = await ProjectModel.findOne({
        _id: new Types.ObjectId(id),
        organizationId: new Types.ObjectId(user.organizationId),
        isDeleted: false,
      });

      if (!sourceProject) {
        throw new NotFoundError(`Project ${id}`);
      }

      // Check key uniqueness
      const existingKey = await ProjectModel.findOne({
        organizationId: new Types.ObjectId(user.organizationId),
        key: data.key.toUpperCase(),
        isDeleted: false,
      });

      if (existingKey) {
        throw new ConflictError(`Project with key "${data.key.toUpperCase()}" already exists`);
      }

      const clonedMembers = data.copyMembers
        ? sourceProject.members.map((m) => ({
            userId: m.userId,
            role: m.role,
            joinedAt: new Date(),
          }))
        : [
            {
              userId: new Types.ObjectId(user.id),
              role: PROJECT_ROLES.MANAGER,
              joinedAt: new Date(),
            },
          ];

      const clonedMilestones = data.copyMilestones
        ? sourceProject.milestones.map((m) => ({
            _id: new Types.ObjectId(),
            title: m.title,
            description: m.description,
            dueDate: m.dueDate,
            isCompleted: false,
            order: m.order,
          }))
        : [];

      const newProject = await ProjectModel.create({
        organizationId: new Types.ObjectId(user.organizationId),
        name: data.name,
        key: data.key.toUpperCase(),
        description: sourceProject.description,
        client: sourceProject.client,
        status: PROJECT_STATUSES.PLANNING,
        priority: sourceProject.priority,
        health: PROJECT_HEALTH.ON_TRACK,
        budget: sourceProject.budget,
        tags: sourceProject.tags,
        coverColor: sourceProject.coverColor,
        icon: sourceProject.icon,
        members: clonedMembers,
        milestones: clonedMilestones,
        isTemplate: false,
        createdBy: new Types.ObjectId(user.id),
        updatedBy: new Types.ObjectId(user.id),
      });

      await AuditService.log({
        organizationId: user.organizationId,
        actorId: user.id,
        actorEmail: user.email,
        actorName: `${user.firstName} ${user.lastName}`,
        action: AUDIT_ACTIONS.PROJECT_CREATED,
        resourceType: 'project',
        resourceId: newProject.id,
        resourceTitle: `${newProject.name} (Cloned from ${sourceProject.name})`,
        after: newProject.toJSON(),
        ipAddress: (req.ip || '127.0.0.1') as string,
        userAgent: (req.get('user-agent') || 'system') as string,
      });

      res.status(201).json({
        success: true,
        data: newProject.toJSON(),
      });
    } catch (err) {
      next(err);
    }
  }
}
