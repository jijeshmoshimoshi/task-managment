import Redis from 'ioredis';
import { env } from './env';
import { logger } from './logger';

export class RedisManager {
  private static instance: RedisManager;
  private client: Redis | null = null;

  private constructor() {}

  public static getInstance(): RedisManager {
    if (!RedisManager.instance) {
      RedisManager.instance = new RedisManager();
    }
    return RedisManager.instance;
  }

  public getClient(): Redis {
    if (!this.client) {
      this.client = new Redis({
        host: env.REDIS_HOST,
        port: env.REDIS_PORT,
        password: env.REDIS_PASSWORD || undefined,
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        retryStrategy(times) {
          const delay = Math.min(times * 100, 3000);
          return delay;
        },
      });

      this.client.on('connect', () => {
        logger.info('⚡ Redis connected successfully');
      });

      this.client.on('error', (err) => {
        logger.error({ err }, '❌ Redis connection error');
      });
    }

    return this.client;
  }

  public async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      logger.info('⚡ Redis connection closed gracefully');
    }
  }

  public async getStatus(): Promise<{ status: 'healthy' | 'unhealthy'; pingMs?: number }> {
    if (!this.client) {
      return { status: 'unhealthy' };
    }
    const start = Date.now();
    try {
      const reply = await this.client.ping();
      const pingMs = Date.now() - start;
      return {
        status: reply === 'PONG' ? 'healthy' : 'unhealthy',
        pingMs,
      };
    } catch {
      return { status: 'unhealthy' };
    }
  }
}

export const redisManager = RedisManager.getInstance();
export const redisClient = redisManager.getClient();
