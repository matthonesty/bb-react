/**
 * Public SRP Configuration Endpoint
 * Returns active SRP ship types and payouts for public display
 */

import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET - List all active ship types
export async function GET() {
  try {
    const result = await pool.query(
      `SELECT
        type_name,
        group_name,
        base_payout,
        polarized_payout,
        fc_discretion,
        notes
      FROM srp_ship_types
      WHERE is_active = TRUE
      ORDER BY group_name ASC, type_name ASC`
    );

    return NextResponse.json({
      success: true,
      ship_types: result.rows,
    });
  } catch (error: unknown) {
    console.error('[PUBLIC-SRP-CONFIG] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to load SRP configuration' },
      { status: 500 }
    );
  }
}
