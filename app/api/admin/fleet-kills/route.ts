/**
 * Fleet Kills Endpoint
 * Handles CRUD operations for fleet kills (zkillboard links)
 */

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { isAuthorizedRole } from '@/lib/auth/roles';
import { verifyAuth } from '@/lib/auth/apiAuth';
import { enrichKillmail } from '@/lib/killmail/enrichment';

/**
 * Extract killmail ID from zkillboard URL
 * @param url - zkillboard URL
 * @returns killmail ID or null if invalid
 */
function extractKillmailId(url: string): number | null {
  // Match patterns like:
  // https://zkillboard.com/kill/123456/
  // zkillboard.com/kill/123456/
  // 123456
  const match = url.match(/(?:zkillboard\.com\/kill\/)?(\d+)/);
  return match ? parseInt(match[1]) : null;
}

// GET - List kills for a fleet
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
    const drop_number = searchParams.get('drop_number');
    const hunter_id = searchParams.get('hunter_id');

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

    // Build query with optional filters
    let query = `
      SELECT
        fk.*,
        fp.character_name as hunter_name,
        fp.role as hunter_role
      FROM fleet_kills fk
      LEFT JOIN fleet_participants fp ON fk.hunter_id = fp.id
      WHERE fk.fleet_id = $1
    `;
    const params: any[] = [fleet_id];
    let paramCount = 2;

    if (drop_number) {
      query += ` AND fk.drop_number = $${paramCount++}`;
      params.push(parseInt(drop_number));
    }

    if (hunter_id) {
      query += ` AND fk.hunter_id = $${paramCount++}`;
      params.push(parseInt(hunter_id));
    }

    query += ' ORDER BY fk.drop_number ASC, fk.added_at ASC';

    const result = await pool.query(query, params);

    // Calculate summary stats
    const statsResult = await pool.query(
      `SELECT
        COUNT(*) as total_kills,
        COALESCE(SUM(zkb_total_value), 0) as total_value,
        COUNT(DISTINCT drop_number) as total_drops
      FROM fleet_kills
      WHERE fleet_id = $1`,
      [fleet_id]
    );

    return NextResponse.json({
      success: true,
      kills: result.rows,
      stats: statsResult.rows[0],
    });
  } catch (error: any) {
    console.error('Error fetching fleet kills:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch fleet kills' },
      { status: 500 }
    );
  }
}

// POST - Add a drop (multiple kills) to a fleet
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const user = await verifyAuth();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { fleet_id, hunter_id, drop_number, zkill_urls } = body;

    // Validate required fields
    if (
      !fleet_id ||
      !drop_number ||
      !zkill_urls ||
      !Array.isArray(zkill_urls) ||
      zkill_urls.length === 0
    ) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: fleet_id, drop_number, zkill_urls (array)' },
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
        { error: 'Forbidden', message: 'Only the fleet FC or Council can add kills' },
        { status: 403 }
      );
    }

    // Verify hunter exists if provided
    if (hunter_id) {
      const hunterCheck = await pool.query(
        'SELECT id FROM fleet_participants WHERE id = $1 AND fleet_id = $2',
        [hunter_id, fleet_id]
      );

      if (hunterCheck.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Hunter not found in this fleet' },
          { status: 404 }
        );
      }
    }

    // Process each zkill URL
    const insertedKills: any[] = [];
    const errors: any[] = [];

    for (const url of zkill_urls) {
      const killmailId = extractKillmailId(url);

      if (!killmailId) {
        errors.push({ url, error: 'Invalid zkillboard URL format' });
        continue;
      }

      // Construct full zkill URL
      const fullUrl = `https://zkillboard.com/kill/${killmailId}/`;

      try {
        // Check if killmail already exists for this fleet
        const existingCheck = await pool.query(
          'SELECT id FROM fleet_kills WHERE fleet_id = $1 AND killmail_id = $2',
          [fleet_id, killmailId]
        );

        if (existingCheck.rows.length > 0) {
          errors.push({ url, error: 'Killmail already added to this fleet' });
          continue;
        }

        // Enrich killmail data from zkillboard and ESI
        let enrichedData: any = null;
        try {
          enrichedData = await enrichKillmail(killmailId);
        } catch (enrichError: any) {
          console.warn(
            `[FLEET KILLS] Failed to enrich killmail ${killmailId}:`,
            enrichError.message
          );
          // Continue with insertion even if enrichment fails
        }

        // Insert kill with enriched data
        let insertQuery: string;
        let insertParams: any[];

        if (enrichedData && !enrichedData.enrichment_error) {
          // Insert with full enriched data
          insertQuery = `INSERT INTO fleet_kills (
            fleet_id, killmail_id, zkill_url, killmail_hash, hunter_id, drop_number,
            zkb_location_id, zkb_total_value, zkb_fitted_value, zkb_dropped_value,
            zkb_destroyed_value, kill_time, solar_system_id,
            victim_character_id, victim_character_name,
            victim_corporation_id, victim_corporation_name,
            victim_alliance_id, victim_alliance_name,
            victim_ship_type_id, victim_ship_name,
            dropped_items, enriched_at, enrichment_error, added_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
                    $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
          RETURNING *`;

          insertParams = [
            fleet_id,
            killmailId,
            fullUrl,
            enrichedData.killmail_hash,
            hunter_id || null,
            drop_number,
            enrichedData.zkb_location_id,
            enrichedData.zkb_total_value,
            enrichedData.zkb_fitted_value,
            enrichedData.zkb_dropped_value,
            enrichedData.zkb_destroyed_value,
            enrichedData.kill_time,
            enrichedData.solar_system_id,
            enrichedData.victim_character_id,
            enrichedData.victim_character_name,
            enrichedData.victim_corporation_id,
            enrichedData.victim_corporation_name,
            enrichedData.victim_alliance_id,
            enrichedData.victim_alliance_name,
            enrichedData.victim_ship_type_id,
            enrichedData.victim_ship_name,
            enrichedData.dropped_items ? JSON.stringify(enrichedData.dropped_items) : null,
            enrichedData.enriched_at,
            null,
            user.character_id,
          ];
        } else {
          // Insert basic data, enrichment failed or partial
          insertQuery = `INSERT INTO fleet_kills (
            fleet_id, killmail_id, zkill_url, hunter_id, drop_number,
            enriched_at, enrichment_error, added_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING *`;

          insertParams = [
            fleet_id,
            killmailId,
            fullUrl,
            hunter_id || null,
            drop_number,
            new Date(),
            enrichedData?.enrichment_error || 'Enrichment failed',
            user.character_id,
          ];
        }

        const result = await pool.query(insertQuery, insertParams);
        insertedKills.push(result.rows[0]);
      } catch (error: any) {
        errors.push({ url, error: error.message });
      }
    }

    return NextResponse.json(
      {
        success: true,
        inserted_count: insertedKills.length,
        error_count: errors.length,
        kills: insertedKills,
        errors: errors.length > 0 ? errors : undefined,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error adding fleet kills:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add fleet kills' },
      { status: 500 }
    );
  }
}
