/**
 * @fileoverview Admin ESI Status API
 *
 * Returns ESI health status for critical routes.
 * Requires admin authentication.
 */

import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';

/**
 * Critical routes we depend on for mail processing and operations
 */
const CRITICAL_ROUTES = [
  { method: 'GET', path: '/characters/{character_id}/mail' },
  { method: 'POST', path: '/characters/{character_id}/mail' },
  { method: 'GET', path: '/characters/{character_id}/mail/{mail_id}' },
  { method: 'POST', path: '/universe/names' },
  { method: 'GET', path: '/corporations/{corporation_id}/wallets/{division}/journal' },
];

/**
 * Cache for ESI status (1 minute)
 */
let cachedStatus: {
  data: any | null;
  lastFetched: number | null;
} = {
  data: null,
  lastFetched: null,
};

const CACHE_DURATION = 60000; // 1 minute

/**
 * Fetch ESI status from /meta/status endpoint
 */
async function fetchESIStatus(forceRefresh = false): Promise<any> {
  const now = Date.now();

  // Return cached data if still valid
  if (
    !forceRefresh &&
    cachedStatus.data &&
    cachedStatus.lastFetched &&
    now - cachedStatus.lastFetched < CACHE_DURATION
  ) {
    return cachedStatus.data;
  }

  try {
    const response = await fetch('https://esi.evetech.net/meta/status', {
      headers: {
        'User-Agent': 'Bombers Bar Admin Panel',
      },
    });

    if (!response.ok) {
      throw new Error(`ESI returned ${response.status}`);
    }

    const data = await response.json();

    cachedStatus.data = data;
    cachedStatus.lastFetched = now;

    return data;
  } catch (error: any) {
    console.error('[ESI STATUS] Failed to fetch:', error.message);

    // Return stale cache if available
    if (cachedStatus.data) {
      console.warn('[ESI STATUS] Using stale cached data');
      return cachedStatus.data;
    }

    return null;
  }
}

/**
 * Get compatibility date from ESI headers
 */
async function getCompatibilityDate(): Promise<string | null> {
  try {
    const response = await fetch('https://esi.evetech.net/latest/', {
      method: 'HEAD',
      headers: {
        'User-Agent': 'Bombers Bar Admin Panel',
      },
    });

    return response.headers.get('X-Compatibility-Date') || null;
  } catch (error) {
    console.error('[ESI] Failed to fetch compatibility date:', error);
    return null;
  }
}

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
    const [statusData, compatDate] = await Promise.all([
      fetchESIStatus(),
      getCompatibilityDate(),
    ]);

    if (!statusData || !statusData.routes) {
      return NextResponse.json({
        success: true,
        esi_status: 'UNHEALTHY',
        message: 'Unable to fetch ESI status',
        compatibility_date: compatDate,
        critical_routes: [],
        last_checked: null,
      });
    }

    // Check critical routes status
    const criticalRouteStatus = CRITICAL_ROUTES.map((criticalRoute) => {
      const routeStatus = statusData.routes.find(
        (r: any) =>
          r.method === criticalRoute.method && r.path === criticalRoute.path
      );

      return {
        route: `${criticalRoute.method} ${criticalRoute.path}`,
        status: routeStatus?.status?.toLowerCase() || 'unknown',
      };
    });

    // Determine overall status
    let overallStatus = 'OK';
    let message = 'All critical ESI routes operational';

    const downRoutes = criticalRouteStatus.filter((r) => r.status === 'down');
    const recoveringRoutes = criticalRouteStatus.filter(
      (r) => r.status === 'recovering'
    );
    const degradedRoutes = criticalRouteStatus.filter(
      (r) => r.status === 'degraded'
    );

    if (downRoutes.length > 0 || recoveringRoutes.length > 0) {
      overallStatus = 'DOWN';
      const issues = [
        ...downRoutes.map((r) => r.route),
        ...recoveringRoutes.map((r) => r.route),
      ];
      message = `Critical routes unavailable: ${issues.join(', ')}`;
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
      last_checked: cachedStatus.lastFetched
        ? new Date(cachedStatus.lastFetched).toISOString()
        : null,
    });
  } catch (error: any) {
    console.error('[ADMIN] ESI status error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
