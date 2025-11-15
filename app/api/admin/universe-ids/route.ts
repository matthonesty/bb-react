/**
 * @fileoverview Universe IDs API Route
 * Resolve character/corporation names to IDs using ESI
 */

import { NextRequest, NextResponse } from 'next/server';
import { resolveIds } from '@/lib/esi/universe.js';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { names } = body;

    if (!names || !Array.isArray(names) || names.length === 0) {
      return NextResponse.json(
        { success: false, error: 'names array required' },
        { status: 400 }
      );
    }

    const result = await resolveIds(names);

    return NextResponse.json({
      success: true,
      ...result
    });

  } catch (error: any) {
    console.error('[API] Error resolving names to IDs:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to resolve names to IDs' },
      { status: 500 }
    );
  }
}
