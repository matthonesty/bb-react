/**
 * @fileoverview Input validation utilities for API endpoints
 *
 * Provides centralized validation functions for common input patterns.
 * Prevents security issues from invalid or malicious input.
 *
 * Security Features:
 * - Type checking with safe parseInt
 * - Bounds validation (min/max)
 * - Null/undefined string sanitization
 * - Default value fallbacks
 *
 * @module lib/utils/validation
 */

/**
 * Parse and validate integer with bounds checking
 *
 * Safely parses string to integer with optional min/max constraints.
 * Returns default value if parsing fails or value is out of bounds.
 *
 * @param value - Value to parse
 * @param defaultValue - Default if invalid or out of bounds
 * @param min - Minimum allowed value (inclusive)
 * @param max - Maximum allowed value (inclusive)
 * @returns Validated integer
 *
 * @example
 * parseIntWithBounds('42', 1, 1, 100)  // Returns: 42
 * parseIntWithBounds('abc', 1, 1, 100) // Returns: 1 (default)
 * parseIntWithBounds('-5', 1, 1, 100)  // Returns: 1 (below min)
 * parseIntWithBounds('200', 1, 1, 100) // Returns: 100 (above max)
 */
export function parseIntWithBounds(
  value: string | number,
  defaultValue: number,
  min: number | null = null,
  max: number | null = null
): number {
  const parsed = parseInt(String(value));

  // Return default if parsing failed
  if (isNaN(parsed)) {
    return defaultValue;
  }

  // Clamp to min boundary
  if (min !== null && parsed < min) {
    return min;
  }

  // Clamp to max boundary
  if (max !== null && parsed > max) {
    return max;
  }

  return parsed;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

/**
 * Validate pagination parameters (page and limit)
 *
 * Standard validation for paginated API endpoints.
 * Ensures page is positive and limit is within reasonable bounds.
 *
 * @param query - Request query object
 * @returns Validated pagination params with page (min: 1) and limit (min: 1, max: 100, default: 25)
 *
 * @example
 * validatePagination({ page: '2', limit: '50' })
 * // Returns: { page: 2, limit: 50 }
 *
 * validatePagination({ page: '-1', limit: '200' })
 * // Returns: { page: 1, limit: 100 } (clamped to bounds)
 *
 * validatePagination({})
 * // Returns: { page: 1, limit: 25 } (defaults)
 */
export function validatePagination(query: {
  page?: string | number;
  limit?: string | number;
}): PaginationParams {
  const page = parseIntWithBounds(query.page ?? 1, 1, 1, null);
  const limit = parseIntWithBounds(query.limit ?? 25, 25, 1, 100);

  return { page, limit };
}

/**
 * Remove 'null' and 'undefined' string values from query params
 *
 * Frontend sometimes sends ?param=null or ?param=undefined instead of
 * omitting the parameter. This function sanitizes query objects by
 * removing these string values.
 *
 * @param query - Request query object
 * @returns Sanitized query object (new object, not mutated)
 *
 * @example
 * sanitizeQueryParams({ foo: 'bar', baz: 'null', qux: 'undefined' })
 * // Returns: { foo: 'bar' }
 *
 * sanitizeQueryParams({ id: '123', name: null })
 * // Returns: { id: '123' }
 */
export function sanitizeQueryParams<T extends Record<string, unknown>>(query: T): Partial<T> {
  const sanitized: Partial<T> = {};

  for (const [key, value] of Object.entries(query)) {
    // Skip string 'null', 'undefined', actual null, and actual undefined
    if (value !== 'null' && value !== 'undefined' && value !== null && value !== undefined) {
      sanitized[key as keyof T] = value as T[keyof T];
    }
  }

  return sanitized;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate required parameter exists and is not empty
 *
 * Checks if a required parameter is present and non-empty.
 * Useful for parameters that must be provided.
 *
 * @param value - Parameter value to validate
 * @param paramName - Parameter name (for error message)
 * @returns Validation result
 *
 * @example
 * validateRequired('123', 'contractId')
 * // Returns: { valid: true }
 *
 * validateRequired('', 'contractId')
 * // Returns: { valid: false, error: 'Missing required parameter: contractId' }
 *
 * validateRequired(null, 'typeId')
 * // Returns: { valid: false, error: 'Missing required parameter: typeId' }
 */
export function validateRequired(value: unknown, paramName: string): ValidationResult {
  if (
    value === null ||
    value === undefined ||
    value === '' ||
    value === 'null' ||
    value === 'undefined'
  ) {
    return {
      valid: false,
      error: `Missing required parameter: ${paramName}`,
    };
  }

  return { valid: true };
}
