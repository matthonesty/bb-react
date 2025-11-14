/**
 * EVE SSO Login Initiation
 * Starts the OAuth 2.0 flow by redirecting to EVE Online SSO
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { BaseSso } from '@/lib/auth/BaseSso';

const eveSso = new BaseSso({
  clientId: process.env.EVE_CLIENT_ID || '',
  secretKey: process.env.EVE_SECRET_KEY || '',
  callbackUrl: process.env.EVE_CALLBACK_URL || '',
  label: 'Regular SSO'
});

const REGULAR_USER_SCOPES = ['publicData'];

export async function GET(request: NextRequest) {
  try {
    // Generate CSRF state token
    const state = eveSso.generateState();

    // Get return URL from query
    const returnUrl = request.nextUrl.searchParams.get('return_url') || '';

    // Encode state with return URL
    const encodedState = returnUrl
      ? `${state}::${encodeURIComponent(returnUrl)}`
      : state;

    // Build authorization URL
    const authUrl = eveSso.getAuthorizationUrl(encodedState, REGULAR_USER_SCOPES);

    // Set state cookie for CSRF protection
    const cookieStore = await cookies();
    cookieStore.set('auth_state', encodedState, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/'
    });

    // Redirect to EVE SSO
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate login' },
      { status: 500 }
    );
  }
}
