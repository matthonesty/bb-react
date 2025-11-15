/**
 * Public Doctrines Endpoint
 * Returns active doctrines grouped by fleet type (no authentication required)
 */

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const fleetTypeId = searchParams.get('fleet_type_id');

    // Query for active doctrines with their fleet types
    let query = `
      SELECT
        d.id,
        d.fleet_type_id,
        d.name,
        d.ship_type_id,
        d.ship_name,
        d.ship_group_id,
        d.ship_group_name,
        d.high_slots,
        d.mid_slots,
        d.low_slots,
        d.rig_slots,
        d.high_slot_modules,
        d.mid_slot_modules,
        d.low_slot_modules,
        d.rig_modules,
        d.cargo_items,
        d.notes,
        d.display_order,
        ft.name as fleet_type_name,
        ft.description as fleet_type_description,
        ft.display_order as fleet_type_order
      FROM doctrines d
      JOIN fleet_types ft ON d.fleet_type_id = ft.id
      WHERE d.is_active = true AND ft.is_active = true
    `;
    const params: (string | number)[] = [];
    let paramCount = 1;

    if (fleetTypeId) {
      query += ` AND d.fleet_type_id = $${paramCount++}`;
      params.push(fleetTypeId);
    }

    query += ` ORDER BY ft.display_order ASC, d.display_order ASC, d.name ASC`;

    const result = await pool.query(query, params);

    // Group doctrines by fleet type
    const groupedDoctrines: Record<
      string,
      {
        fleet_type_id: number;
        fleet_type_name: string;
        fleet_type_description: string | null;
        fleet_type_order: number;
        doctrines: {
          id: number;
          name: string;
          ship_type_id: number;
          ship_name: string;
          ship_group_id: number | null;
          ship_group_name: string | null;
          high_slots: number;
          mid_slots: number;
          low_slots: number;
          rig_slots: number;
          high_slot_modules: string;
          mid_slot_modules: string;
          low_slot_modules: string;
          rig_modules: string;
          cargo_items: string;
          notes: string | null;
          display_order: number;
        }[];
      }
    > = {};

    result.rows.forEach((doctrine) => {
      const key = doctrine.fleet_type_id.toString();
      if (!groupedDoctrines[key]) {
        groupedDoctrines[key] = {
          fleet_type_id: doctrine.fleet_type_id,
          fleet_type_name: doctrine.fleet_type_name,
          fleet_type_description: doctrine.fleet_type_description,
          fleet_type_order: doctrine.fleet_type_order,
          doctrines: [],
        };
      }
      groupedDoctrines[key].doctrines.push({
        id: doctrine.id,
        name: doctrine.name,
        ship_type_id: doctrine.ship_type_id,
        ship_name: doctrine.ship_name,
        ship_group_id: doctrine.ship_group_id,
        ship_group_name: doctrine.ship_group_name,
        high_slots: doctrine.high_slots,
        mid_slots: doctrine.mid_slots,
        low_slots: doctrine.low_slots,
        rig_slots: doctrine.rig_slots,
        high_slot_modules: doctrine.high_slot_modules,
        mid_slot_modules: doctrine.mid_slot_modules,
        low_slot_modules: doctrine.low_slot_modules,
        rig_modules: doctrine.rig_modules,
        cargo_items: doctrine.cargo_items,
        notes: doctrine.notes,
        display_order: doctrine.display_order,
      });
    });

    // Convert to array and sort by fleet type order
    const fleetTypes = Object.values(groupedDoctrines).sort(
      (a, b) => a.fleet_type_order - b.fleet_type_order
    );

    return NextResponse.json({
      success: true,
      fleet_types: fleetTypes,
    });
  } catch (error: unknown) {
    console.error('Error fetching public doctrines:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch doctrines' },
      { status: 500 }
    );
  }
}
