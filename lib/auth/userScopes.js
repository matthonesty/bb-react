/**
 * @fileoverview User OAuth Scope Configuration
 *
 * Defines EVE SSO scopes for regular user authentication.
 * All users (including admins) now use publicData scope only.
 *
 * Admin users get elevated portal permissions based on character ID,
 * not based on OAuth scopes.
 *
 * ESI operations (mail, wallet) are handled by the mailer service account,
 * not by individual user tokens.
 */

/**
 * Regular user scopes (for all human users)
 * Only requests publicData scope - no ESI operation scopes needed
 * @constant {string[]}
 */
const REGULAR_USER_SCOPES = [
  'publicData'
];

export {
  REGULAR_USER_SCOPES
};
