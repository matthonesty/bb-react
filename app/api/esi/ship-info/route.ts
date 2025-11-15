/**
 * @fileoverview Ship Info ESI API Route
 * Search for ships by name using ESI
 */

import { NextRequest, NextResponse } from 'next/server';
import { searchShips } from '@/lib/esi/shipInfo.js';

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

    const typeIds = await searchShips(search);

    return NextResponse.json({
      success: true,
      type_ids: typeIds
    });

  } catch (error: any) {
    console.error('[API] Error searching ships:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to search ships' },
      { status: 500 }
    );
  }
}
