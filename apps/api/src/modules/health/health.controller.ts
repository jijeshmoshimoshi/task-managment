import { Request, Response, NextFunction } from 'express';
import { healthService } from './health.service';

export class HealthController {
  public async getHealth(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const health = await healthService.getHealth();
      const statusCode = health.status === 'ok' ? 200 : 503;
      res.status(statusCode).json({
        success: health.status === 'ok',
        data: health,
      });
    } catch (error) {
      next(error);
    }
  }

  public getLiveness(_req: Request, res: Response): void {
    const live = healthService.getLiveness();
    res.status(200).json({
      success: true,
      data: live,
    });
  }
}

export const healthController = new HealthController();
