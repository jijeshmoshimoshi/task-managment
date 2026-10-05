import { Request, Response, NextFunction } from 'express';
import { AuditService } from './audit.service';
import { UnauthorizedError } from '../../common/errors/app-error';

export class AuditController {
  public async getLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.organizationId) {
        throw new UnauthorizedError();
      }

      const { action, actorId, resourceType, startDate, endDate, page, limit } = req.query;

      const result = await AuditService.getLogs(req.organizationId, {
        action: action as string,
        actorId: actorId as string,
        resourceType: resourceType as string,
        startDate: startDate as string,
        endDate: endDate as string,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });

      res.status(200).json({
        success: true,
        data: result.logs,
        meta: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  public async exportCsv(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.organizationId) {
        throw new UnauthorizedError();
      }

      const { action, actorId, resourceType, startDate, endDate } = req.query;

      const result = await AuditService.getLogs(req.organizationId, {
        action: action as string,
        actorId: actorId as string,
        resourceType: resourceType as string,
        startDate: startDate as string,
        endDate: endDate as string,
        page: 1,
        limit: 1000,
      });

      const header = 'Timestamp,Actor Name,Actor Email,Action,Resource Type,Resource Title,IP Address\n';
      const rows = result.logs.map((log: any) => {
        const clean = (val: string = '') => `"${val.replace(/"/g, '""')}"`;
        return [
          clean(log.createdAt),
          clean(log.actorName),
          clean(log.actorEmail),
          clean(log.action),
          clean(log.resourceType),
          clean(log.resourceTitle || ''),
          clean(log.ipAddress),
        ].join(',');
      }).join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="audit_logs.csv"');
      res.status(200).send(header + rows);
    } catch (error) {
      next(error);
    }
  }
}

export const auditController = new AuditController();

