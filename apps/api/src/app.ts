import express, { Express, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import { env } from './config/env';
import { errorHandler } from './common/middlewares/error-handler.middleware';
import { requestLogger } from './common/middlewares/request-logger.middleware';
import { NotFoundError } from './common/errors/app-error';
import { healthRouter } from './modules/health/health.router';
import { authRouter } from './modules/auth/auth.router';
import { auditRouter } from './modules/audit/audit.router';
import { orgRouter, departmentRouter, teamRouter } from './modules/orgs/org.router';
import { userRouter } from './modules/users/user.router';
import { projectRouter } from './modules/projects/project.router';
import { taskRouter } from './modules/tasks/task.router';
import { analyticsRouter } from './modules/analytics/analytics.router';
import { notificationRouter } from './modules/notifications/notification.router';
import { meetingRouter } from './modules/meetings/meeting.router';
import { globalRateLimiter } from './common/middlewares/rate-limiter.middleware';



export function createApp(): Express {
  const app = express();

  // 1. Trust proxy in production behind reverse proxy (load balancer, Cloudflare, etc.)
  if (env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
  }

  // 2. Security Headers (Helmet)
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
      crossOriginEmbedderPolicy: false,
      frameguard: { action: 'deny' },
      hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    }),
  );

  // 3. CORS configuration
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id', 'x-idempotency-key'],
    }),
  );

  // 4. Request parsing and sanitization
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));
  app.use(cookieParser(env.COOKIE_SECRET));
  app.use(mongoSanitize({ replaceWith: '_' }));
  app.use(hpp());
  app.use(compression());

  // 5. Global Logging & Rate Limiting
  app.use(requestLogger);
  app.use(globalRateLimiter);

  // 6. Base Routes
  app.use('/health', healthRouter);

  // 7. API v1 Router Mount
  const apiRouter = express.Router();
  apiRouter.use('/health', healthRouter);
  apiRouter.use('/auth', authRouter);
  apiRouter.use('/audit-logs', auditRouter);
  apiRouter.use('/orgs', orgRouter);
  apiRouter.use('/departments', departmentRouter);
  apiRouter.use('/teams', teamRouter);
  apiRouter.use('/users', userRouter);
  apiRouter.use('/projects', projectRouter);
  apiRouter.use('/tasks', taskRouter);
  apiRouter.use('/analytics', analyticsRouter);
  apiRouter.use('/notifications', notificationRouter);
  apiRouter.use('/meetings', meetingRouter);

  app.use(env.API_PREFIX, apiRouter);




  // 8. 404 Handler
  app.use((req: Request, _res: Response, next: NextFunction) => {
    next(new NotFoundError(`Route ${req.method} ${req.originalUrl}`));
  });

  // 9. Central Error Handler
  app.use(errorHandler);

  return app;
}
