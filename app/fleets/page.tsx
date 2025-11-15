'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Plus, Calendar, Users, MapPin } from 'lucide-react';
import { FleetModal } from '@/components/fleets/FleetModal';
import type { FleetManagement, FleetType, FleetCommander } from '@/types';
import Link from 'next/link';

function formatFleetTime(scheduled_at: string, timezone: string = 'UTC'): string {
  const date = new Date(scheduled_at);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: timezone,
    timeZoneName: 'short',
  });
}

export default function FleetsPage() {
  useEffect(() => {
    document.title = 'Fleet Management - Bombers Bar';
  }, []);

  const { hasRole } = useAuth();
  const [fleets, setFleets] = useState<FleetManagement[]>([]);
  const [fleetTypes, setFleetTypes] = useState<FleetType[]>([]);
  const [fcs, setFCs] = useState<FleetCommander[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [fleetTypeFilter, setFleetTypeFilter] = useState('');
  const [fcFilter, setFCFilter] = useState('');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFleet, setSelectedFleet] = useState<FleetManagement | null>(null);

  const canManage = hasRole(['admin', 'Council', 'FC', 'OBomberCare', 'Accountant', 'Election Officer']);

  const loadFleets = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        limit: '100',
      });

      if (statusFilter) params.append('status', statusFilter);
      if (fleetTypeFilter) params.append('fleet_type_id', fleetTypeFilter);
      if (fcFilter) params.append('fc_id', fcFilter);

      const response = await fetch(`/api/admin/fleets?${params}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to load fleets');
      }

      setFleets(data.fleets);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, fleetTypeFilter, fcFilter]);

  const loadFleetTypes = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/fleet-types');
      const data = await response.json();

      if (data.success) {
        setFleetTypes(data.fleet_types.filter((ft: FleetType) => ft.is_active));
      }
    } catch (err: any) {
      console.error('Failed to load fleet types:', err);
    }
  }, []);

  const loadFCs = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/fcs?status=Active&limit=500');
      const data = await response.json();

      if (data.success) {
        setFCs(data.fcs);
      }
    } catch (err: any) {
      console.error('Failed to load FCs:', err);
    }
  }, []);

  useEffect(() => {
    loadFleets();
    loadFleetTypes(); // Needed for filters
  }, [loadFleets, loadFleetTypes]);

  // Lazy load FCs only when modal opens
  useEffect(() => {
    if (isModalOpen && fcs.length === 0) {
      loadFCs();
    }
  }, [isModalOpen, fcs.length, loadFCs]);

  function openAddModal() {
    setSelectedFleet(null);
    setIsModalOpen(true);
  }

  function openEditModal(fleet: FleetManagement) {
    setSelectedFleet(fleet);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setSelectedFleet(null);
  }

  function handleModalSuccess() {
    loadFleets();
  }

  function getStatusBadgeVariant(status: string) {
    switch (status) {
      case 'scheduled':
        return 'info';
      case 'in_progress':
        return 'success';
      case 'completed':
        return 'default';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  }

  function getStatusLabel(status: string) {
    switch (status) {
      case 'scheduled':
        return 'Scheduled';
      case 'in_progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  }

  return (
    <RequireAuth requiredRoles={['admin', 'Council', 'FC', 'OBomberCare', 'Accountant', 'Election Officer']}>
      <PageContainer>
        <PageHeader
          title="Fleet Management"
          description="Manage scheduled fleets, participants, and kills"
          actions={
            canManage ? (
              <Button onClick={openAddModal} variant="primary">
                <Plus size={16} className="mr-2" />
                Schedule Fleet
              </Button>
            ) : undefined
          }
        />

        {/* Filters */}
        <Card variant="bordered" className="mb-6">
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-foreground-muted mb-2">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 bg-input-bg border border-input-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">All Statuses</option>
                <option value="scheduled">Scheduled</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-foreground-muted mb-2">
                Fleet Type
              </label>
              <select
                value={fleetTypeFilter}
                onChange={(e) => setFleetTypeFilter(e.target.value)}
                className="w-full px-3 py-2 bg-input-bg border border-input-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">All Fleet Types</option>
                {fleetTypes.map((ft) => (
                  <option key={ft.id} value={ft.id}>
                    {ft.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-foreground-muted mb-2">
                Fleet Commander
              </label>
              <select
                value={fcFilter}
                onChange={(e) => setFCFilter(e.target.value)}
                className="w-full px-3 py-2 bg-input-bg border border-input-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">All FCs</option>
                {fcs.map((fc) => (
                  <option key={fc.id} value={fc.id}>
                    {fc.main_character_name} ({fc.rank})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        {/* Fleet List */}
        {loading ? (
          <Card>
            <div className="text-center py-12 text-foreground-muted">Loading fleets...</div>
          </Card>
        ) : error ? (
          <Card variant="bordered">
            <div className="text-center py-8">
              <p className="text-error font-medium">Error loading fleets</p>
              <p className="text-foreground-muted text-sm mt-2">{error}</p>
            </div>
          </Card>
        ) : fleets.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <p className="text-foreground-muted text-lg mb-2">No fleets found</p>
              <p className="text-foreground-muted/70 text-sm">
                Try adjusting your filters or schedule a new fleet
              </p>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {fleets.map((fleet) => (
              <Link key={fleet.id} href={`/fleets/${fleet.id}`}>
                <Card
                  variant="bordered"
                  className="hover:border-primary/50 transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-foreground">
                          {fleet.title || `${fleet.fleet_type_name} Fleet`}
                        </h3>
                        <Badge variant={getStatusBadgeVariant(fleet.status)}>
                          {getStatusLabel(fleet.status)}
                        </Badge>
                      </div>
                      {fleet.description && (
                        <p className="text-sm text-foreground-muted mb-3">{fleet.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center gap-2 text-foreground-muted">
                      <Calendar size={16} className="text-primary" />
                      <div>
                        <div className="font-medium text-foreground">
                          {formatFleetTime(fleet.scheduled_at, fleet.timezone)}
                        </div>
                        <div className="text-xs">{fleet.duration_minutes} minutes</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-foreground-muted">
                      <Users size={16} className="text-primary" />
                      <div>
                        <div className="font-medium text-foreground">
                          {fleet.fc_name || 'Unknown FC'}
                        </div>
                        <div className="text-xs">
                          {fleet.fc_rank || 'FC'} • {fleet.participant_count} participants
                        </div>
                      </div>
                    </div>

                    {fleet.staging_system && (
                      <div className="flex items-center gap-2 text-foreground-muted">
                        <MapPin size={16} className="text-primary" />
                        <div>
                          <div className="font-medium text-foreground">{fleet.staging_system}</div>
                          <div className="text-xs">Staging System</div>
                        </div>
                      </div>
                    )}

                    {fleet.comms_channel && (
                      <div className="text-foreground-muted">
                        <div className="font-medium text-foreground">{fleet.comms_channel}</div>
                        <div className="text-xs">In-Game Channel</div>
                      </div>
                    )}
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {/* Fleet Modal */}
        {isModalOpen && (
          <FleetModal
            fleet={selectedFleet}
            fleetTypes={fleetTypes}
            fcs={fcs}
            onClose={closeModal}
            onSuccess={handleModalSuccess}
          />
        )}
      </PageContainer>
    </RequireAuth>
  );
}
