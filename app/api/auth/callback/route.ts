/**
 * EVE SSO Callback Handler
 * Handles the OAuth 2.0 callback after EVE SSO authentication
 * Supports both regular user login and mailer service account authorization
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const BaseSso = require('@/lib/auth/BaseSso');
const mailerSso = require('@/lib/auth/mailerSso');
const { storeRefreshToken: storeMailerRefreshToken } = require('@/lib/mailerToken');

const eveSso = new BaseSso({
  clientId: process.env.EVE_CLIENT_ID,
  secretKey: process.env.EVE_SECRET_KEY,
  callbackUrl: process.env.EVE_CALLBACK_URL,
  label: 'Regular SSO'
});

const JWT_SECRET = process.env.JWT_SECRET!;
const ADMIN_CHARACTER_IDS = (process.env.ADMIN_CHARACTER_IDS || '')
  .split(',')
  .map(id => parseInt(id.trim()))
  .filter(id => !isNaN(id));

export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get('code');
    const state = request.nextUrl.searchParams.get('state');

    if (!code || !state) {
      return NextResponse.json(
        { error: 'Missing code or state parameter' },
        { status: 400 }
      );
    }

    // Verify CSRF state token
    const cookieStore = await cookies();
    const savedState = cookieStore.get('auth_state')?.value;

    if (!savedState || savedState !== state) {
      return NextResponse.json(
        { error: 'Invalid state parameter - possible CSRF attack' },
        { status: 403 }
      );
    }

    // Extract flow type and return URL from state parameter
    // Format: "randomstate:flow:returnurl"
    let flowType: string | null = null;
    let returnUrl: string | null = null;

    if (state.includes(':')) {
      const parts = state.split(':');
      flowType = parts[1] || null; // 'mailer' or empty/undefined
      // Join parts[2] onwards in case URL contains colons
      if (parts.length > 2) {
        const encodedUrl = parts.slice(2).join(':');
        returnUrl = encodedUrl ? decodeURIComponent(encodedUrl) : null;
      }
    }

    const isMailerFlow = flowType === 'mailer';
    console.log('[CALLBACK] Flow type:', isMailerFlow ? 'mailer' : 'regular');
    console.log('[CALLBACK] Return URL:', returnUrl || 'none');

    // Select SSO service based on flow type
    const ssoService = isMailerFlow ? mailerSso : eveSso;
    console.log('[CALLBACK] Using SSO service:', isMailerFlow ? 'MAILER' : 'REGULAR');

    // Exchange code for tokens
    const tokens = await ssoService.exchangeCodeForToken(code);

    // Get character info from access token
    const characterInfo = await ssoService.getCharacterInfo(tokens.access_token);

    if (!characterInfo || !characterInfo.CharacterID) {
      return NextResponse.json(
        { error: 'Failed to get character information' },
        { status: 401 }
      );
    }

    console.log('[CALLBACK] Character authenticated:', characterInfo.CharacterName, '(ID:', characterInfo.CharacterID + ')');

    // Handle mailer flow differently from regular login
    if (isMailerFlow) {
      // Security: Validate that the logged-in character matches the expected mailer character ID
      const expectedMailerCharacterId = parseInt(process.env.MAILER_CHARACTER_ID || '0');

      if (!expectedMailerCharacterId) {
        console.error('[CALLBACK] MAILER_CHARACTER_ID not configured in environment');
        return NextResponse.json(
          { error: 'Mailer character ID not configured. Contact administrator.' },
          { status: 500 }
        );
      }

      if (characterInfo.CharacterID !== expectedMailerCharacterId) {
        console.error(
          `[CALLBACK] SECURITY: Wrong character attempted mailer login. ` +
          `Expected: ${expectedMailerCharacterId}, Got: ${characterInfo.CharacterID} (${characterInfo.CharacterName})`
        );
        return NextResponse.json(
          {
            error: 'Security Error',
            message: `This character (${characterInfo.CharacterName}) is not authorized as the mailer service account. ` +
              `Only the designated mailer character can be authorized. Please log in with the correct character.`
          },
          { status: 403 }
        );
      }

      // Character ID matches - proceed with token storage
      try {
        await storeMailerRefreshToken(tokens.refresh_token);
        console.log('[CALLBACK] Mailer refresh token stored in database for persistent ESI operations');
        console.log('[CALLBACK] Authorized Character:', characterInfo.CharacterName, '(ID:', characterInfo.CharacterID + ')');

        // Clear state cookie and redirect to home
        const successUrl = new URL(returnUrl || '/', request.url);
        successUrl.searchParams.set('mailer_authorized', 'true');

        const response = NextResponse.redirect(successUrl);
        response.cookies.delete('auth_state');

        return response;
      } catch (error: any) {
        console.error('[CALLBACK] Failed to store mailer refresh token:', error);
        return NextResponse.json(
          { error: 'Failed to store mailer token', details: error.message },
          { status: 500 }
        );
      }
    }

    // Regular user login flow
    // Get roles from database (checks ADMIN_CHARACTER_IDS and fleet_commanders table)
    const { getRoles, hasAuthorizedAccess } = require('@/lib/auth/roles');
    const roles = await getRoles(characterInfo.CharacterID);
    const hasAccess = await hasAuthorizedAccess(characterInfo.CharacterID);

    // Check if user has any authorized role (admin or FC role from fleet_commanders)
    if (!hasAccess) {
      console.log('[CALLBACK] User not authorized:', characterInfo.CharacterName, '(ID:', characterInfo.CharacterID + ')');
      console.log('[CALLBACK] User roles:', roles);

      return NextResponse.json({
        error: 'Not Authorized',
        message: 'You do not have access to this system. You must be listed in the Fleet Commanders roster with active status.'
      }, { status: 403 });
    }

    console.log('[CALLBACK] Authorized user:', characterInfo.CharacterName, 'Roles:', roles);

    // Create JWT payload
    const jwtPayload = {
      character_id: characterInfo.CharacterID,
      character_name: characterInfo.CharacterName,
      roles,
      iat: Math.floor(Date.now() / 1000),
    };

    // Sign JWT
    const token = jwt.sign(jwtPayload, JWT_SECRET, {
      expiresIn: '7d',
    });

    // Extract return URL from state if present
    const redirectUrl = returnUrl || '/srp';

    // Create response with redirect
    const response = NextResponse.redirect(new URL(redirectUrl, request.url));

    // Set auth token cookie
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    // Clear state cookie
    response.cookies.delete('auth_state');

    return response;
  } catch (error) {
    console.error('[CALLBACK] Authentication error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}
