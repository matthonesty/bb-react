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

      return NextResponse.json({
        authenticated: true,
        user: {
          character_id: decoded.character_id,
          character_name: decoded.character_name,
          roles: decoded.roles || ['User'],
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
