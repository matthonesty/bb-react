/**
 * @fileoverview EVE Online Single Sign-On (SSO) Integration
 *
 * Implements OAuth 2.0 Authorization Code flow for EVE Online authentication.
 * The EVE SSO allows players to sign in to third-party applications using their
 * EVE Online credentials, and grants limited access to character data via scopes.
 *
 * OAuth 2.0 Flow (Authorization Code):
 * 1. User clicks "Login with EVE Online" button
 * 2. Application redirects to EVE SSO authorization endpoint with state parameter (CSRF protection)
 * 3. User authenticates with EVE credentials and selects character
 * 4. User consents to requested scopes
 * 5. EVE SSO redirects back to application callback URL with authorization code
 * 6. Application exchanges authorization code for access token + refresh token (using Basic auth)
 * 7. Application validates JWT access token and extracts character information
 * 8. Access token is used to authenticate ESI API requests
 * 9. Refresh token is used to obtain new access tokens when current token expires
 *
 * Security Notes:
 * - Client secret must be kept private (stored in environment variables only)
 * - State parameter prevents CSRF attacks
 * - Access tokens are short-lived (typically 20 minutes)
 * - Refresh tokens are long-lived and must be stored securely
 * - Tokens can be revoked by the user at any time via EVE account settings
 *
 * Official Documentation:
 * - EVE SSO: https://docs.esi.evetech.net/docs/sso/
 * - OAuth 2.0: https://oauth.net/2/
 *
 * @see {@link https://login.eveonline.com/.well-known/oauth-authorization-server} SSO metadata endpoint
 */

import { BaseSso } from './BaseSso';

/**
 * Regular EVE SSO service instance
 *
 * Uses regular OAuth credentials (EVE_CLIENT_ID) for standard user authentication.
 * Requests minimal scopes (publicData and basic character info).
 *
 * For admin access with extended scopes, use adminSso.js instead.
 */
const sso = new BaseSso({
  clientId: process.env.EVE_CLIENT_ID || '',
  secretKey: process.env.EVE_SECRET_KEY || '',
  callbackUrl: process.env.EVE_CALLBACK_URL || '',
  label: 'Regular SSO',
});

export default sso;
