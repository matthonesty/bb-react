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
 * @param {string|number} value - Value to parse
 * @param {number} defaultValue - Default if invalid or out of bounds
 * @param {number|null} [min=null] - Minimum allowed value (inclusive)
 * @param {number|null} [max=null] - Maximum allowed value (inclusive)
 * @returns {number} Validated integer
 *
 * @example
 * parseIntWithBounds('42', 1, 1, 100)  // Returns: 42
 * parseIntWithBounds('abc', 1, 1, 100) // Returns: 1 (default)
 * parseIntWithBounds('-5', 1, 1, 100)  // Returns: 1 (below min)
 * parseIntWithBounds('200', 1, 1, 100) // Returns: 100 (above max)
 */
function parseIntWithBounds(value, defaultValue, min = null, max = null) {
  let parsed = parseInt(value);

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

/**
 * Validate pagination parameters (page and limit)
 *
 * Standard validation for paginated API endpoints.
 * Ensures page is positive and limit is within reasonable bounds.
 *
 * @param {Object} query - Request query object
 * @param {string|number} [query.page] - Page number (1-indexed)
 * @param {string|number} [query.limit] - Items per page
 * @returns {Object} Validated pagination params
 * @property {number} page - Page number (min: 1)
 * @property {number} limit - Items per page (min: 1, max: 100, default: 25)
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
function validatePagination(query) {
  const page = parseIntWithBounds(query.page, 1, 1, null);
  const limit = parseIntWithBounds(query.limit, 25, 1, 100);

  return { page, limit };
}

/**
 * Remove 'null' and 'undefined' string values from query params
 *
 * Frontend sometimes sends ?param=null or ?param=undefined instead of
 * omitting the parameter. This function sanitizes query objects by
 * removing these string values.
 *
 * @param {Object} query - Request query object
 * @returns {Object} Sanitized query object (new object, not mutated)
 *
 * @example
 * sanitizeQueryParams({ foo: 'bar', baz: 'null', qux: 'undefined' })
 * // Returns: { foo: 'bar' }
 *
 * sanitizeQueryParams({ id: '123', name: null })
 * // Returns: { id: '123' }
 */
function sanitizeQueryParams(query) {
  const sanitized = {};

  for (const [key, value] of Object.entries(query)) {
    // Skip string 'null', 'undefined', actual null, and actual undefined
    if (value !== 'null' && value !== 'undefined' && value !== null && value !== undefined) {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Validate required parameter exists and is not empty
 *
 * Checks if a required parameter is present and non-empty.
 * Useful for parameters that must be provided.
 *
 * @param {any} value - Parameter value to validate
 * @param {string} paramName - Parameter name (for error message)
 * @returns {Object} Validation result
 * @property {boolean} valid - Whether parameter is valid
 * @property {string} [error] - Error message if invalid
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
function validateRequired(value, paramName) {
  if (value === null || value === undefined || value === '' || value === 'null' || value === 'undefined') {
    return {
      valid: false,
      error: `Missing required parameter: ${paramName}`
    };
  }

  return { valid: true };
}

export {
  parseIntWithBounds,
  validatePagination,
  sanitizeQueryParams,
  validateRequired
};
