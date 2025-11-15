/**
 * Single Fleet Endpoint
 * Handles GET/PUT/DELETE for a specific fleet by ID
 */

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { isAuthorizedRole } from '@/lib/auth/roles';
import { verifyAuth } from '@/lib/auth/apiAuth';
import { updateFleetStatuses } from '@/lib/fleet/statusUpdater';

// GET - Get single fleet with full details
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameter: id' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `SELECT
        f.*,
        ft.name as fleet_type_name,
        ft.description as fleet_type_description,
        fc.main_character_name as fc_name,
        fc.rank as fc_rank,
        fc.main_character_id as fc_character_id
      FROM fleets f
      JOIN fleet_types ft ON f.fleet_type_id = ft.id
      JOIN fleet_commanders fc ON f.fc_id = fc.id
      WHERE f.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Fleet not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      fleet: result.rows[0],
    });
  } catch (error: any) {
    console.error('Error fetching fleet:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch fleet' }, { status: 500 });
  }
}

// PUT - Update existing fleet
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameter: id' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      scheduled_at,
      timezone,
      duration_minutes,
      fleet_type_id,
      fc_id,
      title,
      description,
      staging_system,
      comms_channel,
      status,
      actual_start_time,
      actual_end_time,
      participant_count,
    } = body;

    // Check if fleet exists
    const existingFleet = await pool.query('SELECT * FROM fleets WHERE id = $1', [id]);

    if (existingFleet.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Fleet not found' }, { status: 404 });
    }

    // Validate scheduled_at if provided
    if (scheduled_at) {
      const scheduledDate = new Date(scheduled_at);
      if (isNaN(scheduledDate.getTime())) {
        return NextResponse.json(
          { success: false, error: 'Invalid scheduled_at date format' },
          { status: 400 }
        );
      }
    }

    // Validate fleet_type_id if provided
    if (fleet_type_id) {
      const fleetTypeCheck = await pool.query('SELECT id FROM fleet_types WHERE id = $1', [
        fleet_type_id,
      ]);
      if (fleetTypeCheck.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Fleet type not found' },
          { status: 404 }
        );
      }
    }

    // Validate fc_id if provided
    if (fc_id) {
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
    }

    // Build dynamic UPDATE query
    const updates: string[] = [];
    const values: any[] = [id];
    let paramCount = 2;

    if (scheduled_at !== undefined) {
      updates.push(`scheduled_at = $${paramCount++}`);
      values.push(scheduled_at);
    }
    if (timezone !== undefined) {
      updates.push(`timezone = $${paramCount++}`);
      values.push(timezone);
    }
    if (duration_minutes !== undefined) {
      updates.push(`duration_minutes = $${paramCount++}`);
      values.push(duration_minutes);
    }
    if (fleet_type_id !== undefined) {
      updates.push(`fleet_type_id = $${paramCount++}`);
      values.push(fleet_type_id);
    }
    if (fc_id !== undefined) {
      updates.push(`fc_id = $${paramCount++}`);
      values.push(fc_id);
    }
    if (title !== undefined) {
      updates.push(`title = $${paramCount++}`);
      values.push(title);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description);
    }
    if (staging_system !== undefined) {
      updates.push(`staging_system = $${paramCount++}`);
      values.push(staging_system);
    }
    if (comms_channel !== undefined) {
      updates.push(`comms_channel = $${paramCount++}`);
      values.push(comms_channel);
    }
    if (status !== undefined) {
      updates.push(`status = $${paramCount++}`);
      values.push(status);
    }
    if (actual_start_time !== undefined) {
      updates.push(`actual_start_time = $${paramCount++}`);
      values.push(actual_start_time);
    }
    if (actual_end_time !== undefined) {
      updates.push(`actual_end_time = $${paramCount++}`);
      values.push(actual_end_time);
    }
    if (participant_count !== undefined) {
      updates.push(`participant_count = $${paramCount++}`);
      values.push(participant_count);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400 }
      );
    }

    updates.push(`updated_by = $${paramCount++}`);
    values.push(user.character_id);

    const query = `
      UPDATE fleets
      SET ${updates.join(', ')}
      WHERE id = $1
      RETURNING *
    `;

    const result = await pool.query(query, values);

    return NextResponse.json({
      success: true,
      fleet: result.rows[0],
    });
  } catch (error: any) {
    console.error('Error updating fleet:', error);
    return NextResponse.json({ success: false, error: 'Failed to update fleet' }, { status: 500 });
  }
}

// DELETE - Cancel/soft delete fleet
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameter: id' },
        { status: 400 }
      );
    }

    // Check if fleet exists
    const existingFleet = await pool.query('SELECT * FROM fleets WHERE id = $1', [id]);

    if (existingFleet.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Fleet not found' }, { status: 404 });
    }

    const fleet = existingFleet.rows[0];

    // If fleet is already completed, don't allow deletion
    if (fleet.status === 'completed') {
      return NextResponse.json(
        {
          success: false,
          error: 'Cannot delete completed fleet. Use status update to cancel instead.',
        },
        { status: 400 }
      );
    }

    // Soft delete by setting status to cancelled
    const result = await pool.query(
      `UPDATE fleets
       SET status = 'cancelled', updated_by = $2
       WHERE id = $1
       RETURNING *`,
      [id, user.character_id]
    );

    return NextResponse.json({
      success: true,
      message: 'Fleet cancelled successfully',
      fleet: result.rows[0],
    });
  } catch (error: any) {
    console.error('Error deleting fleet:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete fleet' }, { status: 500 });
  }
}
