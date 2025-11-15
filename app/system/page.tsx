'use client';

import { useState, useEffect } from 'react';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { formatDate } from '@/lib/utils/format';
import { RefreshCw } from 'lucide-react';

interface ESIStatus {
  esi_status: string;
  message: string;
  compatibility_date: string | null;
  critical_routes: Array<{
    route: string;
    status: string;
  }>;
  last_checked: string | null;
}

interface SystemStatus {
  database: {
    totalCount: number;
    idleCount: number;
    waitingCount: number;
    isConnected: boolean;
  };
  timestamp: string;
}

export default function SystemPage() {
  useEffect(() => {
    document.title = 'System Status - Bombers Bar';
  }, []);

  const [esiStatus, setEsiStatus] = useState<ESIStatus | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [clearingIdle, setClearingIdle] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadESIStatus() {
    try {
      const response = await fetch('/api/admin/esi-status');
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to load ESI status');
      }

      setEsiStatus(data);
    } catch (err: any) {
      console.error('Failed to load ESI status:', err);
      setError(err.message);
    }
  }

  async function loadSystemStatus() {
    try {
      const response = await fetch('/api/admin/system-status');
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to load system status');
      }

      setSystemStatus(data);
    } catch (err: any) {
      console.error('Failed to load system status:', err);
      setError(err.message);
    }
  }

  async function refreshAll() {
    setLoading(true);
    setError(null);
    await Promise.all([loadESIStatus(), loadSystemStatus()]);
    setLoading(false);
  }

  async function clearIdleConnections() {
    setClearingIdle(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch('/api/admin/system-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'clear_idle' }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to clear idle connections');
      }

      // Show success message
      setSuccessMessage(
        `Successfully cleared idle connections (before: ${data.before}, after: ${data.after})`
      );

      // Reload system status to show updated counts
      await loadSystemStatus();

      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      console.error('Failed to clear idle connections:', err);
      setError(err.message);
    } finally {
      setClearingIdle(false);
    }
  }

  useEffect(() => {
    refreshAll();

    // Auto-refresh every 60 seconds
    const interval = setInterval(refreshAll, 60000);
    return () => clearInterval(interval);
  }, []);

  function getStatusBadgeVariant(status: string): 'success' | 'warning' | 'error' {
    const normalizedStatus = status.toUpperCase();
    if (normalizedStatus === 'OK' || normalizedStatus === 'CONNECTED') {
      return 'success';
    }
    if (normalizedStatus === 'DEGRADED') {
      return 'warning';
    }
    return 'error';
  }

  function getRouteStatusClass(status: string): string {
    const classes: Record<string, string> = {
      ok: 'text-success',
      degraded: 'text-warning',
      down: 'text-error',
      recovering: 'text-primary',
      unknown: 'text-foreground-muted',
    };
    return classes[status] || classes.unknown;
  }

  return (
    <RequireAuth requiredRoles={['admin']}>
      <PageContainer>
        <PageHeader
          title="System Status"
          description="Monitor ESI API health and database connection status"
          actions={
            <Button onClick={refreshAll} disabled={loading} className="flex items-center gap-2">
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Refresh All
            </Button>
          }
        />

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 bg-success/10 border border-success text-success px-4 py-3 rounded-lg">
            {successMessage}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-danger/10 border border-danger text-danger px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Status Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ESI API Status */}
          <Card variant="bordered" padding="lg">
            <h2 className="text-xl font-semibold text-primary mb-4">EVE ESI API Status</h2>

            {loading && !esiStatus ? (
              <div className="text-center text-foreground-muted py-8">Loading ESI status...</div>
            ) : esiStatus ? (
              <div className="space-y-4">
                {/* Overall Status */}
                <div className="flex items-center justify-between">
                  <Badge variant={getStatusBadgeVariant(esiStatus.esi_status)}>
                    {esiStatus.esi_status}
                  </Badge>
                </div>

                {/* Message */}
                <p className="text-sm text-foreground-muted">{esiStatus.message}</p>

                {/* Compatibility Date */}
                {esiStatus.compatibility_date && (
                  <div className="bg-primary/10 border border-primary/30 rounded-lg p-3">
                    <span className="text-sm font-semibold text-primary">Compatibility Date: </span>
                    <span className="text-sm text-foreground font-mono">
                      {esiStatus.compatibility_date}
                    </span>
                  </div>
                )}

                {/* Critical Routes */}
                <div className="mt-4">
                  <h3 className="text-sm font-semibold text-primary mb-2">Critical Routes:</h3>
                  <div className="bg-background-tertiary rounded-lg p-3 space-y-2">
                    {esiStatus.critical_routes.map((route, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center py-2 border-b border-border last:border-b-0"
                      >
                        <span className="text-xs font-mono text-foreground-muted">
                          {route.route}
                        </span>
                        <span
                          className={`text-xs font-semibold uppercase ${getRouteStatusClass(route.status)}`}
                        >
                          {route.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Last Checked */}
                {esiStatus.last_checked && (
                  <p className="text-xs text-foreground-muted text-right mt-4">
                    Last checked: {formatDate(esiStatus.last_checked, 'MMM d, yyyy HH:mm:ss')}
                  </p>
                )}
              </div>
            ) : null}
          </Card>

          {/* Database Status */}
          <Card variant="bordered" padding="lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-primary">Database Status</h2>
              {systemStatus && systemStatus.database.idleCount > 0 && (
                <Button
                  onClick={clearIdleConnections}
                  variant="secondary"
                  size="sm"
                  className="text-xs"
                  isLoading={clearingIdle}
                  disabled={clearingIdle}
                >
                  {clearingIdle ? 'Clearing...' : 'Clear Idle'}
                </Button>
              )}
            </div>

            {loading && !systemStatus ? (
              <div className="text-center text-foreground-muted py-8">
                Loading database status...
              </div>
            ) : systemStatus ? (
              <div className="space-y-4">
                {/* Overall Status */}
                <div className="flex items-center justify-between">
                  <Badge variant={systemStatus.database.isConnected ? 'success' : 'error'}>
                    {systemStatus.database.isConnected ? 'CONNECTED' : 'DISCONNECTED'}
                  </Badge>
                </div>

                {/* Database Metrics */}
                <div className="bg-background-tertiary rounded-lg p-4 space-y-3">
                  <div>
                    <div className="text-xs text-foreground-muted mb-1">Connection Status</div>
                    <div className="text-sm font-semibold text-foreground">
                      {systemStatus.database.isConnected ? 'Connected' : 'Disconnected'}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-foreground-muted mb-1">Total Pool Size</div>
                    <div className="text-sm font-semibold text-foreground">
                      {systemStatus.database.totalCount}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-foreground-muted mb-1">Idle Connections</div>
                    <div className="text-sm font-semibold text-foreground">
                      {systemStatus.database.idleCount}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-foreground-muted mb-1">Waiting Requests</div>
                    <div className="text-sm font-semibold text-foreground">
                      {systemStatus.database.waitingCount}
                    </div>
                  </div>
                </div>

                {/* Last Checked */}
                <p className="text-xs text-foreground-muted text-right mt-4">
                  Last checked: {formatDate(systemStatus.timestamp, 'MMM d, yyyy HH:mm:ss')}
                </p>
              </div>
            ) : null}
          </Card>
        </div>
      </PageContainer>
    </RequireAuth>
  );
}
