export const ErrorCodes = {
  MISSING_TOKEN: 'MISSING_TOKEN',
  INVALID_TOKEN: 'INVALID_TOKEN',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  DATABASE_UNAVAILABLE: 'DATABASE_UNAVAILABLE',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  CONFIG_ERROR: 'CONFIG_ERROR'
};

export function createErrorResponse(message, code = ErrorCodes.INTERNAL_ERROR, details = null) {
  const response = {
    error: true,
    message,
    code,
    timestamp: new Date().toISOString()
  };

  if (details) {
    response.details = details;
  }

  return response;
}

export class LogTapError extends Error {
  constructor(message, code = ErrorCodes.INTERNAL_ERROR, statusCode = 500) {
    super(message);
    this.name = 'LogTapError';
    this.code = code;
    this.statusCode = statusCode;
  }

  toResponse() {
    return createErrorResponse(this.message, this.code);
  }
}

export class DatabaseError extends LogTapError {
  constructor(message) {
    super(message, ErrorCodes.DATABASE_ERROR, 500);
    this.name = 'DatabaseError';
  }
}

export class AuthenticationError extends LogTapError {
  constructor(message) {
    super(message, ErrorCodes.INVALID_TOKEN, 401);
    this.name = 'AuthenticationError';
  }
}

export class ValidationError extends LogTapError {
  constructor(message) {
    super(message, ErrorCodes.VALIDATION_ERROR, 400);
    this.name = 'ValidationError';
  }
}

export function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof LogTapError) {
    return res.status(err.statusCode).json(err.toResponse());
  }

  console.error('Unhandled error:', err);

  return res.status(500).json(
    createErrorResponse('An unexpected error occurred', ErrorCodes.INTERNAL_ERROR)
  );
}

export function notFoundHandler(req, res) {
  res.status(404).json(
    createErrorResponse(`Route not found: ${req.method} ${req.path}`, ErrorCodes.NOT_FOUND)
  );
}

export default {
  ErrorCodes,
  createErrorResponse,
  LogTapError,
  DatabaseError,
  AuthenticationError,
  ValidationError,
  errorHandler,
  notFoundHandler
};
