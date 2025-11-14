/**
 * @fileoverview Centralized cookie options for authentication cookies
 *
 * Provides standard, secure cookie configurations used across all auth endpoints.
 * All cookies use httpOnly, secure, and sameSite for security.
 *
 * Security Features:
 * - httpOnly: true - Prevents JavaScript access (XSS protection)
 * - secure: true - HTTPS only (prevents MITM attacks)
 * - sameSite: 'lax' - CSRF protection
 * - path: '/' - Available to all routes
 *
 * @module lib/utils/cookieOptions
 */

/**
 * Standard cookie options for different use cases
 * @constant {Object}
 */
const COOKIE_OPTIONS = {
  /**
   * Short-lived cookie (10 minutes)
   * Used for: CSRF state tokens, admin flow flags
   * @type {Object}
   */
  SHORT_LIVED: {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 10 * 60, // 10 minutes
    path: '/'
  },

  /**
   * Session cookie (7 days)
   * Used for: Authentication data (access/refresh tokens, character info)
   * @type {Object}
   */
  SESSION: {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: '/'
  },

  /**
   * Delete cookie (maxAge: 0)
   * Used for: Logout, clearing temporary cookies
   * @type {Object}
   */
  DELETE: {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
    expires: new Date(0) // Also set expires to epoch for better compatibility
  }
};

module.exports = { COOKIE_OPTIONS };
