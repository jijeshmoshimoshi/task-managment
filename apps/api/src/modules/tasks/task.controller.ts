import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import {
  AUDIT_ACTIONS,
  CreateTaskSchema,
  UpdateTaskSchema,
  ReorderTaskSchema,
  CreateChecklistItemSchema,
  UpdateChecklistItemSchema,
  AddCommentSchema,
  LogTimeSchema,
  WS_EVENTS,
  ROLES,
} from '@taskmaster/shared';
import { TaskModel } from './task.model';
import { ProjectModel } from '../projects/project.model';
import { AuditService } from '../audit/audit.service';
import { NotificationService } from '../notifications/notification.service';
import { SocketService } from '../notifications/socket.service';
import {
  NotFoundError,
  BadRequestError,
  ForbiddenError,
} from '../../common/errors/app-error';

export class TaskController {
  /**
   * POST /api/v1/tasks - Create a new task or personal task
   */
  public static async createTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const data = CreateTaskSchema.parse(req.body);

      let taskKey: string | undefined;
      let taskNumber = 1;
      let project: any = null;

      if (data.projectId) {
        project = await ProjectModel.findOne({
          _id: new Types.ObjectId(data.projectId),
          organizationId: new Types.ObjectId(user.organizationId),
          isDeleted: false,
        });

        if (!project) {
          throw new NotFoundError(`Project ${data.projectId}`);
        }

        // Sequential task numbering per project
        const lastTask = await TaskModel.findOne({
          projectId: new Types.ObjectId(data.projectId),
        })
          .sort({ taskNumber: -1 })
          .select('taskNumber')
          .lean();

        if (lastTask && lastTask.taskNumber) {
          taskNumber = lastTask.taskNumber + 1;
        }

        taskKey = `${project.key}-${taskNumber}`;
      }

      // Compute initial orderIndex in column
      const countInStatus = await TaskModel.countDocuments({
        organizationId: new Types.ObjectId(user.organizationId),
        projectId: data.projectId ? new Types.ObjectId(data.projectId) : undefined,
        status: data.status,
        isDeleted: false,
      });

      let resolvedAssigneeIds = (data.assigneeIds || []).map((id: string) => new Types.ObjectId(id));
      if (resolvedAssigneeIds.length === 0 && (data.isPersonal || !data.projectId)) {
        resolvedAssigneeIds = [new Types.ObjectId(user.id)];
      }

      const isManagerOrAdmin = user.role === ROLES.SUPER_ADMIN || user.role === ROLES.ADMIN;
      const approvalData = isManagerOrAdmin
        ? {
            requestedBy: new Types.ObjectId(user.id),
            requestedAt: new Date(),
            reviewedBy: new Types.ObjectId(user.id),
            reviewedAt: new Date(),
            status: 'APPROVED' as const,
          }
        : {
            requestedBy: new Types.ObjectId(user.id),
            requestedAt: new Date(),
            status: 'PENDING' as const,
          };

      const task = await TaskModel.create({
        organizationId: new Types.ObjectId(user.organizationId),
        projectId: data.projectId ? new Types.ObjectId(data.projectId) : undefined,
        taskKey,
        taskNumber,
        title: data.title,
        descriptionHtml: data.descriptionHtml || '',
        status: data.status,
        priority: data.priority,
        type: data.type,
        assigneeIds: resolvedAssigneeIds,
        reporterId: new Types.ObjectId(user.id),
        watcherIds: data.watcherIds.map((id) => new Types.ObjectId(id)),
        parentTaskId: data.parentTaskId ? new Types.ObjectId(data.parentTaskId) : undefined,
        milestoneId: data.milestoneId ? new Types.ObjectId(data.milestoneId) : undefined,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        estimatedMinutes: data.estimatedMinutes,
        labels: data.labels,
        checklist: [],
        timeEntries: [],
        comments: [],
        approval: approvalData,
        isPersonal: data.isPersonal || !data.projectId,
        orderIndex: countInStatus,
        createdBy: new Types.ObjectId(user.id),
        updatedBy: new Types.ObjectId(user.id),
      });

      const populatedTask = await TaskModel.findById(task._id)
        .populate('assigneeIds', 'name email avatarUrl role')
        .populate('reporterId', 'name email avatarUrl');

      await AuditService.log({
        organizationId: user.organizationId,
        actorId: user.id,
        actorEmail: user.email,
        actorName: `${user.firstName} ${user.lastName}`,
        action: AUDIT_ACTIONS.TASK_CREATED,
        resourceType: 'task',
        resourceId: task.id,
        resourceTitle: task.title,
        after: populatedTask?.toJSON(),
        ipAddress: (req.ip || '127.0.0.1') as string,
        userAgent: (req.get('user-agent') || 'system') as string,
      });

      const taskJson = populatedTask?.toJSON();

      // Realtime broadcast to project room
      if (task.projectId) {
        SocketService.emitToProject(task.projectId.toString(), WS_EVENTS.TASK_CREATED, taskJson);
      }

      // Dispatch notification to assignees (excluding creator)
      if (data.assigneeIds && Array.isArray(data.assigneeIds)) {
        for (const assigneeId of data.assigneeIds) {
          if (assigneeId.toString() !== user.id) {
            NotificationService.create({
              recipientId: assigneeId.toString(),
              organizationId: user.organizationId,
              senderId: user.id,
              senderName: `${user.firstName} ${user.lastName}`,
              type: 'TASK_ASSIGNED',
              title: 'Task Assignment',
              message: `${user.firstName} ${user.lastName} assigned you to "${(task as any).key || task.taskKey || 'TASK'}: ${task.title}"`,
              link: task.projectId ? `/projects/${task.projectId}?taskId=${task.id}` : `/tasks/my`,
            }).catch(() => {});
          }
        }
      }

      res.status(201).json({
        success: true,
        data: taskJson,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/tasks - Query tasks with multi-filters and Kanban ordering
   */
  public static async getTasks(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const {
        projectId,
        status,
        priority,
        type,
        assigneeId,
        reporterId,
        milestoneId,
        isPersonal,
        myTasksOnly,
        approvalStatus,
        q,
        page = '1',
        limit = '100',
        sortBy = 'orderIndex',
        sortOrder = 'asc',
      } = req.query as Record<string, string>;

      const query: Record<string, any> = {
        organizationId: new Types.ObjectId(user.organizationId),
        isDeleted: false,
      };

      if (approvalStatus === 'PENDING') {
        query['approval.status'] = 'PENDING';
      } else if (approvalStatus === 'APPROVED') {
        query['approval.status'] = { $nin: ['PENDING', 'REJECTED'] };
      } else if (approvalStatus === 'REJECTED') {
        query['approval.status'] = 'REJECTED';
      } else if (!approvalStatus) {
        query['approval.status'] = { $nin: ['PENDING', 'REJECTED'] };
      }

      if (projectId) {
        query.projectId = new Types.ObjectId(projectId);
      }

      if (isPersonal === 'true') {
        query.isPersonal = true;
        query.createdBy = new Types.ObjectId(user.id);
      }

      if (status) query.status = status;
      if (priority) query.priority = priority;
      if (type) query.type = type;
      if (milestoneId) query.milestoneId = new Types.ObjectId(milestoneId);
      if (assigneeId) query.assigneeIds = new Types.ObjectId(assigneeId);

      const orConditions: any[] = [];

      if (myTasksOnly === 'true') {
        const userObjId = new Types.ObjectId(user.id);
        orConditions.push({
          $or: [
            { assigneeIds: userObjId },
            { createdBy: userObjId, isPersonal: true },
            { reporterId: userObjId, isPersonal: true },
          ],
        });
      }

      if (reporterId) {
        const repObjId = new Types.ObjectId(reporterId);
        orConditions.push({
          $or: [{ reporterId: repObjId }, { createdBy: repObjId }],
        });
      }

      if (q && q.trim()) {
        const regex = new RegExp(q.trim(), 'i');
        orConditions.push({
          $or: [{ title: regex }, { taskKey: regex }, { labels: regex }],
        });
      }

      if (orConditions.length === 1) {
        query.$or = orConditions[0].$or;
      } else if (orConditions.length > 1) {
        query.$and = orConditions;
      }

      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 100));
      const skip = (pageNum - 1) * limitNum;

      const sortOptions: Record<string, 1 | -1> = {
        [sortBy]: sortOrder === 'desc' ? -1 : 1,
      };

      const [tasks, total] = await Promise.all([
        TaskModel.find(query)
          .populate('assigneeIds', 'name email avatarUrl role')
          .populate('reporterId', 'name email avatarUrl')
          .populate('comments.userId', 'name email avatarUrl role')
          .sort(sortOptions)
          .skip(skip)
          .limit(limitNum),
        TaskModel.countDocuments(query),
      ]);

      const mappedTasks = tasks.map((t) => t.toJSON());

      res.status(200).json({
        success: true,
        data: mappedTasks,
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
   * GET /api/v1/tasks/:id - Get task detail
   */
  public static async getTaskById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const id = req.params.id as string;

      if (!Types.ObjectId.isValid(id)) {
        throw new NotFoundError(`Task ${id}`);
      }

      const task = await TaskModel.findOne({
        _id: new Types.ObjectId(id),
        organizationId: new Types.ObjectId(user.organizationId),
        isDeleted: false,
      })
        .populate('assigneeIds', 'name email avatarUrl role')
        .populate('reporterId', 'name email avatarUrl')
        .populate('comments.userId', 'name email avatarUrl role');

      if (!task) {
        throw new NotFoundError(`Task ${id}`);
      }

      res.status(200).json({
        success: true,
        data: task.toJSON(),
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/v1/tasks/:id - Update task details
   */
  public static async updateTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const id = req.params.id as string;
      const data = UpdateTaskSchema.parse(req.body);

      if (!Types.ObjectId.isValid(id)) {
        throw new NotFoundError(`Task ${id}`);
      }

      const task = await TaskModel.findOne({
        _id: new Types.ObjectId(id),
        organizationId: new Types.ObjectId(user.organizationId),
        isDeleted: false,
      });

      if (!task) {
        throw new NotFoundError(`Task ${id}`);
      }

      const before = task.toJSON();
      const statusChanged = data.status && data.status !== task.status;

      if (data.title !== undefined) task.title = data.title;
      if (data.descriptionHtml !== undefined) task.descriptionHtml = data.descriptionHtml;
      if (data.status !== undefined) task.status = data.status;
      if (data.priority !== undefined) task.priority = data.priority;
      if (data.type !== undefined) task.type = data.type;
      if (data.assigneeIds !== undefined) {
        task.assigneeIds = data.assigneeIds.map((uId) => new Types.ObjectId(uId));
      }
      if (data.watcherIds !== undefined) {
        task.watcherIds = data.watcherIds.map((wId) => new Types.ObjectId(wId));
      }
      if (data.milestoneId !== undefined) {
        task.milestoneId = data.milestoneId ? new Types.ObjectId(data.milestoneId) : undefined;
      }
      if (data.startDate !== undefined) {
        task.startDate = data.startDate ? new Date(data.startDate) : undefined;
      }
      if (data.dueDate !== undefined) {
        task.dueDate = data.dueDate ? new Date(data.dueDate) : undefined;
      }
      if (data.estimatedMinutes !== undefined) {
        task.estimatedMinutes = data.estimatedMinutes;
      }
      if (data.labels !== undefined) task.labels = data.labels;

      task.updatedBy = new Types.ObjectId(user.id);
      await task.save();

      const populatedTask = await TaskModel.findById(task._id)
        .populate('assigneeIds', 'name email avatarUrl role')
        .populate('reporterId', 'name email avatarUrl')
        .populate('comments.userId', 'name email avatarUrl role');

      await AuditService.log({
        organizationId: user.organizationId,
        actorId: user.id,
        actorEmail: user.email,
        actorName: `${user.firstName} ${user.lastName}`,
        action: statusChanged ? AUDIT_ACTIONS.TASK_STATUS_CHANGED : AUDIT_ACTIONS.TASK_UPDATED,
        resourceType: 'task',
        resourceId: task.id,
        resourceTitle: task.title,
        before,
        after: populatedTask?.toJSON(),
        ipAddress: (req.ip || '127.0.0.1') as string,
        userAgent: (req.get('user-agent') || 'system') as string,
      });

      const taskJson = populatedTask?.toJSON();

      // Emit realtime events
      if (task.projectId) {
        SocketService.emitToProject(
          task.projectId.toString(),
          statusChanged ? WS_EVENTS.TASK_STATUS_CHANGED : WS_EVENTS.TASK_UPDATED,
          taskJson,
        );
      }
      SocketService.emitToTask(task.id, WS_EVENTS.TASK_UPDATED, taskJson);

      // If status changed, notify assignees (excluding updater)
      if (statusChanged && task.assigneeIds && Array.isArray(task.assigneeIds)) {
        for (const assignee of task.assigneeIds) {
          const assigneeId = assignee._id ? assignee._id.toString() : assignee.toString();
          if (assigneeId !== user.id) {
            NotificationService.create({
              recipientId: assigneeId,
              organizationId: user.organizationId,
              senderId: user.id,
              senderName: `${user.firstName} ${user.lastName}`,
              type: 'TASK_STATUS_CHANGED',
              title: 'Task Status Updated',
              message: `${user.firstName} ${user.lastName} moved "${(task as any).key || task.taskKey || 'TASK'}: ${task.title}" to ${task.status.replace('_', ' ')}`,
              link: task.projectId ? `/projects/${task.projectId}?taskId=${task.id}` : `/tasks/my`,
            }).catch(() => {});
          }
        }
      }

      res.status(200).json({
        success: true,
        data: taskJson,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/v1/tasks/:id/reorder - Drag & Drop status transition & orderIndex
   */
  public static async reorderTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const id = req.params.id as string;
      const { status, orderIndex } = ReorderTaskSchema.parse(req.body);

      if (!Types.ObjectId.isValid(id)) {
        throw new NotFoundError(`Task ${id}`);
      }

      const task = await TaskModel.findOne({
        _id: new Types.ObjectId(id),
        organizationId: new Types.ObjectId(user.organizationId),
        isDeleted: false,
      });

      if (!task) {
        throw new NotFoundError(`Task ${id}`);
      }

      task.status = status;
      task.orderIndex = orderIndex;
      task.updatedBy = new Types.ObjectId(user.id);
      await task.save();

      const movePayload = { id: task.id, status: task.status, orderIndex: task.orderIndex };

      if (task.projectId) {
        SocketService.emitToProject(task.projectId.toString(), WS_EVENTS.TASK_MOVED, movePayload);
      }

      res.status(200).json({
        success: true,
        data: movePayload,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/tasks/:id/checklist - Add checklist item
   */
  public static async addChecklistItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const id = req.params.id as string;
      const data = CreateChecklistItemSchema.parse(req.body);

      if (!Types.ObjectId.isValid(id)) {
        throw new NotFoundError(`Task ${id}`);
      }

      const task = await TaskModel.findOne({
        _id: new Types.ObjectId(id),
        organizationId: new Types.ObjectId(user.organizationId),
        isDeleted: false,
      });

      if (!task) {
        throw new NotFoundError(`Task ${id}`);
      }

      task.checklist.push({
        _id: new Types.ObjectId(),
        title: data.title,
        isCompleted: false,
      } as any);

      task.updatedBy = new Types.ObjectId(user.id);
      await task.save();

      const populated = await TaskModel.findById(task._id)
        .populate('assigneeIds', 'name email avatarUrl role')
        .populate('reporterId', 'name email avatarUrl');

      res.status(201).json({
        success: true,
        data: populated?.toJSON(),
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/v1/tasks/:id/checklist/:itemId - Update checklist item completion
   */
  public static async updateChecklistItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const id = req.params.id as string;
      const itemId = req.params.itemId as string;
      const data = UpdateChecklistItemSchema.parse(req.body);

      if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(itemId)) {
        throw new BadRequestError('Invalid task or item ID');
      }

      const task = await TaskModel.findOne({
        _id: new Types.ObjectId(id),
        organizationId: new Types.ObjectId(user.organizationId),
        isDeleted: false,
      });

      if (!task) {
        throw new NotFoundError(`Task ${id}`);
      }

      const item = task.checklist.id(itemId);
      if (!item) {
        throw new NotFoundError(`Checklist item ${itemId}`);
      }

      if (data.title !== undefined) item.title = data.title;
      if (data.isCompleted !== undefined) {
        item.isCompleted = data.isCompleted;
        item.completedAt = data.isCompleted ? new Date() : undefined;
        item.completedBy = data.isCompleted ? new Types.ObjectId(user.id) : undefined;
      }

      task.updatedBy = new Types.ObjectId(user.id);
      await task.save();

      const populated = await TaskModel.findById(task._id)
        .populate('assigneeIds', 'name email avatarUrl role')
        .populate('reporterId', 'name email avatarUrl');

      res.status(200).json({
        success: true,
        data: populated?.toJSON(),
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/v1/tasks/:id/checklist/:itemId - Delete checklist item
   */
  public static async deleteChecklistItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const id = req.params.id as string;
      const itemId = req.params.itemId as string;

      if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(itemId)) {
        throw new BadRequestError('Invalid task or item ID');
      }

      const task = await TaskModel.findOne({
        _id: new Types.ObjectId(id),
        organizationId: new Types.ObjectId(user.organizationId),
        isDeleted: false,
      });

      if (!task) {
        throw new NotFoundError(`Task ${id}`);
      }

      const item = task.checklist.id(itemId);
      if (!item) {
        throw new NotFoundError(`Checklist item ${itemId}`);
      }

      item.deleteOne();
      task.updatedBy = new Types.ObjectId(user.id);
      await task.save();

      const populated = await TaskModel.findById(task._id)
        .populate('assigneeIds', 'name email avatarUrl role')
        .populate('reporterId', 'name email avatarUrl');

      res.status(200).json({
        success: true,
        data: populated?.toJSON(),
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/tasks/:id/comments - Add comment
   */
  public static async addComment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const id = req.params.id as string;
      const { content } = AddCommentSchema.parse(req.body);

      if (!Types.ObjectId.isValid(id)) {
        throw new NotFoundError(`Task ${id}`);
      }

      const task = await TaskModel.findOne({
        _id: new Types.ObjectId(id),
        organizationId: new Types.ObjectId(user.organizationId),
        isDeleted: false,
      });

      if (!task) {
        throw new NotFoundError(`Task ${id}`);
      }

      task.comments.push({
        _id: new Types.ObjectId(),
        userId: new Types.ObjectId(user.id),
        content,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      task.updatedBy = new Types.ObjectId(user.id);
      await task.save();

      const populated = await TaskModel.findById(task._id)
        .populate('assigneeIds', 'name email avatarUrl role')
        .populate('reporterId', 'name email avatarUrl')
        .populate('comments.userId', 'name email avatarUrl role');

      const taskJson = populated?.toJSON();

      // Emit realtime events
      SocketService.emitToTask(task.id, WS_EVENTS.TASK_COMMENT_ADDED, taskJson);
      if (task.projectId) {
        SocketService.emitToProject(task.projectId.toString(), WS_EVENTS.TASK_UPDATED, taskJson);
      }

      // Notify assignees and reporter (excluding commenter)
      const recipientIds = new Set<string>();
      if (task.assigneeIds && Array.isArray(task.assigneeIds)) {
        task.assigneeIds.forEach((a: any) => {
          const aId = a._id ? a._id.toString() : a.toString();
          if (aId !== user.id) recipientIds.add(aId);
        });
      }
      if (task.reporterId) {
        const rId = (task.reporterId as any)._id
          ? (task.reporterId as any)._id.toString()
          : task.reporterId.toString();
        if (rId !== user.id) recipientIds.add(rId);
      }

      recipientIds.forEach((recipientId) => {
        NotificationService.create({
          recipientId,
          organizationId: user.organizationId,
          senderId: user.id,
          senderName: `${user.firstName} ${user.lastName}`,
          type: 'TASK_COMMENT',
          title: 'New Comment on Task',
          message: `${user.firstName} ${user.lastName} commented on "${(task as any).key || task.taskKey || 'TASK'}: ${task.title}"`,
          link: task.projectId ? `/projects/${task.projectId}?taskId=${task.id}` : `/tasks/my`,
        }).catch(() => {});
      });

      res.status(201).json({
        success: true,
        data: taskJson,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/tasks/:id/time-logs - Log time spent on task
   */
  public static async logTime(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const id = req.params.id as string;
      const data = LogTimeSchema.parse(req.body);

      if (!Types.ObjectId.isValid(id)) {
        throw new NotFoundError(`Task ${id}`);
      }

      const task = await TaskModel.findOne({
        _id: new Types.ObjectId(id),
        organizationId: new Types.ObjectId(user.organizationId),
        isDeleted: false,
      });

      if (!task) {
        throw new NotFoundError(`Task ${id}`);
      }

      task.timeEntries.push({
        _id: new Types.ObjectId(),
        userId: new Types.ObjectId(user.id),
        durationSeconds: data.durationSeconds,
        description: data.description || '',
        startedAt: new Date(data.startedAt),
        endedAt: data.endedAt ? new Date(data.endedAt) : undefined,
        isManual: data.isManual ?? true,
        createdAt: new Date(),
      } as any);

      task.updatedBy = new Types.ObjectId(user.id);
      await task.save();

      const populated = await TaskModel.findById(task._id)
        .populate('assigneeIds', 'name email avatarUrl role')
        .populate('reporterId', 'name email avatarUrl');

      res.status(201).json({
        success: true,
        data: populated?.toJSON(),
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/v1/tasks/:id - Soft delete task
   */
  public static async deleteTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const id = req.params.id as string;

      if (!Types.ObjectId.isValid(id)) {
        throw new NotFoundError(`Task ${id}`);
      }

      const task = await TaskModel.findOne({
        _id: new Types.ObjectId(id),
        organizationId: new Types.ObjectId(user.organizationId),
        isDeleted: false,
      });

      if (!task) {
        throw new NotFoundError(`Task ${id}`);
      }

      // Check deletion permissions: Only admins/super admins or task creator/reporter can delete
      const isSuperAdminOrAdmin =
        user.role === ROLES.SUPER_ADMIN || user.role === ROLES.ADMIN;
      const isCreatorOrReporter =
        task.createdBy?.toString() === user.id ||
        task.reporterId?.toString() === user.id ||
        task.isPersonal === true;

      if (!isSuperAdminOrAdmin && !isCreatorOrReporter) {
        throw new ForbiddenError('You can only delete tasks created by you');
      }

      const before = task.toJSON();
      task.isDeleted = true;
      task.updatedBy = new Types.ObjectId(user.id);
      await task.save();

      await AuditService.log({
        organizationId: user.organizationId,
        actorId: user.id,
        actorEmail: user.email,
        actorName: `${user.firstName} ${user.lastName}`,
        action: AUDIT_ACTIONS.TASK_DELETED,
        resourceType: 'task',
        resourceId: task.id,
        resourceTitle: task.title,
        before,
        ipAddress: (req.ip || '127.0.0.1') as string,
        userAgent: (req.get('user-agent') || 'system') as string,
      });

      res.status(200).json({
        success: true,
        message: 'Task deleted successfully',
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/v1/tasks/:id/approve - Approve a task request (Manager/Admin only)
   */
  public static async approveTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const id = req.params.id as string;

      const isManagerOrAdmin = user.role === ROLES.SUPER_ADMIN || user.role === ROLES.ADMIN;
      if (!isManagerOrAdmin) {
        throw new ForbiddenError('Only managers and admins can approve task requests');
      }

      if (!Types.ObjectId.isValid(id)) {
        throw new NotFoundError(`Task ${id}`);
      }

      const task = await TaskModel.findOne({
        _id: new Types.ObjectId(id),
        organizationId: new Types.ObjectId(user.organizationId),
        isDeleted: false,
      });

      if (!task) {
        throw new NotFoundError(`Task ${id}`);
      }

      task.approval = {
        requestedBy: task.approval?.requestedBy || task.createdBy,
        requestedAt: task.approval?.requestedAt || task.createdAt,
        reviewedBy: new Types.ObjectId(user.id),
        reviewedAt: new Date(),
        status: 'APPROVED',
        reviewNote: req.body.reviewNote || '',
      };
      task.updatedBy = new Types.ObjectId(user.id);

      await task.save();

      const populatedTask = await TaskModel.findById(task._id)
        .populate('assigneeIds', 'name email avatarUrl role')
        .populate('reporterId', 'name email avatarUrl');

      const taskJson = populatedTask?.toJSON();

      if (task.projectId) {
        SocketService.emitToProject(task.projectId.toString(), WS_EVENTS.TASK_UPDATED, taskJson);
      }

      res.status(200).json({
        success: true,
        data: taskJson,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/v1/tasks/:id/reject - Reject a task request (Manager/Admin only)
   */
  public static async rejectTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const id = req.params.id as string;

      const isManagerOrAdmin = user.role === ROLES.SUPER_ADMIN || user.role === ROLES.ADMIN;
      if (!isManagerOrAdmin) {
        throw new ForbiddenError('Only managers and admins can reject task requests');
      }

      if (!Types.ObjectId.isValid(id)) {
        throw new NotFoundError(`Task ${id}`);
      }

      const task = await TaskModel.findOne({
        _id: new Types.ObjectId(id),
        organizationId: new Types.ObjectId(user.organizationId),
        isDeleted: false,
      });

      if (!task) {
        throw new NotFoundError(`Task ${id}`);
      }

      task.approval = {
        requestedBy: task.approval?.requestedBy || task.createdBy,
        requestedAt: task.approval?.requestedAt || task.createdAt,
        reviewedBy: new Types.ObjectId(user.id),
        reviewedAt: new Date(),
        status: 'REJECTED',
        reviewNote: req.body.reviewNote || '',
      };
      task.updatedBy = new Types.ObjectId(user.id);

      await task.save();

      const populatedTask = await TaskModel.findById(task._id)
        .populate('assigneeIds', 'name email avatarUrl role')
        .populate('reporterId', 'name email avatarUrl');

      res.status(200).json({
        success: true,
        data: populatedTask?.toJSON(),
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/v1/tasks/:id/resubmit - Resubmit a rejected task request for approval
   */
  public static async resubmitTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const id = req.params.id as string;

      if (!Types.ObjectId.isValid(id)) {
        throw new NotFoundError(`Task ${id}`);
      }

      const task = await TaskModel.findOne({
        _id: new Types.ObjectId(id),
        organizationId: new Types.ObjectId(user.organizationId),
        isDeleted: false,
      });

      if (!task) {
        throw new NotFoundError(`Task ${id}`);
      }

      if (req.body.title) task.title = req.body.title;
      if (req.body.descriptionHtml !== undefined) task.descriptionHtml = req.body.descriptionHtml;
      if (req.body.priority) task.priority = req.body.priority;
      if (req.body.type) task.type = req.body.type;

      task.approval = {
        requestedBy: new Types.ObjectId(user.id),
        requestedAt: new Date(),
        status: 'PENDING',
        reviewNote: req.body.reviewNote || '',
      };
      task.updatedBy = new Types.ObjectId(user.id);

      await task.save();

      const populatedTask = await TaskModel.findById(task._id)
        .populate('assigneeIds', 'name email avatarUrl role')
        .populate('reporterId', 'name email avatarUrl');

      res.status(200).json({
        success: true,
        data: populatedTask?.toJSON(),
      });
    } catch (err) {
      next(err);
    }
  }
}
