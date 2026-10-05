import { db } from '../../config/database';
import { redisManager } from '../../config/redis';

export interface HealthCheckResult {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  uptime: number;
  environment: string;
  version: string;
  services: {
    database: {
      status: 'healthy' | 'unhealthy';
      readyState: number;
    };
    redis: {
      status: 'healthy' | 'unhealthy';
      pingMs?: number;
    };
    memory: {
      usedRssMb: number;
      heapUsedMb: number;
      heapTotalMb: number;
    };
  };
}

export class HealthService {
  public async getHealth(): Promise<HealthCheckResult> {
    const dbStatus = db.getStatus();
    const redisStatus = await redisManager.getStatus();
    const mem = process.memoryUsage();

    const isHealthy = dbStatus.status === 'healthy' && redisStatus.status === 'healthy';

    return {
      status: isHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
      services: {
        database: dbStatus,
        redis: redisStatus,
        memory: {
          usedRssMb: Math.round(mem.rss / 1024 / 1024),
          heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
          heapTotalMb: Math.round(mem.heapTotal / 1024 / 1024),
        },
      },
    };
  }

  public getLiveness(): { status: 'alive'; timestamp: string } {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
    };
  }
}

export const healthService = new HealthService();
