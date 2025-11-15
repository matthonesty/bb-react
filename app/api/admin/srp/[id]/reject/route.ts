/**
 * SRP Reject Endpoint
 * Rejects an SRP request
 */

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { isAuthorizedRole } from '@/lib/auth/roles';
import { verifyAuth } from '@/lib/auth/apiAuth';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Verify authentication
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin role
    const hasAuthorizedRole = user.roles?.some((role: string) =>
      isAuthorizedRole(role)
    );

    if (!hasAuthorizedRole) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Admin role required' },
        { status: 403 }
      );
    }

    const params = await context.params;
    const srpId = parseInt(params.id);

    if (isNaN(srpId)) {
      return NextResponse.json(
        { error: 'Invalid SRP request ID' },
        { status: 400 }
      );
    }

    // Get body
    const body = await request.json();
    const rejectReason = body.reject_reason;

    if (!rejectReason) {
      return NextResponse.json(
        { error: 'Rejection reason is required' },
        { status: 400 }
      );
    }

    // Update the SRP request
    const result = await pool.query(
      `UPDATE srp_requests
       SET status = 'denied',
           denial_reason = $1,
           processed_at = NOW(),
           processed_by_character_id = $2,
           processed_by_character_name = $3
       WHERE id = $4
       RETURNING *`,
      [rejectReason, user.character_id, user.character_name, srpId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'SRP request not found' },
        { status: 404 }
      );
    }

    const srpRequest = result.rows[0];

    // Add is_auto_rejection flag
    const responseData = {
      ...srpRequest,
      is_auto_rejection: srpRequest.admin_notes?.includes('[AUTO-REJECTION]') || false,
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('SRP reject error:', error);
    return NextResponse.json(
      { error: 'Failed to reject SRP request' },
      { status: 500 }
    );
  }
}
