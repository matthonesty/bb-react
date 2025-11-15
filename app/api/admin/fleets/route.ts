/**
 * Fleet Management Endpoint
 * Handles listing and creating fleets
 */

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { isAuthorizedRole } from '@/lib/auth/roles';
import { verifyAuth } from '@/lib/auth/apiAuth';
import { updateFleetStatuses } from '@/lib/fleet/statusUpdater';

// GET - List fleets with optional filters
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const user = await verifyAuth();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has any authorized role
    const hasAuthorizedRole = user.roles?.some((role: string) => isAuthorizedRole(role));

    if (!hasAuthorizedRole) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Authorized role required' },
        { status: 403 }
      );
    }

    // Automatically update fleet statuses based on current time
    await updateFleetStatuses();

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const fc_id = searchParams.get('fc_id');
    const fleet_type_id = searchParams.get('fleet_type_id');
    const from_date = searchParams.get('from_date');
    const to_date = searchParams.get('to_date');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query
    let query = `
      SELECT
        f.*,
        ft.name as fleet_type_name,
        ft.description as fleet_type_description,
        fc.main_character_name as fc_name,
        fc.rank as fc_rank,
        COALESCE(f.participant_count, 0) as participant_count
      FROM fleets f
      JOIN fleet_types ft ON f.fleet_type_id = ft.id
      JOIN fleet_commanders fc ON f.fc_id = fc.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (status) {
      query += ` AND f.status = $${paramCount++}`;
      params.push(status);
    }

    if (fc_id) {
      query += ` AND f.fc_id = $${paramCount++}`;
      params.push(parseInt(fc_id));
    }

    if (fleet_type_id) {
      query += ` AND f.fleet_type_id = $${paramCount++}`;
      params.push(parseInt(fleet_type_id));
    }

    if (from_date) {
      query += ` AND f.scheduled_at >= $${paramCount++}`;
      params.push(from_date);
    }

    if (to_date) {
      query += ` AND f.scheduled_at <= $${paramCount++}`;
      params.push(to_date);
    }

    query += ` ORDER BY f.scheduled_at DESC`;
    query += ` LIMIT $${paramCount++} OFFSET $${paramCount++}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total
      FROM fleets f
      WHERE 1=1
    `;
    const countParams: any[] = [];
    let countParamCount = 1;

    if (status) {
      countQuery += ` AND f.status = $${countParamCount++}`;
      countParams.push(status);
    }
    if (fc_id) {
      countQuery += ` AND f.fc_id = $${countParamCount++}`;
      countParams.push(parseInt(fc_id));
    }
    if (fleet_type_id) {
      countQuery += ` AND f.fleet_type_id = $${countParamCount++}`;
      countParams.push(parseInt(fleet_type_id));
    }
    if (from_date) {
      countQuery += ` AND f.scheduled_at >= $${countParamCount++}`;
      countParams.push(from_date);
    }
    if (to_date) {
      countQuery += ` AND f.scheduled_at <= $${countParamCount++}`;
      countParams.push(to_date);
    }

    const countResult = await pool.query(countQuery, countParams);

    return NextResponse.json({
      success: true,
      fleets: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].total),
        limit: limit,
        offset: offset,
      },
    });
  } catch (error: any) {
    console.error('Error fetching fleets:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch fleets' }, { status: 500 });
  }
}

// POST - Create new fleet
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const user = await verifyAuth();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has any authorized role
    const hasAuthorizedRole = user.roles?.some((role: string) => isAuthorizedRole(role));

    if (!hasAuthorizedRole) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Authorized role required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      scheduled_at,
      timezone = 'UTC',
      duration_minutes = 120,
      fleet_type_id,
      fc_id,
      title,
      description,
      staging_system,
      comms_channel,
    } = body;

    // Validate required fields
    if (!scheduled_at || !fleet_type_id || !fc_id) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: scheduled_at, fleet_type_id, fc_id' },
        { status: 400 }
      );
    }

    // Validate scheduled_at is a valid date
    const scheduledDate = new Date(scheduled_at);
    if (isNaN(scheduledDate.getTime())) {
      return NextResponse.json(
        { success: false, error: 'Invalid scheduled_at date format' },
        { status: 400 }
      );
    }

    // Validate fleet_type_id exists
    const fleetTypeCheck = await pool.query('SELECT id FROM fleet_types WHERE id = $1', [
      fleet_type_id,
    ]);
    if (fleetTypeCheck.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Fleet type not found' }, { status: 404 });
    }

    // Validate fc_id exists and is active
    const fcCheck = await pool.query(
      'SELECT id FROM fleet_commanders WHERE id = $1 AND LOWER(status) = $2',
      [fc_id, 'active']
    );
    if (fcCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Fleet commander not found or not active' },
        { status: 404 }
      );
    }

    const result = await pool.query(
      `INSERT INTO fleets (
        scheduled_at, timezone, duration_minutes,
        fleet_type_id, fc_id,
        title, description, staging_system, comms_channel,
        status, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        scheduled_at,
        timezone,
        duration_minutes,
        fleet_type_id,
        fc_id,
        title || null,
        description || null,
        staging_system || null,
        comms_channel || null,
        'scheduled',
        user.character_id,
      ]
    );

    return NextResponse.json(
      {
        success: true,
        fleet: result.rows[0],
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating fleet:', error);
    return NextResponse.json({ success: false, error: 'Failed to create fleet' }, { status: 500 });
  }
}
