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

import { NextResponse } from 'next/server';

interface ErrorResponse {
  error: string;
  details?: string;
  stack?: string;
}

/**
 * Send standardized error response
 *
 * @param statusCode - HTTP status code
 * @param message - User-friendly error message
 * @param error - Error object (details only shown in dev)
 */
export function sendError(
  statusCode: number,
  message: string,
  error: Error | null = null
): NextResponse<ErrorResponse> {
  const response: ErrorResponse = { error: message };

  // Only include error details in development for debugging
  if (process.env.NODE_ENV === 'development' && error) {
    response.details = error.message;
    response.stack = error.stack;
  }

  return NextResponse.json(response, { status: statusCode });
}

/**
 * Send 400 Bad Request error
 *
 * Use for invalid user input or malformed requests.
 *
 * @param message - Error description
 *
 * @example
 * return badRequest('Missing required parameter: typeId');
 */
export function badRequest(message: string): NextResponse<ErrorResponse> {
  return sendError(400, message);
}

/**
 * Send 401 Unauthorized error
 *
 * Use when authentication is required but not provided.
 *
 * @param message - Error description
 *
 * @example
 * return unauthorized('Invalid or expired token');
 */
export function unauthorized(message = 'Authentication required'): NextResponse<ErrorResponse> {
  return sendError(401, message);
}

/**
 * Send 403 Forbidden error
 *
 * Use when user is authenticated but lacks permission.
 *
 * @param message - Error description
 *
 * @example
 * return forbidden('Admin access required');
 */
export function forbidden(message = 'Access denied'): NextResponse<ErrorResponse> {
  return sendError(403, message);
}

/**
 * Send 404 Not Found error
 *
 * Use when requested resource doesn't exist.
 *
 * @param message - Error description
 *
 * @example
 * return notFound('Contract not found');
 */
export function notFound(message = 'Resource not found'): NextResponse<ErrorResponse> {
  return sendError(404, message);
}

/**
 * Send 500 Internal Server Error
 *
 * Use for unexpected errors and exceptions.
 * Logs error to console automatically.
 *
 * @param message - User-friendly error message
 * @param error - Error object (for logging and dev details)
 *
 * @example
 * try {
 *   await db.query(...);
 * } catch (error) {
 *   return internalError('Failed to fetch contracts', error);
 * }
 */
export function internalError(
  message: string,
  error: Error | null = null
): NextResponse<ErrorResponse> {
  console.error('[ERROR]', message, error);
  return sendError(500, message, error);
}
