/**
 * SRP Ship Types Configuration Endpoint
 * Manages SRP payout configuration for ship types
 */

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { isAuthorizedRole } from '@/lib/auth/roles';
import { verifyAuth, canManage } from '@/lib/auth/apiAuth';

// GET - List all ship types
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

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const is_active = searchParams.get('is_active');
    const group_name = searchParams.get('group_name');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '500');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = `SELECT * FROM srp_ship_types WHERE 1=1`;
    const params: any[] = [];
    let paramCount = 1;

    if (is_active !== null) {
      query += ` AND is_active = $${paramCount++}`;
      params.push(is_active === 'true');
    }

    if (group_name) {
      query += ` AND group_name = $${paramCount++}`;
      params.push(group_name);
    }

    // Server-side search
    if (search && search.trim()) {
      query += ` AND (
        type_name ILIKE $${paramCount++}
        OR group_name ILIKE $${paramCount++}
      )`;
      const searchPattern = `%${search.trim()}%`;
      params.push(searchPattern, searchPattern);
    }

    query += ` ORDER BY
      is_active DESC,
      group_name ASC,
      type_name ASC`;
    query += ` LIMIT $${paramCount++} OFFSET $${paramCount++}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count for pagination
    let countQuery = `SELECT COUNT(*) as total FROM srp_ship_types WHERE 1=1`;
    const countParams: any[] = [];
    let countParamCount = 1;

    if (is_active !== null) {
      countQuery += ` AND is_active = $${countParamCount++}`;
      countParams.push(is_active === 'true');
    }

    if (group_name) {
      countQuery += ` AND group_name = $${countParamCount++}`;
      countParams.push(group_name);
    }

    if (search && search.trim()) {
      countQuery += ` AND (
        type_name ILIKE $${countParamCount++}
        OR group_name ILIKE $${countParamCount++}
      )`;
      const searchPattern = `%${search.trim()}%`;
      countParams.push(searchPattern, searchPattern);
    }

    const countResult = await pool.query(countQuery, countParams);

    return NextResponse.json({
      success: true,
      ship_types: result.rows,
      count: result.rows.length,
      total: parseInt(countResult.rows[0].total),
      pagination: {
        limit,
        offset,
        total: parseInt(countResult.rows[0].total),
      },
    });
  } catch (error: any) {
    console.error('[SRP-CONFIG] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to load ship types', details: error.message },
      { status: 500 }
    );
  }
}

// POST - Create new ship type
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const user = await verifyAuth();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user can manage ship types
    if (!canManage(user.roles)) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Admin or Council role required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      type_id,
      type_name,
      group_id,
      group_name,
      base_payout,
      polarized_payout,
      fc_discretion,
      is_active,
      notes,
    } = body;

    if (!type_id || !type_name || !group_id || !group_name || base_payout === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: type_id, type_name, group_id, group_name, base_payout' },
        { status: 400 }
      );
    }

    // Check if type_id already exists
    const existing = await pool.query(
      `SELECT id, type_name FROM srp_ship_types WHERE type_id = $1`,
      [type_id]
    );

    if (existing.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: `"${type_name}" is already in the system` },
        { status: 409 }
      );
    }

    const result = await pool.query(
      `INSERT INTO srp_ship_types (
        type_id, type_name, group_id, group_name,
        base_payout, polarized_payout, fc_discretion,
        is_active, notes, created_by, updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        type_id,
        type_name,
        group_id,
        group_name,
        base_payout,
        polarized_payout || null,
        fc_discretion || false,
        is_active !== undefined ? is_active : true,
        notes || null,
        user.character_id,
        user.character_id,
      ]
    );

    return NextResponse.json(
      {
        success: true,
        ship_type: result.rows[0],
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('[SRP-CONFIG] POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create ship type', details: error.message },
      { status: 500 }
    );
  }
}

// PUT - Update existing ship type
export async function PUT(request: NextRequest) {
  try {
    // Verify authentication
    const user = await verifyAuth();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user can manage ship types
    if (!canManage(user.roles)) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Admin or Council role required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      id,
      type_id,
      type_name,
      group_id,
      group_name,
      base_payout,
      polarized_payout,
      fc_discretion,
      is_active,
      notes,
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing required field: id' }, { status: 400 });
    }

    // Check if ship type exists
    const existing = await pool.query(`SELECT id FROM srp_ship_types WHERE id = $1`, [id]);

    if (existing.rows.length === 0) {
      return NextResponse.json({ error: 'Ship type not found' }, { status: 404 });
    }

    // If updating type_id, check for conflicts
    if (type_id) {
      const typeIdCheck = await pool.query(
        `SELECT id, type_name FROM srp_ship_types WHERE type_id = $1 AND id != $2`,
        [type_id, id]
      );

      if (typeIdCheck.rows.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error: `Another ship type "${typeIdCheck.rows[0].type_name}" with this type_id already exists`,
          },
          { status: 409 }
        );
      }
    }

    const result = await pool.query(
      `UPDATE srp_ship_types SET
        type_id = COALESCE($2, type_id),
        type_name = COALESCE($3, type_name),
        group_id = COALESCE($4, group_id),
        group_name = COALESCE($5, group_name),
        base_payout = COALESCE($6, base_payout),
        polarized_payout = $7,
        fc_discretion = COALESCE($8, fc_discretion),
        is_active = COALESCE($9, is_active),
        notes = $10,
        updated_by = $11,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *`,
      [
        id,
        type_id,
        type_name,
        group_id,
        group_name,
        base_payout,
        polarized_payout,
        fc_discretion,
        is_active,
        notes,
        user.character_id,
      ]
    );

    return NextResponse.json({
      success: true,
      ship_type: result.rows[0],
    });
  } catch (error: any) {
    console.error('[SRP-CONFIG] PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update ship type', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Soft delete ship type (set is_active = false)
export async function DELETE(request: NextRequest) {
  try {
    // Verify authentication
    const user = await verifyAuth();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user can manage ship types
    if (!canManage(user.roles)) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Admin or Council role required' },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing required parameter: id' }, { status: 400 });
    }

    const result = await pool.query(
      `UPDATE srp_ship_types
       SET is_active = FALSE, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Ship type not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Ship type deactivated successfully',
      ship_type: result.rows[0],
    });
  } catch (error: any) {
    console.error('[SRP-CONFIG] DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to deactivate ship type', details: error.message },
      { status: 500 }
    );
  }
}
