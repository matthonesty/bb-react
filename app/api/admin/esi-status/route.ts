/**
 * @fileoverview Admin ESI Status API
 *
 * Returns ESI health status for critical routes.
 * Requires admin authentication.
 */

import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';
import { getESIStatus, getHealthSummary } from '@/lib/esi/status.js';
import { getCompatibilityDateSync } from '@/lib/esi/helpers.js';

/**
 * Critical routes we depend on for mail processing and operations
 */
const CRITICAL_ROUTES = [
  { method: 'GET', path: '/characters/{character_id}/mail/' },
  { method: 'POST', path: '/characters/{character_id}/mail/' },
  { method: 'GET', path: '/characters/{character_id}/mail/{mail_id}/' },
  { method: 'POST', path: '/universe/names/' },
  { method: 'GET', path: '/corporations/{corporation_id}/wallets/{division}/journal/' },
];

// Removed duplicate functions - now using centralized helpers from lib/esi/status.js and lib/esi/helpers.js

/**
 * GET /api/admin/esi-status
 *
 * Get ESI health status for critical routes
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
    const statusData = await getESIStatus();
    const compatDate = getCompatibilityDateSync();

    if (!statusData || !Array.isArray(statusData)) {
      return NextResponse.json({
        success: true,
        esi_status: 'UNHEALTHY',
        message: 'Unable to fetch ESI status',
        compatibility_date: compatDate,
        critical_routes: [],
        last_checked: null,
      });
    }

    // Convert status.json status to our format
    const convertStatus = (esiStatus: string): string => {
      const statusMap: Record<string, string> = {
        green: 'ok',
        yellow: 'degraded',
        red: 'down',
      };
      return statusMap[esiStatus.toLowerCase()] || 'unknown';
    };

    // Check critical routes status
    const criticalRouteStatus = CRITICAL_ROUTES.map((criticalRoute) => {
      const routeStatus = statusData.find(
        (r: any) =>
          r.method.toUpperCase() === criticalRoute.method &&
          r.route === criticalRoute.path
      );

      return {
        route: `${criticalRoute.method} ${criticalRoute.path}`,
        status: routeStatus ? convertStatus(routeStatus.status) : 'unknown',
      };
    });

    // Determine overall status
    let overallStatus = 'OK';
    let message = 'All critical ESI routes operational';

    const downRoutes = criticalRouteStatus.filter((r) => r.status === 'down');
    const degradedRoutes = criticalRouteStatus.filter(
      (r) => r.status === 'degraded'
    );

    if (downRoutes.length > 0) {
      overallStatus = 'DOWN';
      message = `Critical routes unavailable: ${downRoutes.map((r) => r.route).join(', ')}`;
    } else if (degradedRoutes.length > 0) {
      overallStatus = 'DEGRADED';
      message = `Some routes degraded: ${degradedRoutes.map((r) => r.route).join(', ')}`;
    }

    return NextResponse.json({
      success: true,
      esi_status: overallStatus,
      message,
      compatibility_date: compatDate,
      critical_routes: criticalRouteStatus,
      last_checked: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[ADMIN] ESI status error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
