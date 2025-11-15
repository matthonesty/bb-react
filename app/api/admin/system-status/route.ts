/**
 * @fileoverview Admin System Status API
 *
 * Returns database connection status and pool metrics.
 * Requires admin authentication.
 */

import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';
import pool from '@/lib/db';

/**
 * GET /api/admin/system-status
 *
 * Get database and system status
 */
export async function GET() {
  // Check authentication
  const session = await getServerSession();

  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // Check admin role
  const isAdmin = session.roles?.includes('admin');

  if (!isAdmin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  try {
    // Get database pool status
    const poolStatus = {
      totalCount: pool.totalCount,
      idleCount: pool.idleCount,
      waitingCount: pool.waitingCount,
      isConnected: true, // If we can query the pool, we're connected
    };

    // Test connection with a simple query
    try {
      await pool.query('SELECT 1');
    } catch (error) {
      poolStatus.isConnected = false;
    }

    return NextResponse.json({
      success: true,
      database: poolStatus,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[ADMIN] System status error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
