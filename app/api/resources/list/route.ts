/**
 * Resources List API Endpoint
 * Returns all non-deleted documents
 */

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Get all non-deleted documents
    const result = await pool.query(
      'SELECT title, filename, is_private FROM documents WHERE deleted_at IS NULL ORDER BY created_at ASC'
    );

    return NextResponse.json({
      success: true,
      documents: result.rows,
    });
  } catch (error: unknown) {
    console.error('[RESOURCES] LIST error:', error);
    return NextResponse.json({ error: 'Failed to load resources' }, { status: 500 });
  }
}
