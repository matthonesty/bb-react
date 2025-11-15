/**
 * SRP Mark Paid Endpoint
 * Marks an SRP request as paid
 */

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { isAuthorizedRole } from '@/lib/auth/roles';
import { verifyAuth } from '@/lib/auth/apiAuth';

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    // Verify authentication
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin role
    const hasAuthorizedRole = user.roles?.some((role: string) => isAuthorizedRole(role));

    if (!hasAuthorizedRole) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Admin role required' },
        { status: 403 }
      );
    }

    const params = await context.params;
    const srpId = parseInt(params.id);

    if (isNaN(srpId)) {
      return NextResponse.json({ error: 'Invalid SRP request ID' }, { status: 400 });
    }

    // Get body
    const body = await request.json();
    const paymentMethod = body.payment_method;

    if (!paymentMethod) {
      return NextResponse.json({ error: 'Payment method is required' }, { status: 400 });
    }

    // Update the SRP request
    const result = await pool.query(
      `UPDATE srp_requests
       SET status = 'paid',
           payment_method = $1,
           payment_amount = final_payout_amount,
           paid_at = NOW(),
           paid_by_character_id = $2,
           paid_by_character_name = $3
       WHERE id = $4 AND status = 'approved'
       RETURNING *`,
      [paymentMethod, user.character_id, user.character_name, srpId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'SRP request not found or not in approved status' },
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
    console.error('SRP mark paid error:', error);
    return NextResponse.json({ error: 'Failed to mark SRP request as paid' }, { status: 500 });
  }
}
