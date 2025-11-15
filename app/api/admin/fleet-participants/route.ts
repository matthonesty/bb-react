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

    // Check if user has any authorized role
    const hasAuthorizedRole = user.roles?.some((role: string) => isAuthorizedRole(role));

    if (!hasAuthorizedRole) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Authorized role required' },
        { status: 403 }
      );
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

    // Verify fleet exists
    const fleetCheck = await pool.query('SELECT id FROM fleets WHERE id = $1', [fleet_id]);

    if (fleetCheck.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Fleet not found' }, { status: 404 });
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
