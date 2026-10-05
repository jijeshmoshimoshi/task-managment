import { Request, Response, NextFunction } from 'express';
import { logger } from '../../config/logger';

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  const requestId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  req.headers['x-request-id'] = requestId;
  res.setHeader('x-request-id', requestId);

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info(
      {
        requestId,
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        durationMs: duration,
        ip: req.ip || req.socket.remoteAddress,
        userAgent: req.get('user-agent'),
      },
      `${req.method} ${req.originalUrl} ${res.statusCode} in ${duration}ms`,
    );
  });

  next();
};
