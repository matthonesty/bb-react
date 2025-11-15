/**
 * @fileoverview Centralized ESI Proxy API Route
 * Single endpoint for all ESI operations from client components
 */

import { NextRequest, NextResponse } from 'next/server';
import { resolveIds, getTypeInfo } from '@/lib/esi.js';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { operation, params } = body;

    if (!operation) {
      return NextResponse.json(
        { success: false, error: 'operation required' },
        { status: 400 }
      );
    }

    let result;

    switch (operation) {
      case 'resolveIds':
        if (!params?.names || !Array.isArray(params.names)) {
          return NextResponse.json(
            { success: false, error: 'names array required' },
            { status: 400 }
          );
        }
        result = await resolveIds(params.names);
        break;

      case 'getTypeInfo':
        if (!params?.typeId) {
          return NextResponse.json(
            { success: false, error: 'typeId required' },
            { status: 400 }
          );
        }
        result = await getTypeInfo(params.typeId);
        break;

      default:
        return NextResponse.json(
          { success: false, error: `Unknown operation: ${operation}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error: any) {
    console.error('[ESI PROXY] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'ESI operation failed' },
      { status: 500 }
    );
  }
}
