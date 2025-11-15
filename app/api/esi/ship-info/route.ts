/**
 * @fileoverview Ship Info ESI API Route
 * Resolve ship type names to IDs using exact name matching
 */

import { NextRequest, NextResponse } from 'next/server';
import { resolveIds } from '@/lib/esi/universe.js';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const search = searchParams.get('search');

    if (!search || search.length < 3) {
      return NextResponse.json(
        { success: false, error: 'Search query must be at least 3 characters' },
        { status: 400 }
      );
    }

    // Use resolveIds to get exact name matches
    // NOTE: This requires EXACT ship type names (e.g., "Manticore" not "manti")
    const result = await resolveIds([search]) as any;

    // Extract inventory_type IDs if found
    const typeIds = result?.inventory_types?.map((item: any) => item.id) || [];

    return NextResponse.json({
      success: true,
      type_ids: typeIds
    });

  } catch (error: any) {
    console.error('[API] Error resolving ship type name:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to resolve ship type name' },
      { status: 500 }
    );
  }
}
