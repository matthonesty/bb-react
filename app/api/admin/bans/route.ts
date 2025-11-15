/**
 * Ban List Endpoint
 * Returns list of bans with CRUD operations
 */

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { isAuthorizedRole } from '@/lib/auth/roles';
import { verifyAuth, canManage } from '@/lib/auth/apiAuth';

// GET - List all bans
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user has any authorized role (FC or higher)
    const hasAuthorizedRole = user.roles?.some((role: string) => isAuthorizedRole(role));

    if (!hasAuthorizedRole) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Authorized role required' },
        { status: 403 }
      );
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type');
    const banType = searchParams.get('ban_type');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = `SELECT * FROM ban_list WHERE 1=1`;
    const params: any[] = [];
    let paramCount = 1;

    if (type) {
      query += ` AND type = $${paramCount++}`;
      params.push(type);
    }

    if (banType) {
      if (banType === 'bb') {
        query += ` AND bb_banned = true`;
      } else if (banType === 'xup') {
        query += ` AND xup_banned = true`;
      } else if (banType === 'hk') {
        query += ` AND hk_banned = true`;
      }
    }

    // Server-side search
    if (search && search.trim()) {
      query += ` AND (
        name ILIKE $${paramCount++}
        OR reason ILIKE $${paramCount++}
        OR banned_by ILIKE $${paramCount++}
      )`;
      const searchPattern = `%${search.trim()}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    query += ` ORDER BY name ASC`;
    query += ` LIMIT $${paramCount++} OFFSET $${paramCount++}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count for pagination
    let countQuery = `SELECT COUNT(*) as total FROM ban_list WHERE 1=1`;
    const countParams: any[] = [];
    let countParamCount = 1;

    if (type) {
      countQuery += ` AND type = $${countParamCount++}`;
      countParams.push(type);
    }

    if (banType) {
      if (banType === 'bb') {
        countQuery += ` AND bb_banned = true`;
      } else if (banType === 'xup') {
        countQuery += ` AND xup_banned = true`;
      } else if (banType === 'hk') {
        countQuery += ` AND hk_banned = true`;
      }
    }

    if (search && search.trim()) {
      countQuery += ` AND (
        name ILIKE $${countParamCount++}
        OR reason ILIKE $${countParamCount++}
        OR banned_by ILIKE $${countParamCount++}
      )`;
      const searchPattern = `%${search.trim()}%`;
      countParams.push(searchPattern, searchPattern, searchPattern);
    }

    const countResult = await pool.query(countQuery, countParams);

    return NextResponse.json({
      success: true,
      bans: result.rows,
      count: result.rows.length,
      total: parseInt(countResult.rows[0].total),
      pagination: {
        limit,
        offset,
        total: parseInt(countResult.rows[0].total),
      },
    });
  } catch (error: any) {
    console.error('[BANS] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to load bans', details: error.message },
      { status: 500 }
    );
  }
}

// POST - Create new ban
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user can manage bans (Admin & Council only)
    if (!canManage(user.roles)) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Admin or Council role required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      name,
      type,
      esi_id,
      bb_banned,
      xup_banned,
      hk_banned,
      banned_by,
      reason,
      ban_date,
    } = body;

    if (!name || !type) {
      return NextResponse.json(
        { error: 'Missing required fields: name, type' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `INSERT INTO ban_list (
        name, esi_id, type, bb_banned, xup_banned, hk_banned,
        banned_by, reason, ban_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        name,
        esi_id || null,
        type,
        bb_banned || false,
        xup_banned || false,
        hk_banned || false,
        banned_by || null,
        reason || null,
        ban_date || new Date().toISOString(),
      ]
    );

    return NextResponse.json({
      success: true,
      ban: result.rows[0],
    }, { status: 201 });
  } catch (error: any) {
    console.error('[BANS] POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create ban', details: error.message },
      { status: 500 }
    );
  }
}

// PUT - Update existing ban
export async function PUT(request: NextRequest) {
  try {
    // Verify authentication
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user can manage bans
    if (!canManage(user.roles)) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Admin or Council role required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      id,
      name,
      esi_id,
      type,
      bb_banned,
      xup_banned,
      hk_banned,
      banned_by,
      reason,
      ban_date,
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Missing required field: id' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `UPDATE ban_list SET
        name = COALESCE($2, name),
        esi_id = $3,
        type = COALESCE($4, type),
        bb_banned = COALESCE($5, bb_banned),
        xup_banned = COALESCE($6, xup_banned),
        hk_banned = COALESCE($7, hk_banned),
        banned_by = $8,
        reason = $9,
        ban_date = $10,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *`,
      [
        id,
        name,
        esi_id,
        type,
        bb_banned,
        xup_banned,
        hk_banned,
        banned_by,
        reason,
        ban_date,
      ]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Ban entry not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      ban: result.rows[0],
    });
  } catch (error: any) {
    console.error('[BANS] PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update ban', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Remove ban entry
export async function DELETE(request: NextRequest) {
  try {
    // Verify authentication
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user can manage bans
    if (!canManage(user.roles)) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Admin or Council role required' },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Missing required parameter: id' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `DELETE FROM ban_list
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Ban entry not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Ban entry deleted successfully',
      ban: result.rows[0],
    });
  } catch (error: any) {
    console.error('[BANS] DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete ban', details: error.message },
      { status: 500 }
    );
  }
}
