/**
 * Fleet Participants Endpoint
 * Handles CRUD operations for fleet participants (hunters)
 */

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { isAuthorizedRole } from '@/lib/auth/roles';
import { verifyAuth } from '@/lib/auth/apiAuth';
import { resolveIds } from '@/lib/esi';

// GET - List participants for a fleet
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

    const searchParams = request.nextUrl.searchParams;
    const fleet_id = searchParams.get('fleet_id');

    if (!fleet_id) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameter: fleet_id' },
        { status: 400 }
      );
    }

    // Verify fleet exists
    const fleetCheck = await pool.query('SELECT id FROM fleets WHERE id = $1', [fleet_id]);

    if (fleetCheck.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Fleet not found' }, { status: 404 });
    }

    const result = await pool.query(
      `SELECT
        fp.*,
        COUNT(fk.id) as kill_count
      FROM fleet_participants fp
      LEFT JOIN fleet_kills fk ON fp.id = fk.hunter_id
      WHERE fp.fleet_id = $1
      GROUP BY fp.id
      ORDER BY fp.added_at ASC`,
      [fleet_id]
    );

    return NextResponse.json({
      success: true,
      participants: result.rows,
    });
  } catch (error: any) {
    console.error('Error fetching participants:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch participants' },
      { status: 500 }
    );
  }
}

// POST - Add participant to fleet
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const user = await verifyAuth();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { fleet_id, character_name, role } = body;

    // Validate required fields
    if (!fleet_id || !character_name) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: fleet_id, character_name',
        },
        { status: 400 }
      );
    }

    // Check if fleet exists and get FC info
    const fleetCheck = await pool.query(
      `SELECT f.id, fc.main_character_id as fc_character_id
       FROM fleets f
       JOIN fleet_commanders fc ON f.fc_id = fc.id
       WHERE f.id = $1`,
      [fleet_id]
    );

    if (fleetCheck.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Fleet not found' }, { status: 404 });
    }

    const fleet = fleetCheck.rows[0];

    // Check if user is Admin/Council or the fleet's FC
    const isAdminOrCouncil = user.roles?.some((role: string) =>
      role === 'admin' || role === 'Council'
    );
    const isFleetFC = user.character_id === fleet.fc_character_id;

    if (!isAdminOrCouncil && !isFleetFC) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Only the fleet FC or Council can manage participants' },
        { status: 403 }
      );
    }

    // Resolve character name to character ID using ESI
    let character_id: number;
    try {
      const resolvedIds = await resolveIds([character_name.trim()]);

      if (!resolvedIds.characters || resolvedIds.characters.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: `Character "${character_name}" not found. Please check the spelling and try again.`,
          },
          { status: 400 }
        );
      }

      character_id = resolvedIds.characters[0].id;
    } catch (esiError: any) {
      console.error('ESI character resolution failed:', esiError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to resolve character name. Please try again later.',
        },
        { status: 500 }
      );
    }

    // Check if participant already exists
    const existingCheck = await pool.query(
      'SELECT id FROM fleet_participants WHERE fleet_id = $1 AND character_id = $2',
      [fleet_id, character_id]
    );

    if (existingCheck.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Participant already added to this fleet' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `INSERT INTO fleet_participants (
        fleet_id, character_id, character_name, role, added_by
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
      [fleet_id, character_id, character_name, role || null, user.character_id]
    );

    return NextResponse.json(
      {
        success: true,
        participant: result.rows[0],
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error adding participant:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add participant' },
      { status: 500 }
    );
  }
}

// DELETE - Remove participant from fleet
export async function DELETE(request: NextRequest) {
  try {
    // Verify authentication
    const user = await verifyAuth();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameter: id' },
        { status: 400 }
      );
    }

    // Check if participant exists and get fleet FC info
    const participantCheck = await pool.query(
      `SELECT fp.id, fp.fleet_id, fc.main_character_id as fc_character_id
       FROM fleet_participants fp
       JOIN fleets f ON fp.fleet_id = f.id
       JOIN fleet_commanders fc ON f.fc_id = fc.id
       WHERE fp.id = $1`,
      [id]
    );

    if (participantCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Participant not found' },
        { status: 404 }
      );
    }

    const participant = participantCheck.rows[0];

    // Check if user is Admin/Council or the fleet's FC
    const isAdminOrCouncil = user.roles?.some((role: string) =>
      role === 'admin' || role === 'Council'
    );
    const isFleetFC = user.character_id === participant.fc_character_id;

    if (!isAdminOrCouncil && !isFleetFC) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Only the fleet FC or Council can manage participants' },
        { status: 403 }
      );
    }

    // Delete the participant
    await pool.query('DELETE FROM fleet_participants WHERE id = $1', [id]);

    return NextResponse.json({
      success: true,
      message: 'Participant removed successfully',
    });
  } catch (error: any) {
    console.error('Error deleting participant:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete participant' },
      { status: 500 }
    );
  }
}
