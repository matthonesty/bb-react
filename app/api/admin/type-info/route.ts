/**
 * @fileoverview Type Info API Route
 * Get type and group information for a given type_id
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTypeInfo } from '@/lib/esi/universe.js';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const type_id = searchParams.get('type_id');

    if (!type_id) {
      return NextResponse.json(
        { success: false, error: 'type_id parameter required' },
        { status: 400 }
      );
    }

    const typeInfo = await getTypeInfo(parseInt(type_id));

    return NextResponse.json({
      success: true,
      type_info: typeInfo
    });

  } catch (error: any) {
    console.error('[API] Error fetching type info:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch type info' },
      { status: 500 }
    );
  }
}
