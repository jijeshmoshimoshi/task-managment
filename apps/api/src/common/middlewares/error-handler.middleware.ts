import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/app-error';
import { logger } from '../../config/logger';
import { ERROR_CODES } from '@taskmaster/shared';
import { env } from '../../config/env';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void => {
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error({ err, path: req.path, method: req.method }, '💥 Operational Server Error');
    }

    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
        statusCode: err.statusCode,
        timestamp: new Date().toISOString(),
        path: req.originalUrl,
      },
    });
    return;
  }

  // Handle direct Zod errors if uncaught
  if (err.name === 'ZodError' || Array.isArray((err as any).issues) || Array.isArray((err as any).errors)) {
    const issues = (err as any).errors || (err as any).issues || [];
    const details = issues.map((e: any) => ({
      field: Array.isArray(e.path) ? e.path.join('.') : String(e.path ?? ''),
      message: e.message,
      code: e.code,
    }));
    res.status(422).json({
      success: false,
      error: {
        code: ERROR_CODES.VALIDATION_ERROR,
        message: 'Request validation failed',
        details,
        statusCode: 422,
        timestamp: new Date().toISOString(),
        path: req.originalUrl,
      },
    });
    return;
  }

  // Unhandled / unexpected errors
  logger.error(
    {
      err: {
        message: err.message,
        stack: err.stack,
        name: err.name,
      },
      path: req.path,
      method: req.method,
    },
    '🔥 Unhandled Exception in API',
  );

  res.status(500).json({
    success: false,
    error: {
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      message:
        env.NODE_ENV === 'production'
          ? 'An unexpected error occurred. Please try again later.'
          : err.message,
      statusCode: 500,
      timestamp: new Date().toISOString(),
      path: req.originalUrl,
    },
  });
};
