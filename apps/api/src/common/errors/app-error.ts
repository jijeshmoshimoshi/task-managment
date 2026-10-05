import { ErrorCode, ERROR_CODES } from '@taskmaster/shared';

export interface AppErrorOptions {
  code: ErrorCode;
  message: string;
  statusCode?: number;
  details?: Array<{ field?: string; message: string; code?: string }>;
  isOperational?: boolean;
}

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: Array<{ field?: string; message: string; code?: string }>;
  public readonly isOperational: boolean;

  constructor(options: AppErrorOptions) {
    super(options.message);
    this.name = this.constructor.name;
    this.code = options.code;
    this.statusCode = options.statusCode || 500;
    this.details = options.details;
    this.isOperational = options.isOperational !== undefined ? options.isOperational : true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad Request', details?: Array<{ field?: string; message: string }>) {
    super({
      code: ERROR_CODES.BAD_REQUEST,
      message,
      statusCode: 400,
      details,
    });
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', details?: Array<{ field?: string; message: string }>) {
    super({
      code: ERROR_CODES.VALIDATION_ERROR,
      message,
      statusCode: 422,
      details,
    });
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized', code: ErrorCode = ERROR_CODES.AUTH_UNAUTHORIZED) {
    super({
      code,
      message,
      statusCode: 401,
    });
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Permission denied', code: ErrorCode = ERROR_CODES.FORBIDDEN) {
    super({
      code,
      message,
      statusCode: 403,
    });
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource', id?: string | string[]) {
    const idStr = Array.isArray(id) ? id.join(',') : id;
    super({
      code: ERROR_CODES.NOT_FOUND,
      message: idStr ? `${resource} with ID '${idStr}' was not found` : `${resource} not found`,
      statusCode: 404,
    });
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource already exists', code: ErrorCode = ERROR_CODES.ALREADY_EXISTS) {
    super({
      code,
      message,
      statusCode: 409,
    });
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Too many requests. Please try again later.') {
    super({
      code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
      message,
      statusCode: 429,
    });
  }
}
