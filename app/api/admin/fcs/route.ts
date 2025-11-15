/**
 * Fleet Commanders (FCs) Endpoint
 * Returns list of FCs with CRUD operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import pool from '@/lib/db';
import { isAuthorizedRole } from '@/lib/auth/roles';

const JWT_SECRET = process.env.JWT_SECRET!;

// Helper to verify auth
async function verifyAuth(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;

  if (!token) {
    return null;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return decoded;
  } catch {
    return null;
  }
}

// Helper to check if user can manage FCs
// Admin can manage all, Council can manage non-admin/non-council, Election Officer can manage non-admin
function canManageFC(userRoles: string[], targetFC: any | null = null): boolean {
  const isAdmin = userRoles?.some((role: string) => role === 'admin');
  const isCouncil = userRoles?.some((role: string) => role === 'Council');
  const isElectionOfficer = userRoles?.some((role: string) => role === 'Election Officer');

  // Admin can manage all
  if (isAdmin) return true;

  // For new FC creation
  if (!targetFC) {
    return isCouncil || isElectionOfficer;
  }

  // Council can manage non-admin and non-council
  if (isCouncil) {
    const targetIsAdmin = targetFC.is_admin;
    const targetIsCouncil = targetFC.access_level === 'Council';
    return !targetIsAdmin && !targetIsCouncil;
  }

  // Election Officer can manage non-admin
  if (isElectionOfficer) {
    return !targetFC.is_admin;
  }

  return false;
}

// Helper to get admin character IDs from environment
function getAdminCharacterIds(): number[] {
  const adminIds = process.env.ADMIN_CHARACTER_IDS || '';
  return adminIds
    .split(',')
    .map((id) => parseInt(id.trim()))
    .filter((id) => !isNaN(id));
}

// GET - List all FCs
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
    const status = searchParams.get('status');
    const rank = searchParams.get('rank');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '500');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = `SELECT * FROM fleet_commanders WHERE status != 'Deleted'`;
    const params: any[] = [];
    let paramCount = 1;

    if (status) {
      query += ` AND status = $${paramCount++}`;
      params.push(status);
    }

    if (rank) {
      query += ` AND rank = $${paramCount++}`;
      params.push(rank);
    }

    // Server-side search
    if (search && search.trim()) {
      query += ` AND (
        main_character_name ILIKE $${paramCount++}
        OR bb_corp_alt_name ILIKE $${paramCount++}
        OR notes ILIKE $${paramCount++}
      )`;
      const searchPattern = `%${search.trim()}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    query += ` ORDER BY
      CASE rank
        WHEN 'SFC' THEN 1
        WHEN 'FC' THEN 2
        WHEN 'JFC' THEN 3
        WHEN 'Support' THEN 4
        ELSE 5
      END,
      main_character_name ASC`;
    query += ` LIMIT $${paramCount++} OFFSET $${paramCount++}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get admin character IDs
    const adminIds = getAdminCharacterIds();

    // Add is_admin flag to each FC
    const fcs = result.rows.map((fc) => ({
      ...fc,
      is_admin: adminIds.includes(fc.main_character_id),
    }));

    // Get total count for pagination
    let countQuery = `SELECT COUNT(*) as total FROM fleet_commanders WHERE status != 'Deleted'`;
    const countParams: any[] = [];
    let countParamCount = 1;

    if (status) {
      countQuery += ` AND status = $${countParamCount++}`;
      countParams.push(status);
    }

    if (rank) {
      countQuery += ` AND rank = $${countParamCount++}`;
      countParams.push(rank);
    }

    if (search && search.trim()) {
      countQuery += ` AND (
        main_character_name ILIKE $${countParamCount++}
        OR bb_corp_alt_name ILIKE $${countParamCount++}
        OR notes ILIKE $${countParamCount++}
      )`;
      const searchPattern = `%${search.trim()}%`;
      countParams.push(searchPattern, searchPattern, searchPattern);
    }

    const countResult = await pool.query(countQuery, countParams);

    return NextResponse.json({
      success: true,
      fcs,
      count: fcs.length,
      total: parseInt(countResult.rows[0].total),
      pagination: {
        limit,
        offset,
        total: parseInt(countResult.rows[0].total),
      },
    });
  } catch (error: any) {
    console.error('[FCS] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to load FCs', details: error.message },
      { status: 500 }
    );
  }
}

// POST - Create new FC
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

    // Check if user can manage FCs
    if (!canManageFC(user.roles)) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Admin, Council, or Election Officer role required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      status,
      rank,
      main_character_id,
      main_character_name,
      bb_corp_alt_id,
      bb_corp_alt_name,
      additional_alts,
      notes,
      access_level,
    } = body;

    if (!main_character_id || !main_character_name || !rank || !status) {
      return NextResponse.json(
        { error: 'Missing required fields: main_character_id, main_character_name, rank, status' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `INSERT INTO fleet_commanders (
        status, rank, main_character_id, main_character_name,
        bb_corp_alt_id, bb_corp_alt_name, additional_alts,
        notes, access_level
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        status,
        rank,
        main_character_id,
        main_character_name,
        bb_corp_alt_id || null,
        bb_corp_alt_name || null,
        additional_alts ? JSON.stringify(additional_alts) : '[]',
        notes || null,
        access_level || null,
      ]
    );

    // Add is_admin flag
    const adminIds = getAdminCharacterIds();
    const fc = {
      ...result.rows[0],
      is_admin: adminIds.includes(result.rows[0].main_character_id),
    };

    return NextResponse.json({
      success: true,
      fc,
    }, { status: 201 });
  } catch (error: any) {
    console.error('[FCS] POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create FC', details: error.message },
      { status: 500 }
    );
  }
}

// PUT - Update existing FC
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

    const body = await request.json();
    const {
      id,
      status,
      rank,
      main_character_id,
      main_character_name,
      bb_corp_alt_id,
      bb_corp_alt_name,
      additional_alts,
      notes,
      access_level,
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Missing required field: id' },
        { status: 400 }
      );
    }

    // Get the existing FC to check permissions
    const existingFC = await pool.query(
      `SELECT * FROM fleet_commanders WHERE id = $1`,
      [id]
    );

    if (existingFC.rows.length === 0) {
      return NextResponse.json(
        { error: 'FC not found' },
        { status: 404 }
      );
    }

    // Add is_admin flag to existing FC
    const adminIds = getAdminCharacterIds();
    const targetFC = {
      ...existingFC.rows[0],
      is_admin: adminIds.includes(existingFC.rows[0].main_character_id),
    };

    // Check if user can manage this FC
    if (!canManageFC(user.roles, targetFC)) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'You do not have permission to edit this FC' },
        { status: 403 }
      );
    }

    const result = await pool.query(
      `UPDATE fleet_commanders SET
        status = COALESCE($2, status),
        rank = COALESCE($3, rank),
        main_character_id = COALESCE($4, main_character_id),
        main_character_name = COALESCE($5, main_character_name),
        bb_corp_alt_id = $6,
        bb_corp_alt_name = $7,
        additional_alts = COALESCE($8, additional_alts),
        notes = $9,
        access_level = $10,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *`,
      [
        id,
        status,
        rank,
        main_character_id,
        main_character_name,
        bb_corp_alt_id,
        bb_corp_alt_name,
        additional_alts ? JSON.stringify(additional_alts) : null,
        notes,
        access_level,
      ]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'FC not found' },
        { status: 404 }
      );
    }

    // Add is_admin flag
    const fc = {
      ...result.rows[0],
      is_admin: adminIds.includes(result.rows[0].main_character_id),
    };

    return NextResponse.json({
      success: true,
      fc,
    });
  } catch (error: any) {
    console.error('[FCS] PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update FC', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Soft delete FC (set status to 'Deleted')
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

    // Only Admin and Council can delete
    const canDelete = user.roles?.some((role: string) => ['admin', 'Council'].includes(role));
    if (!canDelete) {
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

    // Soft delete by setting status to 'Deleted'
    const result = await pool.query(
      `UPDATE fleet_commanders
       SET status = 'Deleted', updated_at = NOW()
       WHERE id = $1 AND status != 'Deleted'
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'FC not found or already deleted' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'FC deleted successfully',
      fc: result.rows[0],
    });
  } catch (error: any) {
    console.error('[FCS] DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete FC', details: error.message },
      { status: 500 }
    );
  }
}
