/**
 * @fileoverview Mailer Refresh Token Management
 *
 * Stores mailer service account refresh token in database with automatic rotation.
 * Handles EVE SSO refresh token rotation (new token on each refresh).
 *
 * Database: admin_tokens table
 * - Single row storage (key = 'mailer_refresh_token')
 * - Automatically updates when token is refreshed
 *
 * This is for the SERVICE ACCOUNT that handles:
 * - Mail operations (reading/sending)
 * - Wallet/accounting operations
 * - Persistent ESI data pulls
 */

import pool from '@/lib/db';

// Using require for now until we convert SSO files to TypeScript
const mailerSso = require('./auth/mailerSso');

/**
 * Key for mailer refresh token in database
 */
const MAILER_TOKEN_KEY = 'mailer_refresh_token';

/**
 * Get stored mailer refresh token
 *
 * @returns Refresh token or null if not set
 */
export async function getStoredRefreshToken(): Promise<string | null> {
  const result = await pool.query(
    'SELECT token FROM admin_tokens WHERE key = $1',
    [MAILER_TOKEN_KEY]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0].token;
}

/**
 * Store mailer refresh token
 *
 * Uses UPSERT to handle first-time insert or update.
 *
 * @param refreshToken - EVE SSO refresh token
 */
export async function storeRefreshToken(refreshToken: string): Promise<void> {
  await pool.query(`
    INSERT INTO admin_tokens (key, token, updated_at)
    VALUES ($1, $2, NOW())
    ON CONFLICT (key)
    DO UPDATE SET token = $2, updated_at = NOW()
  `, [MAILER_TOKEN_KEY, refreshToken]);

  console.log('[MAILER TOKEN] Refresh token stored/updated');
}

/**
 * Get fresh mailer access token with automatic refresh token rotation
 *
 * This function:
 * 1. Gets stored refresh token from database
 * 2. Calls EVE SSO to refresh and get access token
 * 3. Stores NEW refresh token back to database (rotation)
 * 4. Returns access token
 *
 * @returns Fresh access token
 * @throws {Error} If no refresh token stored or refresh fails
 */
export async function getMailerAccessToken(): Promise<string> {
  // Get stored refresh token
  const refreshToken = await getStoredRefreshToken();

  if (!refreshToken) {
    throw new Error('No mailer refresh token stored. Admin must login via /api/auth/mailer-login to authorize the service account.');
  }

  // Refresh to get access token (also returns NEW refresh token)
  const tokenResponse = await mailerSso.refreshAccessToken(refreshToken);

  // Store the NEW refresh token (EVE SSO rotates tokens)
  await storeRefreshToken(tokenResponse.refresh_token);

  console.log('[MAILER TOKEN] Access token refreshed, new refresh token stored');

  return tokenResponse.access_token;
}

/**
 * Check if mailer refresh token is configured
 *
 * @returns True if token exists
 */
export async function hasStoredToken(): Promise<boolean> {
  const token = await getStoredRefreshToken();
  return token !== null;
}

export { MAILER_TOKEN_KEY };
