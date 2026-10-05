import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { redisClient } from '../../config/redis';
import { env } from '../../config/env';
import { RateLimitError } from '../errors/app-error';

// Standard rate limiter for API endpoints
export const createRateLimiter = (options?: {
  windowMs?: number;
  max?: number;
  message?: string;
  prefix?: string;
}) => {
  const windowMs = options?.windowMs || env.RATE_LIMIT_WINDOW_MS;
  const max = options?.max || env.RATE_LIMIT_MAX;

  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
      // @ts-expect-error - ioredis sendCommand signature compatibility
      sendCommand: (...args: string[]) => redisClient.call(...args),
      prefix: options?.prefix ? `rl:${options.prefix}:` : 'rl:global:',
    }),
    handler: (_req, _res, next) => {
      next(new RateLimitError(options?.message));
    },
    skip: () => env.NODE_ENV === 'test',
  });
};

export const globalRateLimiter = createRateLimiter();

// Stricter rate limiter for auth / sensitive endpoints
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 10, // 10 attempts
  message: 'Too many authentication attempts. Please try again after 15 minutes.',
  prefix: 'auth',
});
