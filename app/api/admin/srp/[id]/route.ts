/**
 * Single SRP Request Endpoint
 * Returns a specific SRP request by ID
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import pool from '@/lib/db';
import { isAuthorizedRole } from '@/lib/auth/roles';

const JWT_SECRET = process.env.JWT_SECRET!;

// Helper to verify auth
async function verifyAuth(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;

  if (!token) {
    return null;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return decoded;
  } catch {
    return null;
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Verify authentication
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user has any authorized role
    const hasAuthorizedRole = user.roles?.some((role: string) => isAuthorizedRole(role));

    if (!hasAuthorizedRole) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Authorized role required' },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const numericId = parseInt(id);

    if (isNaN(numericId)) {
      return NextResponse.json(
        { error: 'Invalid ID' },
        { status: 400 }
      );
    }

    // Fetch the SRP request by either SRP ID or killmail ID
    const result = await pool.query(
      `SELECT * FROM srp_requests WHERE id = $1 OR killmail_id = $1`,
      [numericId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'SRP request not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      request: result.rows[0]
    });
  } catch (error: any) {
    console.error('[SRP] Error fetching request:', error);
    return NextResponse.json(
      { error: 'Failed to fetch SRP request' },
      { status: 500 }
    );
  }
}
