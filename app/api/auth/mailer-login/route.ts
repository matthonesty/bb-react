/**
 * @fileoverview Mailer Service Account Login Endpoint
 *
 * One-time login endpoint to authorize the mailer service account.
 * This is NOT for regular admin users - this is for the SERVICE ACCOUNT.
 *
 * Purpose:
 * - Authorize the mailer character with ESI scopes
 * - Store persistent refresh token for automated operations
 * - Enable mail/wallet/ESI operations without human intervention
 *
 * Usage:
 * 1. Admin visits /api/auth/mailer-login
 * 2. Logs in with the MAILER SERVICE ACCOUNT character
 * 3. Approves ESI scopes (mail, wallet)
 * 4. Refresh token is stored in database
 * 5. All future operations use stored refresh token
 *
 * Security:
 * - Should be protected/limited to initial setup only
 * - Only needs to be done once (token persists)
 * - Re-login only if token expires or scopes change
 */

import { NextRequest, NextResponse } from 'next/server';

const mailerSso = require('@/lib/auth/mailerSso');
const { MAILER_SCOPES } = require('@/lib/auth/mailerScopes');

/**
 * GET /api/auth/mailer-login
 *
 * Initiates EVE SSO login flow with mailer scopes
 * Uses the :mailer: suffix in state to identify this as a mailer login in callback
 */
export async function GET(request: NextRequest) {
  try {
    // Generate random state for CSRF protection
    const randomState = mailerSso.generateState();

    // Get return URL from query parameter (for redirect after login)
    const returnUrl = request.nextUrl.searchParams.get('return_url') || '/admin';

    // Encode flow type and return URL in state parameter
    // Format: "randomstate:mailer:returnurl"
    const encodedReturnUrl = returnUrl ? encodeURIComponent(returnUrl) : '';
    const state = `${randomState}:mailer:${encodedReturnUrl}`;

    // Get authorization URL with mailer scopes
    const authUrl = mailerSso.getAuthorizationUrl(state, MAILER_SCOPES);

    // Create response with redirect to EVE SSO
    const response = NextResponse.redirect(authUrl);

    // Store state in cookie for CSRF validation in callback
    response.cookies.set('auth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 10 * 60, // 10 minutes
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('[MAILER LOGIN] Failed to initiate mailer login:', error);
    return NextResponse.json(
      { error: 'Failed to initiate mailer login', details: error.message },
      { status: 500 }
    );
  }
}
