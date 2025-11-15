/**
 * Doctrines Endpoint
 * Handles CRUD operations for ship doctrines within fleet types
 */

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { isAuthorizedRole } from '@/lib/auth/roles';
import { verifyAuth, canManage } from '@/lib/auth/apiAuth';

// GET - List doctrines (optionally filtered by fleet_type_id)
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
    const fleetTypeId = searchParams.get('fleet_type_id');
    const includeInactive = searchParams.get('include_inactive') === 'true';
    const id = searchParams.get('id');

    // If ID is provided, get single doctrine
    if (id) {
      const result = await pool.query(
        `SELECT d.*, ft.name as fleet_type_name
         FROM doctrines d
         JOIN fleet_types ft ON d.fleet_type_id = ft.id
         WHERE d.id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Doctrine not found' }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        doctrine: result.rows[0],
      });
    }

    // Otherwise, list doctrines
    let query = `
      SELECT d.*, ft.name as fleet_type_name
      FROM doctrines d
      JOIN fleet_types ft ON d.fleet_type_id = ft.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (fleetTypeId) {
      query += ` AND d.fleet_type_id = $${paramCount++}`;
      params.push(fleetTypeId);
    }

    if (!includeInactive) {
      query += ' AND d.is_active = true';
    }

    query += ` ORDER BY d.display_order ASC, d.name ASC`;

    const result = await pool.query(query, params);

    return NextResponse.json({
      success: true,
      doctrines: result.rows,
    });
  } catch (error: any) {
    console.error('Error fetching doctrines:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch doctrines' },
      { status: 500 }
    );
  }
}

// POST - Create new doctrine
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user can manage fleet composition
    if (!canManage(user.roles)) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Admin or Council role required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      fleet_type_id,
      name,
      ship_type_id,
      ship_name,
      ship_group_id,
      ship_group_name,
      high_slots,
      mid_slots,
      low_slots,
      rig_slots,
      high_slot_modules,
      mid_slot_modules,
      low_slot_modules,
      rig_modules,
      cargo_items,
      notes,
      display_order,
    } = body;

    if (!fleet_type_id || !name || !ship_type_id) {
      return NextResponse.json(
        { success: false, error: 'fleet_type_id, name, and ship_type_id are required' },
        { status: 400 }
      );
    }

    // Check for duplicate name within fleet type
    const checkResult = await pool.query(
      'SELECT id FROM doctrines WHERE fleet_type_id = $1 AND name = $2',
      [fleet_type_id, name.trim()]
    );

    if (checkResult.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Doctrine with this name already exists in this fleet type' },
        { status: 409 }
      );
    }

    // Create doctrine
    const result = await pool.query(
      `INSERT INTO doctrines (
        fleet_type_id, name, ship_type_id, ship_name, ship_group_id, ship_group_name,
        high_slots, mid_slots, low_slots, rig_slots,
        high_slot_modules, mid_slot_modules, low_slot_modules, rig_modules, cargo_items,
        notes, display_order, created_by, updated_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING *`,
      [
        fleet_type_id,
        name.trim(),
        ship_type_id,
        ship_name,
        ship_group_id || null,
        ship_group_name || null,
        high_slots || 0,
        mid_slots || 0,
        low_slots || 0,
        rig_slots || 0,
        JSON.stringify(high_slot_modules || []),
        JSON.stringify(mid_slot_modules || []),
        JSON.stringify(low_slot_modules || []),
        JSON.stringify(rig_modules || []),
        JSON.stringify(cargo_items || []),
        notes || null,
        display_order || 0,
        user.character_id,
        user.character_id,
      ]
    );

    return NextResponse.json({
      success: true,
      doctrine: result.rows[0],
    });
  } catch (error: any) {
    console.error('Error creating doctrine:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create doctrine' },
      { status: 500 }
    );
  }
}

// PUT - Update doctrine
export async function PUT(request: NextRequest) {
  try {
    // Verify authentication
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
        { success: false, error: 'Doctrine ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      name,
      high_slot_modules,
      mid_slot_modules,
      low_slot_modules,
      rig_modules,
      cargo_items,
      notes,
      is_active,
      display_order,
    } = body;

    // Build dynamic update query
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name.trim());
    }
    if (high_slot_modules !== undefined) {
      updates.push(`high_slot_modules = $${paramCount++}`);
      values.push(JSON.stringify(high_slot_modules));
    }
    if (mid_slot_modules !== undefined) {
      updates.push(`mid_slot_modules = $${paramCount++}`);
      values.push(JSON.stringify(mid_slot_modules));
    }
    if (low_slot_modules !== undefined) {
      updates.push(`low_slot_modules = $${paramCount++}`);
      values.push(JSON.stringify(low_slot_modules));
    }
    if (rig_modules !== undefined) {
      updates.push(`rig_modules = $${paramCount++}`);
      values.push(JSON.stringify(rig_modules));
    }
    if (cargo_items !== undefined) {
      updates.push(`cargo_items = $${paramCount++}`);
      values.push(JSON.stringify(cargo_items));
    }
    if (notes !== undefined) {
      updates.push(`notes = $${paramCount++}`);
      values.push(notes);
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
      return NextResponse.json({ success: false, error: 'No fields to update' }, { status: 400 });
    }

    updates.push(`updated_at = NOW()`);
    updates.push(`updated_by = $${paramCount++}`);
    values.push(user.character_id);
    values.push(id);

    const result = await pool.query(
      `UPDATE doctrines
       SET ${updates.join(', ')}
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Doctrine not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      doctrine: result.rows[0],
    });
  } catch (error: any) {
    console.error('Error updating doctrine:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update doctrine' },
      { status: 500 }
    );
  }
}

// DELETE - Delete doctrine
export async function DELETE(request: NextRequest) {
  try {
    // Verify authentication
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
        { success: false, error: 'Doctrine ID is required' },
        { status: 400 }
      );
    }

    const result = await pool.query('DELETE FROM doctrines WHERE id = $1 RETURNING name', [id]);

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Doctrine not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Doctrine "${result.rows[0].name}" deleted`,
    });
  } catch (error: any) {
    console.error('Error deleting doctrine:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete doctrine' },
      { status: 500 }
    );
  }
}
