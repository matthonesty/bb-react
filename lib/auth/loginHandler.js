/**
 * @fileoverview Shared OAuth Login Handler
 *
 * Provides common login initiation logic for OAuth flows.
 * Used by /auth/login (regular users) and /auth/mailer-login (service account).
 *
 * @module lib/auth/loginHandler
 */

const cookie = require('cookie');
const { COOKIE_OPTIONS } = require('../utils/cookieOptions');
const { internalError } = require('../utils/errorResponse');

/**
 * Initiate OAuth login flow
 *
 * Generates CSRF state token, stores it in a cookie, and redirects
 * user to EVE SSO authorization page with requested scopes.
 *
 * Flow:
 * 1. Generate random state parameter (CSRF protection)
 * 2. Build EVE SSO authorization URL with scopes
 * 3. Store state in httpOnly cookie (expires in 10 minutes)
 * 4. For special flows (mailer), encode flow type in state
 * 5. Redirect user to EVE SSO for authentication
 *
 * @param {Object} ssoService - EVE SSO service instance (evesso or mailerSso)
 * @param {string[]|string} scopes - OAuth scopes to request
 * @param {string|boolean} [flowType=false] - Flow type identifier ('mailer' or false for regular)
 * @returns {Function} Express route handler function
 *
 * @example
 * // Regular login endpoint (for all users including admins)
 * const { initiateLogin } = require('../../lib/auth/loginHandler');
 * const evesso = require('../../lib/auth/sso');
 * const { REGULAR_USER_SCOPES } = require('../../lib/auth/userScopes');
 *
 * module.exports = initiateLogin(evesso, REGULAR_USER_SCOPES, false);
 *
 * @example
 * // Mailer service account login endpoint
 * const { initiateLogin } = require('../../lib/auth/loginHandler');
 * const mailerSso = require('../../lib/auth/mailerSso');
 * const { MAILER_SCOPES } = require('../../lib/auth/mailerScopes');
 *
 * module.exports = initiateLogin(mailerSso, MAILER_SCOPES, 'mailer');
 */
function initiateLogin(ssoService, scopes, flowType = false) {
  return async (req, res) => {
    try {
      // Generate random state for CSRF protection and encode flow type
      const randomState = ssoService.generateState();

      // Get return URL from query parameter (for redirect after login)
      const returnUrl = req.query.return_url || '';

      // Encode flow type and return URL in state parameter
      // Format: "randomstate:flow:returnurl" or "randomstate::returnurl" if no flow
      let state = randomState;
      if (flowType || returnUrl) {
        const flow = flowType || '';
        const encodedReturnUrl = returnUrl ? encodeURIComponent(returnUrl) : '';
        state = `${randomState}:${flow}:${encodedReturnUrl}`;
      }

      const authUrl = ssoService.getAuthorizationUrl(state, scopes);

      // Only set state cookie for CSRF protection
      res.setHeader('Set-Cookie', cookie.serialize('auth_state', state, COOKIE_OPTIONS.SHORT_LIVED));

      // Redirect to EVE SSO authorization page
      res.writeHead(302, { Location: authUrl });
      res.end();
    } catch (error) {
      return internalError(res, 'Failed to initiate login', error);
    }
  };
}

module.exports = { initiateLogin };
