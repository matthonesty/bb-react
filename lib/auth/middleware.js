/**
 * @fileoverview Authentication middleware for serverless functions
 *
 * Provides JWT-based authentication with automatic token refresh.
 * Designed for Vercel serverless functions where traditional session
 * middleware (like express-session) is not available.
 *
 * Authentication Flow:
 * 1. Extract auth_data cookie from request
 * 2. Parse JSON auth data (contains refreshToken, expiresAt, character, roles)
 * 3. Get fresh access token using refresh token if needed
 * 4. Cache access token in memory for duration of request
 * 5. Return authentication status and character info with access token
 *
 * Cookie Structure (auth_data):
 * {
 *   refreshToken: "OjU3...",      // Long-lived refresh token
 *   expiresAt: 1234567890000,     // Unix timestamp (milliseconds)
 *   character: {
 *     id: 12345,                  // Character ID
 *     name: "Character Name",     // Character name
 *     ownerHash: "abc..."         // Unique account+character hash
 *   },
 *   roles: ["user", "admin"],     // Assigned roles
 *   accessToken: "..."            // Access token (if it fits in cookie)
 * }
 *
 * Note: Access tokens may not be stored in cookies if they exceed size limits.
 * All users now use publicData scope only, so tokens are typically small enough.
 * If access token is missing, we refresh it on request (lightweight operation).
 *
 * Security:
 * - Cookies are httpOnly (not accessible to JavaScript)
 * - Cookies use secure flag (HTTPS only)
 * - SameSite=lax prevents CSRF attacks
 * - 7-day expiration for auth cookie
 * - Automatic token refresh on expiration
 */

import cookie from 'cookie';
import evesso from './sso.js';
import { getRoles, ROLES } from './roles.js';
import { COOKIE_OPTIONS } from '../utils/cookieOptions.js';

/**
 * Authentication middleware for serverless functions
 *
 * Validates authentication cookie and automatically refreshes expired tokens.
 * Returns authentication status with character information if authenticated.
 *
 * Authentication States:
 * - authenticated=true: Valid token, character info available
 * - authenticated=false: No cookie, invalid cookie, expired token, or refresh failed
 *
 * Automatic Token Refresh:
 * - Triggers when access token is expired (Date.now() >= expiresAt)
 * - Uses refresh token to obtain new access token
 * - Updates cookie with new tokens
 * - New refresh token invalidates old one
 *
 * @param {Object} req - HTTP request object (with headers.cookie)
 * @param {Object} res - HTTP response object (for setting cookies)
 * @returns {Promise<Object>} Authentication result object
 * @property {boolean} authenticated - Whether request is authenticated
 * @property {Object} [character] - Character info if authenticated
 * @property {number} [character.id] - Character ID
 * @property {string} [character.name] - Character name
 * @property {string} [accessToken] - Access token if authenticated
 * @property {string} [error] - Error message if not authenticated
 *
 * @example
 * // In a Vercel serverless function
 * const auth = await requireAuth(req, res);
 * if (!auth.authenticated) {
 *   return res.status(401).json({ error: 'Unauthorized' });
 * }
 * console.log(`Authenticated as: ${auth.character.name}`);
 */
async function requireAuth(req, res) {
  try {
    // Parse cookies
    const cookies = cookie.parse(req.headers.cookie || '');
    const authDataStr = cookies.auth_data;

    if (!authDataStr) {
      return {
        authenticated: false,
        error: 'Not authenticated'
      };
    }

    let authData;
    try {
      authData = JSON.parse(authDataStr);
    } catch (e) {
      return {
        authenticated: false,
        error: 'Invalid auth data'
      };
    }

    // All users now use the same regular SSO (publicData scope only)
    // No need to differentiate between admin/moderator/regular users for token refresh
    const ssoService = evesso;

    let accessToken = authData.accessToken; // May be undefined if not stored
    let needsRefresh = false;

    // Check if we need to refresh the token
    if (!accessToken) {
      // No access token stored (token may have been too large for cookie)
      needsRefresh = true;
    } else if (Date.now() >= authData.expiresAt) {
      // Access token expired
      needsRefresh = true;
    }

    // Refresh token if needed (only when expired or not stored)
    if (needsRefresh) {
      try {
        const tokenResponse = await ssoService.refreshAccessToken(authData.refreshToken);

        accessToken = tokenResponse.access_token;
        authData.expiresAt = Date.now() + (tokenResponse.expires_in * 1000);
        authData.refreshToken = tokenResponse.refresh_token;

        // Try to store access token in cookie (only if it's small enough)
        // All tokens should fit now (publicData scope only)
        const testAuthData = { ...authData, accessToken };
        const testCookie = cookie.serialize('auth_data', JSON.stringify(testAuthData), COOKIE_OPTIONS.SESSION);

        // If cookie size is under 4KB, store the access token
        if (testCookie.length < 4000) {
          authData.accessToken = accessToken;
        }
        // Otherwise, don't store access token (will refresh next request)

        // Update cookie
        res.setHeader('Set-Cookie', cookie.serialize('auth_data', JSON.stringify(authData), COOKIE_OPTIONS.SESSION));
      } catch (error) {
        // Refresh failed - provide user-friendly error message
        console.error('Token refresh failed:', error.message);

        // Determine error type for better user messaging
        let errorMessage = 'Token refresh failed';
        if (error.message?.includes('invalid_grant') || error.message?.includes('Invalid refresh token')) {
          errorMessage = 'Session expired - please log in again';
        } else if (error.message?.includes('network') || error.message?.includes('timeout') || error.message?.includes('ECONNREFUSED')) {
          errorMessage = 'Network error - please try again';
        } else if (error.message?.includes('ETIMEDOUT') || error.message?.includes('ENOTFOUND')) {
          errorMessage = 'Connection timeout - please check your network';
        }

        return {
          authenticated: false,
          error: errorMessage
        };
      }
    }

    // Get roles from environment variables and database (single source of truth)
    const roles = await getRoles(authData.character.id);

    // Check if user has any authorized role (admin or any FC role)
    const hasAuthorizedRole = roles.some(role =>
      role === ROLES.ADMIN ||
      role === ROLES.COUNCIL ||
      role === ROLES.ACCOUNTANT ||
      role === ROLES.OBOMBERCARE ||
      role === ROLES.FC
    );

    if (!hasAuthorizedRole) {
      return {
        authenticated: false,
        error: 'Not Authorized - You do not have access to this system'
      };
    }

    // Return auth data with fresh access token
    return {
      authenticated: true,
      character: authData.character,
      accessToken: accessToken,
      roles: roles,
      isAdminToken: authData.isAdminToken || false,
      isModeratorToken: authData.isModeratorToken || false
    };
  } catch (error) {
    console.error('Auth middleware error:', error);
    return {
      authenticated: false,
      error: 'Authentication check failed'
    };
  }
}

/**
 * Admin-only authentication middleware
 *
 * Extends requireAuth to verify user has admin role.
 * Returns 403 Forbidden if authenticated but not an admin.
 * Returns 401 Unauthorized if not authenticated.
 *
 * @param {Object} req - HTTP request object
 * @param {Object} res - HTTP response object
 * @returns {Promise<Object|null>} Auth object if admin, null if rejected (response already sent)
 *
 * @example
 * // Admin-only API endpoint
 * module.exports = async (req, res) => {
 *   const auth = await requireAdmin(req, res);
 *   if (!auth) return; // Response already sent
 *
 *   // Admin-only logic here
 *   res.json({ message: 'Admin access granted' });
 * };
 */
async function requireAdmin(req, res) {
  const auth = await requireAuth(req, res);

  if (!auth.authenticated) {
    res.status(401).json({ error: 'Authentication required' });
    return null;
  }

  if (!auth.roles || !auth.roles.includes(ROLES.ADMIN)) {
    res.status(403).json({
      error: 'Forbidden',
      message: 'Admin privileges required'
    });
    return null;
  }

  return auth;
}

/**
 * Moderator access authentication middleware
 *
 * Extends requireAuth to verify user has either admin role OR moderator role.
 * Returns 403 Forbidden if authenticated but lacks required roles.
 * Returns 401 Unauthorized if not authenticated.
 *
 * This allows moderators to access content management endpoints (unknown systems,
 * contract removals) without full admin privileges (subscriptions, system operations).
 *
 * @param {Object} req - HTTP request object
 * @param {Object} res - HTTP response object
 * @returns {Promise<Object|null>} Auth object if authorized, null if rejected (response already sent)
 *
 * @example
 * // Moderator-accessible endpoint
 * module.exports = async (req, res) => {
 *   const auth = await requireModerator(req, res);
 *   if (!auth) return; // Response already sent
 *
 *   // Moderator-accessible logic here
 *   res.json({ message: 'Access granted' });
 * };
 */
async function requireModerator(req, res) {
  const auth = await requireAuth(req, res);

  if (!auth.authenticated) {
    res.status(401).json({ error: 'Authentication required' });
    return null;
  }

  if (!auth.roles || (!auth.roles.includes(ROLES.ADMIN) && !auth.roles.includes(ROLES.MODERATOR))) {
    res.status(403).json({
      error: 'Forbidden',
      message: 'Admin or moderator access required'
    });
    return null;
  }

  return auth;
}

/**
 * Check authentication without role requirements
 *
 * Similar to requireAuth but returns authenticated=true for ANY valid session,
 * regardless of roles. Use this for public pages that need to know if someone
 * is logged in but don't require specific permissions.
 *
 * @param {Object} req - HTTP request object
 * @param {Object} res - HTTP response object
 * @returns {Promise<Object>} Authentication result (authenticated: true for any valid token)
 */
async function checkAuth(req, res) {
  try {
    // Parse cookies
    const cookies = cookie.parse(req.headers.cookie || '');
    const authDataStr = cookies.auth_data;

    if (!authDataStr) {
      return {
        authenticated: false,
        error: 'Not authenticated'
      };
    }

    let authData;
    try {
      authData = JSON.parse(authDataStr);
    } catch (e) {
      return {
        authenticated: false,
        error: 'Invalid auth data'
      };
    }

    const ssoService = evesso;
    let accessToken = authData.accessToken;
    let needsRefresh = false;

    // Check if we need to refresh the token
    if (!accessToken) {
      needsRefresh = true;
    } else if (Date.now() >= authData.expiresAt) {
      needsRefresh = true;
    }

    // Refresh token if needed
    if (needsRefresh) {
      try {
        const tokenResponse = await ssoService.refreshAccessToken(authData.refreshToken);
        accessToken = tokenResponse.access_token;
        authData.expiresAt = Date.now() + (tokenResponse.expires_in * 1000);
        authData.refreshToken = tokenResponse.refresh_token;

        const testAuthData = { ...authData, accessToken };
        const testCookie = cookie.serialize('auth_data', JSON.stringify(testAuthData), COOKIE_OPTIONS.SESSION);

        if (testCookie.length < 4000) {
          authData.accessToken = accessToken;
        }

        res.setHeader('Set-Cookie', cookie.serialize('auth_data', JSON.stringify(authData), COOKIE_OPTIONS.SESSION));
      } catch (error) {
        console.error('Token refresh failed:', error.message);
        return {
          authenticated: false,
          error: 'Session expired - please log in again'
        };
      }
    }

    // Get roles but don't require any specific ones
    const roles = await getRoles(authData.character.id);

    // Return auth data - authenticated as long as token is valid
    return {
      authenticated: true,
      character: authData.character,
      accessToken: accessToken,
      roles: roles,
      isAdminToken: authData.isAdminToken || false,
      isModeratorToken: authData.isModeratorToken || false
    };
  } catch (error) {
    console.error('Auth check error:', error);
    return {
      authenticated: false,
      error: 'Authentication check failed'
    };
  }
}

export { requireAuth, requireAdmin, requireModerator, checkAuth, ROLES };
