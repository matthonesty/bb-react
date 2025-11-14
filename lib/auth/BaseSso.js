/**
 * @fileoverview Base EVE Online SSO Service
 *
 * Shared OAuth 2.0 implementation for EVE SSO authentication.
 * This base class is used by both regular user SSO and mailer service account SSO
 * to avoid code duplication while allowing different OAuth credentials.
 *
 * @module lib/auth/BaseSso
 */

const axios = require('axios');
const crypto = require('crypto');

/**
 * EVE SSO base URL for all authorization and token endpoints
 * @constant {string}
 */
const SSO_BASE_URL = 'https://login.eveonline.com';

/**
 * Base EVE Online SSO Service
 *
 * Implements OAuth 2.0 Authorization Code flow with configurable credentials.
 * Provides all core SSO functionality: authorization, token exchange,
 * token refresh, validation, and revocation.
 *
 * @class
 */
class BaseSso {
  /**
   * Initialize EVE SSO service with provided credentials
   *
   * @param {Object} config - SSO configuration
   * @param {string} config.clientId - OAuth application client ID
   * @param {string} config.secretKey - OAuth application secret
   * @param {string} config.callbackUrl - Registered OAuth callback URL
   * @param {string} [config.label='SSO'] - Label for logging (e.g., 'Regular SSO', 'Admin SSO')
   * @throws {Error} If any required credential is missing
   */
  constructor({ clientId, secretKey, callbackUrl, label = 'SSO' }) {
    this.clientId = clientId;
    this.secretKey = secretKey;
    this.callbackUrl = callbackUrl;
    this.label = label;

    if (!this.clientId || !this.secretKey || !this.callbackUrl) {
      throw new Error(`${this.label} credentials not configured`);
    }
  }

  /**
   * Generate OAuth 2.0 authorization URL
   *
   * Constructs authorization URL with all required parameters for EVE SSO.
   *
   * @param {string} state - Random CSRF protection token (can include flow type like "abc123:admin")
   * @param {string[]|string} [requestedScopes=null] - Array of scope strings or space-separated string
   * @returns {string} Complete EVE SSO authorization URL
   */
  getAuthorizationUrl(state, requestedScopes = null) {
    const { buildScopeString } = require('./scopes');

    // Default to public data only
    let scopes = 'publicData';

    if (requestedScopes) {
      if (Array.isArray(requestedScopes)) {
        scopes = buildScopeString(requestedScopes);
      } else if (typeof requestedScopes === 'string') {
        scopes = requestedScopes;
      }
    }

    const params = new URLSearchParams({
      response_type: 'code',
      redirect_uri: this.callbackUrl,
      client_id: this.clientId,
      scope: scopes,
      state: state
    });

    return `${SSO_BASE_URL}/v2/oauth/authorize/?${params.toString()}`;
  }

  /**
   * Generate cryptographically secure random state string
   *
   * @returns {string} 64-character hexadecimal random string
   */
  generateState() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Exchange authorization code for access and refresh tokens
   *
   * @param {string} code - One-time authorization code from OAuth callback
   * @returns {Promise<Object>} Token response with access_token, refresh_token, expires_in
   * @throws {Error} If token exchange fails
   */
  async exchangeCodeForToken(code) {
    const auth = Buffer.from(`${this.clientId}:${this.secretKey}`).toString('base64');

    const data = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code
    });

    try {
      const response = await axios.post(`${SSO_BASE_URL}/v2/oauth/token`, data.toString(), {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Host': 'login.eveonline.com'
        }
      });

      return response.data;
    } catch (error) {
      console.error(`[${this.label}] Error exchanging code for token:`, error.response?.data || error.message);
      throw new Error('Failed to exchange authorization code for token');
    }
  }

  /**
   * Validate and verify JWT access token
   *
   * Performs full JWT validation with signature verification.
   * Falls back to basic validation if JWKS verification fails.
   *
   * @param {string} accessToken - JWT access token from EVE SSO
   * @returns {Promise<Object>} Verified JWT payload
   * @throws {Error} If token is invalid or expired
   */
  async validateAccessToken(accessToken) {
    const jwks = require('./jwks');

    try {
      // Try full verification with JWKS signature check
      const payload = await jwks.verifyJWT(accessToken, this.clientId);
      return payload;
    } catch (jwksError) {
      console.warn(`[${this.label}] JWKS verification failed, falling back to basic validation:`, jwksError.message);

      // Fallback to basic validation without signature verification
      try {
        const payload = jwks.validateTokenBasic(accessToken, this.clientId);
        console.warn(`[${this.label}] WARNING: Token validated without signature verification`);
        return payload;
      } catch (error) {
        console.error(`[${this.label}] Error validating access token:`, error.message);
        throw error;
      }
    }
  }

  /**
   * Refresh expired access token using refresh token
   *
   * @param {string} refreshToken - Current refresh token
   * @returns {Promise<Object>} Token response with new access_token and refresh_token
   * @throws {Error} If refresh fails
   */
  async refreshAccessToken(refreshToken) {
    const auth = Buffer.from(`${this.clientId}:${this.secretKey}`).toString('base64');

    const data = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    });

    try {
      const response = await axios.post(`${SSO_BASE_URL}/v2/oauth/token`, data.toString(), {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Host': 'login.eveonline.com'
        }
      });

      return response.data;
    } catch (error) {
      console.error(`[${this.label}] Error refreshing token:`, error.response?.data || error.message);
      throw new Error('Failed to refresh access token');
    }
  }

  /**
   * Get character information from EVE SSO verify endpoint
   *
   * @param {string} accessToken - JWT access token
   * @returns {Promise<Object>} Character information object
   * @throws {Error} If token is invalid or request fails
   */
  async getCharacterInfo(accessToken) {
    try {
      const response = await axios.get(`${SSO_BASE_URL}/oauth/verify`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      return response.data;
    } catch (error) {
      console.error(`[${this.label}] Error getting character info:`, error.response?.data || error.message);
      throw new Error('Failed to get character information');
    }
  }

  /**
   * Revoke refresh token (logout)
   *
   * Invalidates the refresh token. Does not throw on failure
   * as token may already be expired/revoked.
   *
   * @param {string} refreshToken - Refresh token to revoke
   * @returns {Promise<void>}
   */
  async revokeRefreshToken(refreshToken) {
    const auth = Buffer.from(`${this.clientId}:${this.secretKey}`).toString('base64');

    const data = new URLSearchParams({
      token_type_hint: 'refresh_token',
      token: refreshToken
    });

    try {
      await axios.post(`${SSO_BASE_URL}/v2/oauth/revoke`, data.toString(), {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Host': 'login.eveonline.com'
        }
      });
    } catch (error) {
      console.error(`[${this.label}] Error revoking token:`, error.response?.data || error.message);
      // Don't throw - revocation failures are not critical
    }
  }
}

module.exports = BaseSso;
