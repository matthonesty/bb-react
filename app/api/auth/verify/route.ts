/**
 * Auth Verification Endpoint
 * Verifies JWT token and returns user information
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET!;

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json(
        { authenticated: false, user: null },
        { status: 401 }
      );
    }

    // Verify JWT
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;

      // Re-check roles from database to ensure they're up-to-date
      // This ensures role changes take effect immediately without requiring re-login
      const { getRoles } = require('@/lib/auth/roles');
      const currentRoles = await getRoles(decoded.character_id);

      // Check if user still has authorized access
      const hasAuthorizedRole = currentRoles.some((role: string) =>
        ['admin', 'Council', 'Accountant', 'OBomberCare', 'FC'].includes(role)
      );

      if (!hasAuthorizedRole) {
        // User's roles have been revoked, invalidate their session
        return NextResponse.json(
          { authenticated: false, user: null, error: 'Access revoked' },
          { status: 403 }
        );
      }

      return NextResponse.json({
        authenticated: true,
        user: {
          character_id: decoded.character_id,
          character_name: decoded.character_name,
          roles: currentRoles,
        },
      });
    } catch (jwtError) {
      // Token invalid or expired
      return NextResponse.json(
        { authenticated: false, user: null },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Verify error:', error);
    return NextResponse.json(
      { authenticated: false, user: null },
      { status: 500 }
    );
  }
}
