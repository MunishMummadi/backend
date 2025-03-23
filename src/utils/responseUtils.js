/**
 * Utility functions for standardizing API responses
 */

/**
 * Create a standard success response
 * @param {*} data - The data to include in the response
 * @param {string} message - Optional success message
 * @param {number} statusCode - HTTP status code, defaults to 200
 * @returns {Object} Formatted response object
 */
export const successResponse = (data, message = 'Success', statusCode = 200) => {
  return {
    success: true,
    statusCode,
    message,
    data,
    timestamp: new Date().toISOString()
  };
};

/**
 * Create a standard error response
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code, defaults to 500
 * @param {*} error - Optional error details
 * @returns {Object} Formatted error response object
 */
export const errorResponse = (message = 'Internal Server Error', statusCode = 500, error = null) => {
  const response = {
    success: false,
    statusCode,
    message,
    timestamp: new Date().toISOString()
  };
  
  if (error && process.env.NODE_ENV !== 'production') {
    response.error = error.toString();
    response.stack = error.stack;
  }
  
  return response;
};

/**
 * Create a standard paginated response
 * @param {Array} data - The array of items
 * @param {number} page - Current page number
 * @param {number} limit - Items per page
 * @param {number} total - Total number of items
 * @param {string} message - Optional success message
 * @returns {Object} Formatted paginated response
 */
export const paginatedResponse = (data, page, limit, total, message = 'Success') => {
  const totalPages = Math.ceil(total / limit);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;
  
  return {
    success: true,
    statusCode: 200,
    message,
    data,
    pagination: {
      total,
      totalPages,
      currentPage: page,
      limit,
      hasNext,
      hasPrev
    },
    timestamp: new Date().toISOString()
  };
};
