/**
 * Fleet Types Endpoint
 * Handles CRUD operations for fleet types
 */

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { isAuthorizedRole } from '@/lib/auth/roles';
import { verifyAuth, canManage } from '@/lib/auth/apiAuth';

// GET - List all fleet types with doctrine counts
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
    const includeInactive = searchParams.get('include_inactive') === 'true';
    const skipCounts = searchParams.get('skip_counts') === 'true';

    let query;

    if (skipCounts) {
      // Fast query without doctrine counts (for dropdowns/filters)
      query = `
        SELECT
          ft.id,
          ft.name,
          ft.description,
          ft.is_active,
          ft.display_order,
          ft.created_at,
          ft.updated_at
        FROM fleet_types ft
      `;

      if (!includeInactive) {
        query += ' WHERE ft.is_active = true';
      }

      query += ' ORDER BY ft.display_order ASC, ft.name ASC';
    } else {
      // Full query with doctrine counts
      query = `
        SELECT
          ft.id,
          ft.name,
          ft.description,
          ft.is_active,
          ft.display_order,
          ft.created_at,
          ft.updated_at,
          COUNT(d.id) as doctrine_count,
          COUNT(CASE WHEN d.is_active = true THEN 1 END) as active_doctrine_count
        FROM fleet_types ft
        LEFT JOIN doctrines d ON ft.id = d.fleet_type_id
      `;

      if (!includeInactive) {
        query += ' WHERE ft.is_active = true';
      }

      query += `
        GROUP BY ft.id
        ORDER BY ft.display_order ASC, ft.name ASC
      `;
    }

    const result = await pool.query(query);

    return NextResponse.json({
      success: true,
      fleet_types: result.rows
    });
  } catch (error: any) {
    console.error('Error fetching fleet types:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch fleet types' },
      { status: 500 }
    );
  }
}

// POST - Create new fleet type
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

    // Check if user can manage fleet composition
    if (!canManage(user.roles)) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Admin or Council role required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, description, display_order } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Fleet type name is required' },
        { status: 400 }
      );
    }

    // Check for duplicate name
    const checkResult = await pool.query(
      'SELECT id FROM fleet_types WHERE name = $1',
      [name.trim()]
    );

    if (checkResult.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Fleet type with this name already exists' },
        { status: 409 }
      );
    }

    // Create fleet type
    const result = await pool.query(
      `INSERT INTO fleet_types (name, description, display_order, created_by, updated_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        name.trim(),
        description?.trim() || null,
        display_order || 0,
        user.character_id,
        user.character_id
      ]
    );

    return NextResponse.json({
      success: true,
      fleet_type: result.rows[0]
    });
  } catch (error: any) {
    console.error('Error creating fleet type:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create fleet type' },
      { status: 500 }
    );
  }
}

// PUT - Update fleet type
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

    // Check if user can manage fleet composition
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
        { success: false, error: 'Fleet type ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, description, is_active, display_order } = body;

    // Build dynamic update query
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name.trim());
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description?.trim() || null);
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${paramCount++}`);
      values.push(is_active);
    }
    if (display_order !== undefined) {
      updates.push(`display_order = $${paramCount++}`);
      values.push(display_order);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400 }
      );
    }

    updates.push(`updated_at = NOW()`);
    updates.push(`updated_by = $${paramCount++}`);
    values.push(user.character_id);
    values.push(id);

    const result = await pool.query(
      `UPDATE fleet_types
       SET ${updates.join(', ')}
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Fleet type not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      fleet_type: result.rows[0]
    });
  } catch (error: any) {
    console.error('Error updating fleet type:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update fleet type' },
      { status: 500 }
    );
  }
}

// DELETE - Delete fleet type (cascades to doctrines)
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

    // Check if user can manage fleet composition
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
        { success: false, error: 'Fleet type ID is required' },
        { status: 400 }
      );
    }

    // Check if fleet type exists and get doctrine count
    const checkResult = await pool.query(
      `SELECT ft.*, COUNT(d.id) as doctrine_count
       FROM fleet_types ft
       LEFT JOIN doctrines d ON ft.id = d.fleet_type_id
       WHERE ft.id = $1
       GROUP BY ft.id`,
      [id]
    );

    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Fleet type not found' },
        { status: 404 }
      );
    }

    const fleetType = checkResult.rows[0];
    const doctrineCount = parseInt(fleetType.doctrine_count);

    // Delete fleet type (CASCADE will delete doctrines)
    await pool.query('DELETE FROM fleet_types WHERE id = $1', [id]);

    return NextResponse.json({
      success: true,
      message: `Fleet type "${fleetType.name}" and ${doctrineCount} doctrine(s) deleted`
    });
  } catch (error: any) {
    console.error('Error deleting fleet type:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete fleet type' },
      { status: 500 }
    );
  }
}
