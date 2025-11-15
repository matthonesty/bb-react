/**
 * Fitting Import Endpoint
 * Parses EVE fitting format and returns categorized modules
 */

import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedRole } from '@/lib/auth/roles';
import { verifyAuth } from '@/lib/auth/apiAuth';
import {
  parseAndCategorizeFitting,
  formatForDatabase,
  getShipInfo,
  getGroupInfo
} from '@/lib/esi.js';

// POST - Parse EVE fitting and return categorized modules
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

    // Check if user has any authorized role (FC or higher)
    const hasAuthorizedRole = user.roles?.some((role: string) => isAuthorizedRole(role));

    if (!hasAuthorizedRole) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Authorized role required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { fitting_text } = body;

    if (!fitting_text || !fitting_text.trim()) {
      return NextResponse.json(
        { success: false, error: 'fitting_text is required' },
        { status: 400 }
      );
    }

    // Parse and categorize the fitting
    let categorized: any;
    try {
      categorized = await parseAndCategorizeFitting(fitting_text.trim());
    } catch (error: any) {
      return NextResponse.json(
        { success: false, error: 'Failed to parse fitting: ' + error.message },
        { status: 400 }
      );
    }

    // Get ship information from ESI
    let shipInfo: any;
    try {
      shipInfo = await getShipInfo(categorized.ship_type_id);
    } catch (error: any) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch ship information from ESI' },
        { status: 400 }
      );
    }

    // Get group info
    let groupInfo: any;
    try {
      groupInfo = await getGroupInfo(shipInfo.group_id);
    } catch (error: any) {
      console.error('Failed to fetch group info:', error);
      groupInfo = { name: 'Unknown' };
    }

    // Format for database (pad arrays to match slot counts)
    const formatted: any = formatForDatabase(categorized, shipInfo);

    // Return complete fitting data ready for doctrine creation
    return NextResponse.json({
      success: true,
      fitting: {
        ship_type_id: categorized.ship_type_id,
        ship_name: shipInfo.name,
        ship_group_id: shipInfo.group_id,
        ship_group_name: groupInfo.name,
        name: categorized.name,

        // Ship specifications
        high_slots: shipInfo.high_slots,
        mid_slots: shipInfo.mid_slots,
        low_slots: shipInfo.low_slots,
        rig_slots: shipInfo.rig_slots,
        launcher_hardpoints: shipInfo.launcher_hardpoints,
        turret_hardpoints: shipInfo.turret_hardpoints,
        cargo_capacity: shipInfo.cargo_capacity,

        // Categorized modules (formatted for database)
        high_slot_modules: formatted.high_slot_modules,
        mid_slot_modules: formatted.mid_slot_modules,
        low_slot_modules: formatted.low_slot_modules,
        rig_modules: formatted.rig_modules,
        cargo_items: formatted.cargo_items,

        // Module counts for validation
        module_counts: {
          high: categorized.high_slot_modules.length,
          mid: categorized.mid_slot_modules.length,
          low: categorized.low_slot_modules.length,
          rig: categorized.rig_modules.length,
          cargo: categorized.cargo_items.length
        }
      }
    });
  } catch (error: any) {
    console.error('Error importing fitting:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to import fitting' },
      { status: 500 }
    );
  }
}
