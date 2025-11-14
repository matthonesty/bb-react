/**
 * @fileoverview Base EVE Online SSO Service
 *
 * Shared OAuth 2.0 implementation for EVE SSO authentication.
 * This base class is used by both regular user SSO and mailer service account SSO
 * to avoid code duplication while allowing different OAuth credentials.
 *
 * @module lib/auth/BaseSso
 */

import axios from 'axios';
import crypto from 'crypto';
import { buildScopeString } from './scopes';
import * as jwks from './jwks';
import type { EVEJWTPayload } from './jwks';

/**
 * EVE SSO base URL for all authorization and token endpoints
 */
const SSO_BASE_URL = 'https://login.eveonline.com';

/**
 * SSO Configuration
 */
export interface SSOConfig {
  /** OAuth application client ID */
  clientId: string;
  /** OAuth application secret */
  secretKey: string;
  /** Registered OAuth callback URL */
  callbackUrl: string;
  /** Label for logging (e.g., 'Regular SSO', 'Admin SSO') */
  label?: string;
}

/**
 * OAuth token response from EVE SSO
 */
export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
}

/**
 * Character information from EVE SSO verify endpoint
 */
export interface CharacterInfo {
  CharacterID: number;
  CharacterName: string;
  ExpiresOn: string;
  Scopes: string;
  TokenType: string;
  CharacterOwnerHash: string;
  IntellectualProperty: string;
}

/**
 * Base EVE Online SSO Service
 *
 * Implements OAuth 2.0 Authorization Code flow with configurable credentials.
 * Provides all core SSO functionality: authorization, token exchange,
 * token refresh, validation, and revocation.
 */
export class BaseSso {
  protected clientId: string;
  protected secretKey: string;
  protected callbackUrl: string;
  protected label: string;

  /**
   * Initialize EVE SSO service with provided credentials
   *
   * @param config - SSO configuration
   * @throws Error If any required credential is missing
   */
  constructor({ clientId, secretKey, callbackUrl, label = 'SSO' }: SSOConfig) {
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
   * @param state - Random CSRF protection token (can include flow type like "abc123:admin")
   * @param requestedScopes - Array of scope strings or space-separated string
   * @returns Complete EVE SSO authorization URL
   */
  getAuthorizationUrl(state: string, requestedScopes: readonly string[] | string[] | string | null = null): string {
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
   * @returns 64-character hexadecimal random string
   */
  generateState(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Exchange authorization code for access and refresh tokens
   *
   * @param code - One-time authorization code from OAuth callback
   * @returns Token response with access_token, refresh_token, expires_in
   * @throws Error If token exchange fails
   */
  async exchangeCodeForToken(code: string): Promise<TokenResponse> {
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
    } catch (error: any) {
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
   * @param accessToken - JWT access token from EVE SSO
   * @returns Verified JWT payload
   * @throws Error If token is invalid or expired
   */
  async validateAccessToken(accessToken: string): Promise<EVEJWTPayload> {
    try {
      // Try full verification with JWKS signature check
      const payload = await jwks.verifyJWT(accessToken, this.clientId);
      return payload;
    } catch (jwksError: any) {
      console.warn(`[${this.label}] JWKS verification failed, falling back to basic validation:`, jwksError.message);

      // Fallback to basic validation without signature verification
      try {
        const payload = jwks.validateTokenBasic(accessToken, this.clientId);
        console.warn(`[${this.label}] WARNING: Token validated without signature verification`);
        return payload;
      } catch (error: any) {
        console.error(`[${this.label}] Error validating access token:`, error.message);
        throw error;
      }
    }
  }

  /**
   * Refresh expired access token using refresh token
   *
   * @param refreshToken - Current refresh token
   * @returns Token response with new access_token and refresh_token
   * @throws Error If refresh fails
   */
  async refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
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
    } catch (error: any) {
      console.error(`[${this.label}] Error refreshing token:`, error.response?.data || error.message);
      throw new Error('Failed to refresh access token');
    }
  }

  /**
   * Get character information from EVE SSO verify endpoint
   *
   * @param accessToken - JWT access token
   * @returns Character information object
   * @throws Error If token is invalid or request fails
   */
  async getCharacterInfo(accessToken: string): Promise<CharacterInfo> {
    try {
      const response = await axios.get(`${SSO_BASE_URL}/oauth/verify`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      return response.data;
    } catch (error: any) {
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
   * @param refreshToken - Refresh token to revoke
   */
  async revokeRefreshToken(refreshToken: string): Promise<void> {
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
    } catch (error: any) {
      console.error(`[${this.label}] Error revoking token:`, error.response?.data || error.message);
      // Don't throw - revocation failures are not critical
    }
  }
}

export default BaseSso;
