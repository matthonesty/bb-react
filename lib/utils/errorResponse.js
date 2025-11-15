/**
 * @fileoverview Standard error response formatter for API endpoints
 *
 * Provides consistent error response format across all API endpoints.
 * Automatically hides error details in production for security.
 *
 * Security Features:
 * - Error details only shown in development mode
 * - Stack traces hidden in production
 * - Consistent error structure prevents information leakage
 *
 * @module lib/utils/errorResponse
 */

/**
 * Send standardized error response
 *
 * @param {Object} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {string} message - User-friendly error message
 * @param {Error} [error=null] - Error object (details only shown in dev)
 */
function sendError(res, statusCode, message, error = null) {
  const response = { error: message };

  // Only include error details in development for debugging
  if (process.env.NODE_ENV === 'development' && error) {
    response.details = error.message;
    response.stack = error.stack;
  }

  res.status(statusCode).json(response);
}

/**
 * Send 400 Bad Request error
 *
 * Use for invalid user input or malformed requests.
 *
 * @param {Object} res - Express response object
 * @param {string} message - Error description
 *
 * @example
 * badRequest(res, 'Missing required parameter: typeId');
 */
function badRequest(res, message) {
  sendError(res, 400, message);
}

/**
 * Send 401 Unauthorized error
 *
 * Use when authentication is required but not provided.
 *
 * @param {Object} res - Express response object
 * @param {string} [message='Authentication required'] - Error description
 *
 * @example
 * unauthorized(res, 'Invalid or expired token');
 */
function unauthorized(res, message = 'Authentication required') {
  sendError(res, 401, message);
}

/**
 * Send 403 Forbidden error
 *
 * Use when user is authenticated but lacks permission.
 *
 * @param {Object} res - Express response object
 * @param {string} [message='Access denied'] - Error description
 *
 * @example
 * forbidden(res, 'Admin access required');
 */
function forbidden(res, message = 'Access denied') {
  sendError(res, 403, message);
}

/**
 * Send 404 Not Found error
 *
 * Use when requested resource doesn't exist.
 *
 * @param {Object} res - Express response object
 * @param {string} [message='Resource not found'] - Error description
 *
 * @example
 * notFound(res, 'Contract not found');
 */
function notFound(res, message = 'Resource not found') {
  sendError(res, 404, message);
}

/**
 * Send 500 Internal Server Error
 *
 * Use for unexpected errors and exceptions.
 * Logs error to console automatically.
 *
 * @param {Object} res - Express response object
 * @param {string} message - User-friendly error message
 * @param {Error} [error=null] - Error object (for logging and dev details)
 *
 * @example
 * try {
 *   await db.query(...);
 * } catch (error) {
 *   return internalError(res, 'Failed to fetch contracts', error);
 * }
 */
function internalError(res, message, error = null) {
  console.error('[ERROR]', message, error);
  sendError(res, 500, message, error);
}

export { sendError, badRequest, unauthorized, forbidden, notFound, internalError };
