/**
 * Utility functions for error handling
 */

/**
 * Custom API Error class
 * @extends Error
 */
export class ApiError extends Error {
  /**
   * Create a new API error
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code
   * @param {*} details - Additional error details
   */
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Not Found Error (404)
 * @extends ApiError
 */
export class NotFoundError extends ApiError {
  constructor(message = 'Resource not found', details = null) {
    super(message, 404, details);
  }
}

/**
 * Bad Request Error (400)
 * @extends ApiError
 */
export class BadRequestError extends ApiError {
  constructor(message = 'Bad request', details = null) {
    super(message, 400, details);
  }
}

/**
 * Unauthorized Error (401)
 * @extends ApiError
 */
export class UnauthorizedError extends ApiError {
  constructor(message = 'Unauthorized', details = null) {
    super(message, 401, details);
  }
}

/**
 * Forbidden Error (403)
 * @extends ApiError
 */
export class ForbiddenError extends ApiError {
  constructor(message = 'Forbidden', details = null) {
    super(message, 403, details);
  }
}

/**
 * Validation Error (422)
 * @extends ApiError
 */
export class ValidationError extends ApiError {
  constructor(message = 'Validation failed', details = null) {
    super(message, 422, details);
  }
}

/**
 * Global error handler middleware
 * @param {Error} err - The error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);
  
  // Default error
  let statusCode = 500;
  let message = 'Internal Server Error';
  let details = null;
  
  // Handle custom API errors
  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    details = err.details;
  } else if (err.name === 'SequelizeValidationError') {
    // Handle Sequelize validation errors
    statusCode = 422;
    message = 'Validation Error';
    details = err.errors.map(e => ({ 
      field: e.path, 
      message: e.message 
    }));
  }
  
  // Build error response
  const errorResponse = {
    success: false,
    statusCode,
    message,
    timestamp: new Date().toISOString()
  };
  
  // Add details in non-production environments
  if (details && process.env.NODE_ENV !== 'production') {
    errorResponse.details = details;
    errorResponse.stack = err.stack;
  }
  
  res.status(statusCode).json(errorResponse);
};
