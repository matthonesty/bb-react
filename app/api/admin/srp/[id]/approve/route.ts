/**
 * SRP Approve Endpoint
 * Approves an SRP request
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
    const payoutAmount = body.payout_amount;

    // Update the SRP request
    const result = await pool.query(
      `UPDATE srp_requests
       SET status = 'approved',
           final_payout_amount = COALESCE($1, final_payout_amount),
           payout_adjusted = CASE
             WHEN $1 IS NOT NULL AND $1 != base_payout_amount THEN true
             ELSE payout_adjusted
           END,
           processed_at = NOW(),
           processed_by_character_id = $2,
           processed_by_character_name = $3
       WHERE id = $4
       RETURNING *`,
      [payoutAmount, user.character_id, user.character_name, srpId]
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
    console.error('SRP approve error:', error);
    return NextResponse.json(
      { error: 'Failed to approve SRP request' },
      { status: 500 }
    );
  }
}
