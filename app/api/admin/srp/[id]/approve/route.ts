/**
 * SRP Approve Endpoint
 * Approves an SRP request
 */

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { isAuthorizedRole } from '@/lib/auth/roles';
import { verifyAuth } from '@/lib/auth/apiAuth';
import { queueMailSend } from '@/lib/pendingMailQueue';

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    // Verify authentication
    const user = await verifyAuth();
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
      return NextResponse.json({ error: 'SRP request not found' }, { status: 404 });
    }

    const srpRequest = result.rows[0];

    // Queue approval notification mail
    try {
      // Extract killmail URL from mail body or construct from killmail_id
      const zkbUrlMatch = srpRequest.mail_body?.match(/(https?:\/\/zkillboard\.com\/kill\/\d+\/?)/i);
      const killmailUrl = zkbUrlMatch
        ? zkbUrlMatch[0]
        : srpRequest.killmail_id
          ? `https://zkillboard.com/kill/${srpRequest.killmail_id}/`
          : 'N/A';

      await queueMailSend({
        mailType: 'manual_approval',
        recipientCharacterId: srpRequest.character_id,
        payload: {
          senderCharacterId: parseInt(process.env.MAILER_CHARACTER_ID || ''),
          recipientCharacterId: srpRequest.character_id,
          recipientName: srpRequest.character_name,
          payoutAmount: srpRequest.final_payout_amount,
          shipName: srpRequest.ship_name,
          killmailUrl,
        },
        retryAfter: new Date(), // Send ASAP
      });

      console.log(
        `[SRP APPROVE] Queued approval mail for ${srpRequest.character_name} (${srpRequest.character_id}) - ${srpRequest.final_payout_amount} ISK`
      );
    } catch (mailError) {
      console.error('[SRP APPROVE] Failed to queue approval mail:', mailError);
      // Don't fail the approval if mail queueing fails
    }

    // Add is_auto_rejection flag
    const responseData = {
      ...srpRequest,
      is_auto_rejection: srpRequest.admin_notes?.includes('[AUTO-REJECTION]') || false,
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('SRP approve error:', error);
    return NextResponse.json({ error: 'Failed to approve SRP request' }, { status: 500 });
  }
}
