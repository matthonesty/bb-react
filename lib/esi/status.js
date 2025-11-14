/**
 * @fileoverview ESI Status Service
 *
 * Checks ESI health status before processing to avoid hitting degraded/down routes.
 * Uses new /meta/status endpoint (replacing legacy /status.json)
 *
 * Status values:
 * - OK: Route operational and available
 * - Degraded: Route slow to respond, some 5XX errors
 * - Down: Most traffic returning 5XX, route may not be usable
 * - Recovering: Route recovering from outage
 *
 * @see {@link https://esi.evetech.net/ui/#/Meta/get_meta_status}
 */

import { ESI_BASE_URL, esiGet, getCompatibilityDateSync } from './helpers.js';

/**
 * Cached status data
 */
let cachedStatus = {
  data: null,
  lastFetched: null,
  cacheDuration: 60000, // 1 minute cache
};

/**
 * Critical routes we depend on for mail processing
 * Format: { method, path } to match /meta/status response
 */
const CRITICAL_ROUTES = [
  { method: 'GET', path: '/characters/{character_id}/mail' },
  { method: 'POST', path: '/characters/{character_id}/mail' },
  { method: 'GET', path: '/characters/{character_id}/mail/{mail_id}' },
  { method: 'POST', path: '/universe/names' },
  { method: 'GET', path: '/corporations/{corporation_id}/wallets/{division}/journal' },
];

/**
 * Get ESI status from /meta/status endpoint
 *
 * @param {boolean} [forceRefresh=false] - Force refresh cache
 * @returns {Promise<Object>} ESI status data
 */
async function getESIStatus(forceRefresh = false) {
  const now = Date.now();

  // Return cached data if still valid
  if (!forceRefresh && cachedStatus.data && (now - cachedStatus.lastFetched) < cachedStatus.cacheDuration) {
    return cachedStatus.data;
  }

  try {
    // Meta endpoints are at root level, not under /latest/
    const url = 'https://esi.evetech.net/meta/status';
    const status = await esiGet(url);

    cachedStatus.data = status;
    cachedStatus.lastFetched = now;

    return status;
  } catch (error) {
    console.error('[ESI STATUS] Failed to fetch status:', error.message);

    // If we have cached data, return it even if stale
    if (cachedStatus.data) {
      console.warn('[ESI STATUS] Using stale cached data due to fetch failure');
      return cachedStatus.data;
    }

    // No cached data - assume ESI is down
    return null;
  }
}

/**
 * Check if ESI is healthy enough to process mails
 *
 * Returns false if any critical routes are Down or Recovering.
 * Allows Degraded routes with a warning.
 *
 * @returns {Promise<Object>} { healthy: boolean, issues: string[], warnings: string[] }
 */
async function checkESIHealth() {
  const statusData = await getESIStatus();

  const result = {
    healthy: true,
    issues: [],
    warnings: [],
  };

  if (!statusData || !statusData.routes || statusData.routes.length === 0) {
    result.healthy = false;
    result.issues.push('Unable to fetch ESI status - assuming unhealthy');
    return result;
  }

  // Check critical routes
  for (const criticalRoute of CRITICAL_ROUTES) {
    const routeStatus = statusData.routes.find(
      r => r.method === criticalRoute.method && r.path === criticalRoute.path
    );

    if (!routeStatus) {
      // Route not in status list - assume OK
      continue;
    }

    const statusValue = routeStatus.status.toLowerCase();
    const routeLabel = `${criticalRoute.method} ${criticalRoute.path}`;

    if (statusValue === 'down') {
      result.healthy = false;
      result.issues.push(`Critical route DOWN: ${routeLabel}`);
    } else if (statusValue === 'recovering') {
      result.healthy = false;
      result.issues.push(`Critical route RECOVERING: ${routeLabel}`);
    } else if (statusValue === 'degraded') {
      result.warnings.push(`Critical route DEGRADED (may be slow): ${routeLabel}`);
    }
  }

  return result;
}

/**
 * Get current X-Compatibility-Date
 *
 * Returns the cached compatibility date from helpers module.
 * The date is automatically fetched and refreshed every hour.
 *
 * @returns {Promise<string>} Latest compatibility date (YYYY-MM-DD)
 */
async function getCompatibilityDate() {
  // Use the cached value from helpers (synchronous, already fetched)
  return getCompatibilityDateSync();
}

/**
 * Check if all critical mail-related routes are operational
 * Quick health check for mail processing
 *
 * @returns {Promise<boolean>} True if safe to process mails
 */
async function isMailProcessingSafe() {
  const health = await checkESIHealth();

  if (!health.healthy) {
    console.error('[ESI STATUS] Mail processing UNSAFE:', health.issues.join(', '));
    return false;
  }

  if (health.warnings.length > 0) {
    console.warn('[ESI STATUS] Mail processing may be slow:', health.warnings.join(', '));
  }

  return true;
}

/**
 * Get human-readable ESI health summary
 *
 * @returns {Promise<Object>} { status: string, message: string, routes: Object[] }
 */
async function getHealthSummary() {
  const health = await checkESIHealth();
  const statusData = await getESIStatus();

  let overallStatus = 'OK';
  let message = 'All critical ESI routes operational';

  if (!health.healthy) {
    overallStatus = 'DOWN';
    message = `Critical issues detected: ${health.issues.join(', ')}`;
  } else if (health.warnings.length > 0) {
    overallStatus = 'DEGRADED';
    message = `Some routes degraded: ${health.warnings.join(', ')}`;
  }

  // Get status of critical routes
  const routes = CRITICAL_ROUTES.map(criticalRoute => {
    const routeStatus = statusData?.routes?.find(
      r => r.method === criticalRoute.method && r.path === criticalRoute.path
    );

    return {
      route: `${criticalRoute.method} ${criticalRoute.path}`,
      status: routeStatus?.status?.toLowerCase() || 'unknown',
    };
  });

  return {
    status: overallStatus,
    message,
    routes,
    lastChecked: cachedStatus.lastFetched ? new Date(cachedStatus.lastFetched).toISOString() : null,
  };
}

export {
  getESIStatus,
  checkESIHealth,
  getCompatibilityDate,
  isMailProcessingSafe,
  getHealthSummary
};
