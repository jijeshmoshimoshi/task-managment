import { AuditLogModel } from './audit.model';
import { AuditAction } from '@taskmaster/shared';
import { logger } from '../../config/logger';

export interface CreateAuditLogParams {
  organizationId: string;
  actorId: string;
  actorEmail: string;
  actorName: string;
  action: AuditAction;
  resourceType: string;
  resourceId?: string;
  resourceTitle?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export class AuditService {
  /**
   * Records an immutable audit log entry.
   * Runs asynchronously without blocking the calling handler.
   */
  public static async log(params: CreateAuditLogParams): Promise<void> {
    try {
      await AuditLogModel.create({
        organizationId: params.organizationId,
        actorId: params.actorId,
        actorEmail: params.actorEmail,
        actorName: params.actorName,
        action: params.action,
        resourceType: params.resourceType,
        resourceId: params.resourceId,
        resourceTitle: params.resourceTitle,
        before: params.before,
        after: params.after,
        ipAddress: params.ipAddress || '0.0.0.0',
        userAgent: params.userAgent || 'Unknown',
      });
    } catch (err) {
      logger.error({ err, params }, '❌ Failed to write audit log');
    }
  }

  /**
   * Queries paginated audit logs scoped strictly by organization.
   */
  public static async getLogs(
    organizationId: string,
    filters?: {
      action?: string;
      actorId?: string;
      resourceType?: string;
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const page = filters?.page || 1;
    const limit = Math.min(filters?.limit || 20, 100);
    const skip = (page - 1) * limit;

    const query: Record<string, any> = { organizationId };

    if (filters?.action) query.action = filters.action;
    if (filters?.actorId) query.actorId = filters.actorId;
    if (filters?.resourceType) query.resourceType = filters.resourceType;

    if (filters?.startDate || filters?.endDate) {
      query.createdAt = {};
      if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
      if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
    }

    const [logs, total] = await Promise.all([
      AuditLogModel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditLogModel.countDocuments(query),
    ]);

    return {
      logs: logs.map((log: any) => ({
        id: log._id.toString(),
        organizationId: log.organizationId.toString(),
        actorId: log.actorId.toString(),
        actorEmail: log.actorEmail,
        actorName: log.actorName,
        action: log.action,
        resourceType: log.resourceType,
        resourceId: log.resourceId,
        resourceTitle: log.resourceTitle,
        before: log.before,
        after: log.after,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        createdAt: log.createdAt.toISOString(),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
