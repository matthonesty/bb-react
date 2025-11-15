/**
 * Auth Verification Endpoint
 * Verifies JWT token and returns user information
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { getRoles } from '@/lib/auth/roles';

const JWT_SECRET = process.env.JWT_SECRET!;

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
    }

    // Verify JWT
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;

      // Re-check roles from database to ensure they're up-to-date
      // This ensures role changes take effect immediately without requiring re-login
      const currentRoles = await getRoles(decoded.character_id);

      // Check if user still has any roles (at minimum should have 'user')
      // If roles array is empty, their access has been completely revoked
      if (currentRoles.length === 0) {
        // User's roles have been revoked, invalidate their session
        return NextResponse.json(
          { authenticated: false, user: null, error: 'Access revoked' },
          { status: 403 }
        );
      }

      // All authenticated users with roles are allowed
      // Individual pages/endpoints can check for specific roles as needed
      return NextResponse.json({
        authenticated: true,
        user: {
          character_id: decoded.character_id,
          character_name: decoded.character_name,
          roles: currentRoles,
        },
      });
    } catch {
      // Token invalid or expired
      return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
    }
  } catch (error) {
    console.error('Verify error:', error);
    return NextResponse.json({ authenticated: false, user: null }, { status: 500 });
  }
}
