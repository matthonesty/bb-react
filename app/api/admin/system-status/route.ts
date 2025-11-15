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
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/admin/system-status
 *
 * Perform maintenance actions on the database pool
 * Body: { action: 'clear_idle' }
 */
export async function POST(request: Request) {
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
    const body = await request.json();
    const { action } = body;

    if (action === 'clear_idle') {
      // End all idle clients in the pool
      // This will force them to reconnect on next use
      const beforeIdle = pool.idleCount;

      // pg.Pool doesn't have a direct "clear idle" method, but we can end the pool
      // and it will reconnect clients as needed. This is safe in Next.js as the pool
      // is a singleton and will be recreated on next import.
      await pool.query(
        "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle' AND pid != pg_backend_pid()"
      );

      const afterIdle = pool.idleCount;

      return NextResponse.json({
        success: true,
        message: `Cleared idle connections`,
        before: beforeIdle,
        after: afterIdle,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('[ADMIN] System status action error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
