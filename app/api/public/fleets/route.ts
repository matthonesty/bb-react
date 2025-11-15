/**
 * Public Fleet Calendar Endpoint
 * Returns upcoming scheduled fleets (no authentication required)
 */

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { updateFleetStatuses } from '@/lib/fleet/statusUpdater';

export async function GET(request: NextRequest) {
  try {
    // Automatically update fleet statuses based on current time
    await updateFleetStatuses();

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const from_date = searchParams.get('from_date');
    const to_date = searchParams.get('to_date');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Build query - only return scheduled or in_progress fleets
    let query = `
      SELECT
        f.id,
        f.scheduled_at,
        f.timezone,
        f.duration_minutes,
        f.fleet_type_id,
        f.title,
        f.description,
        f.staging_system,
        f.comms_channel,
        f.status,
        ft.name as fleet_type_name,
        ft.description as fleet_type_description,
        fc.main_character_name as fc_name,
        fc.rank as fc_rank,
        COALESCE(f.participant_count, 0) as participant_count
      FROM fleets f
      JOIN fleet_types ft ON f.fleet_type_id = ft.id
      JOIN fleet_commanders fc ON f.fc_id = fc.id
      WHERE f.status IN ('scheduled', 'in_progress')
    `;
    const params: (string | number)[] = [];
    let paramCount = 1;

    // Default: show fleets from now onwards
    if (from_date) {
      query += ` AND f.scheduled_at >= $${paramCount++}`;
      params.push(from_date);
    } else {
      query += ` AND f.scheduled_at >= NOW()`;
    }

    if (to_date) {
      query += ` AND f.scheduled_at <= $${paramCount++}`;
      params.push(to_date);
    }

    query += ` ORDER BY f.scheduled_at ASC`;
    query += ` LIMIT $${paramCount++}`;
    params.push(limit);

    const result = await pool.query(query, params);

    return NextResponse.json({
      success: true,
      fleets: result.rows,
    });
  } catch (error: unknown) {
    console.error('Error fetching public fleets:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch fleets' },
      { status: 500 }
    );
  }
}
