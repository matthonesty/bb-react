'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  ArrowLeft,
  Calendar,
  Users,
  MapPin,
  Clock,
  Pencil,
  Target,
  TrendingUp,
} from 'lucide-react';
import { FleetModal } from '@/components/fleets/FleetModal';
import type {
  FleetManagement,
  FleetParticipant,
  FleetKill,
  FleetType,
  FleetCommander,
} from '@/types';
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

function formatISK(value: number | null): string {
  if (!value) return '0 ISK';
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B ISK`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M ISK`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(2)}K ISK`;
  return `${value.toFixed(0)} ISK`;
}

export default function FleetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { hasRole } = useAuth();

  const [fleet, setFleet] = useState<FleetManagement | null>(null);
  const [participants, setParticipants] = useState<FleetParticipant[]>([]);
  const [kills, setKills] = useState<FleetKill[]>([]);
  const [killStats, setKillStats] = useState<any>(null);
  const [fleetTypes, setFleetTypes] = useState<FleetType[]>([]);
  const [fcs, setFCs] = useState<FleetCommander[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const canManage = hasRole(['admin', 'Council', 'FC', 'OBomberCare']);

  useEffect(() => {
    loadFleetData();
    loadFleetTypes();
    loadFCs();
  }, [params.id]);

  async function loadFleetData() {
    setLoading(true);
    setError(null);

    try {
      // Load fleet details
      const fleetResponse = await fetch(`/api/admin/fleets/${params.id}`);
      const fleetData = await fleetResponse.json();

      if (!fleetData.success) {
        throw new Error(fleetData.error || 'Failed to load fleet');
      }

      setFleet(fleetData.fleet);
      document.title = `${fleetData.fleet.title || fleetData.fleet.fleet_type_name} - Bombers Bar`;

      // Load participants
      const participantsResponse = await fetch(
        `/api/admin/fleet-participants?fleet_id=${params.id}`
      );
      const participantsData = await participantsResponse.json();

      if (participantsData.success) {
        setParticipants(participantsData.participants);
      }

      // Load kills
      const killsResponse = await fetch(`/api/admin/fleet-kills?fleet_id=${params.id}`);
      const killsData = await killsResponse.json();

      if (killsData.success) {
        setKills(killsData.kills);
        setKillStats(killsData.stats);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadFleetTypes() {
    try {
      const response = await fetch('/api/admin/fleet-types');
      const data = await response.json();
      if (data.success) {
        setFleetTypes(data.fleet_types);
      }
    } catch (err: any) {
      console.error('Failed to load fleet types:', err);
    }
  }

  async function loadFCs() {
    try {
      const response = await fetch('/api/admin/fcs?status=Active&limit=500');
      const data = await response.json();
      if (data.success) {
        setFCs(data.fcs);
      }
    } catch (err: any) {
      console.error('Failed to load FCs:', err);
    }
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

  // Group kills by drop number
  const killsByDrop = kills.reduce((acc, kill) => {
    if (!acc[kill.drop_number]) {
      acc[kill.drop_number] = [];
    }
    acc[kill.drop_number].push(kill);
    return acc;
  }, {} as Record<number, FleetKill[]>);

  if (loading) {
    return (
      <RequireAuth
        requiredRoles={['admin', 'Council', 'FC', 'OBomberCare', 'Accountant', 'Election Officer']}
      >
        <PageContainer>
          <Card>
            <div className="text-center py-12 text-foreground-muted">Loading fleet details...</div>
          </Card>
        </PageContainer>
      </RequireAuth>
    );
  }

  if (error || !fleet) {
    return (
      <RequireAuth
        requiredRoles={['admin', 'Council', 'FC', 'OBomberCare', 'Accountant', 'Election Officer']}
      >
        <PageContainer>
          <Card variant="bordered">
            <div className="text-center py-8">
              <p className="text-error font-medium">Error loading fleet</p>
              <p className="text-foreground-muted text-sm mt-2">{error || 'Fleet not found'}</p>
              <Button variant="primary" className="mt-4" onClick={() => router.push('/fleets')}>
                Back to Fleets
              </Button>
            </div>
          </Card>
        </PageContainer>
      </RequireAuth>
    );
  }

  return (
    <RequireAuth
      requiredRoles={['admin', 'Council', 'FC', 'OBomberCare', 'Accountant', 'Election Officer']}
    >
      <PageContainer>
        <div className="mb-6">
          <Link href="/fleets">
            <Button variant="ghost" size="sm">
              <ArrowLeft size={16} className="mr-2" />
              Back to Fleets
            </Button>
          </Link>
        </div>

        {/* Fleet Header */}
        <Card variant="bordered" className="mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-foreground">
                  {fleet.title || `${fleet.fleet_type_name} Fleet`}
                </h1>
                <Badge variant={getStatusBadgeVariant(fleet.status)}>
                  {getStatusLabel(fleet.status)}
                </Badge>
              </div>
              {fleet.description && (
                <p className="text-foreground-muted mb-4">{fleet.description}</p>
              )}
            </div>
            {canManage && (
              <Button variant="secondary" size="sm" onClick={() => setIsEditModalOpen(true)}>
                <Pencil size={14} className="mr-2" />
                Edit Fleet
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-foreground-muted text-sm">
                <Calendar size={16} className="text-primary" />
                <span>Scheduled Time</span>
              </div>
              <div className="text-foreground font-medium">
                {formatFleetTime(fleet.scheduled_at, fleet.timezone)}
              </div>
              <div className="text-foreground-muted text-xs">{fleet.duration_minutes} minutes</div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-foreground-muted text-sm">
                <Users size={16} className="text-primary" />
                <span>Fleet Commander</span>
              </div>
              <div className="text-foreground font-medium">{fleet.fc_name || 'Unknown FC'}</div>
              <div className="text-foreground-muted text-xs">{fleet.fc_rank || 'FC'}</div>
            </div>

            {fleet.staging_system && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-foreground-muted text-sm">
                  <MapPin size={16} className="text-primary" />
                  <span>Staging System</span>
                </div>
                <div className="text-foreground font-medium">{fleet.staging_system}</div>
              </div>
            )}

            {fleet.comms_channel && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-foreground-muted text-sm">
                  <Clock size={16} className="text-primary" />
                  <span>In-Game Channel</span>
                </div>
                <div className="text-foreground font-medium">{fleet.comms_channel}</div>
              </div>
            )}
          </div>

          {/* Fleet Stats */}
          {killStats && (
            <div className="mt-6 pt-6 border-t border-border">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-foreground-muted text-sm">
                    <Target size={16} className="text-primary" />
                    <span>Total Kills</span>
                  </div>
                  <div className="text-2xl font-bold text-foreground">
                    {killStats.total_kills || 0}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-foreground-muted text-sm">
                    <TrendingUp size={16} className="text-primary" />
                    <span>Total Value</span>
                  </div>
                  <div className="text-2xl font-bold text-foreground">
                    {formatISK(killStats.total_value)}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-foreground-muted text-sm">
                    <Users size={16} className="text-primary" />
                    <span>Participants</span>
                  </div>
                  <div className="text-2xl font-bold text-foreground">
                    {fleet.participant_count || 0}
                  </div>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Participants Section */}
        {participants.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              Participants ({participants.length})
            </h2>
            <Card variant="bordered">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-foreground-muted font-medium text-sm">
                        Character
                      </th>
                      <th className="text-left py-3 px-4 text-foreground-muted font-medium text-sm">
                        Role
                      </th>
                      <th className="text-right py-3 px-4 text-foreground-muted font-medium text-sm">
                        Kills
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {participants.map((participant) => (
                      <tr key={participant.id} className="border-b border-border last:border-0">
                        <td className="py-3 px-4 text-foreground">{participant.character_name}</td>
                        <td className="py-3 px-4 text-foreground-muted">
                          {participant.role || '-'}
                        </td>
                        <td className="py-3 px-4 text-right text-foreground">
                          {participant.kill_count || 0}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* Kills Section */}
        {Object.keys(killsByDrop).length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-4">
              Kills ({kills.length})
            </h2>
            <div className="space-y-6">
              {Object.keys(killsByDrop)
                .sort((a, b) => parseInt(a) - parseInt(b))
                .map((dropNumber) => {
                  const dropKills = killsByDrop[parseInt(dropNumber)];
                  const dropValue = dropKills.reduce(
                    (sum, k) => sum + (k.zkb_total_value || 0),
                    0
                  );

                  return (
                    <Card key={dropNumber} variant="bordered">
                      <div className="flex items-center justify-between mb-4 pb-4 border-b border-border">
                        <h3 className="text-lg font-semibold text-primary">
                          Drop #{dropNumber}
                        </h3>
                        <div className="flex items-center gap-4 text-sm">
                          <div className="text-foreground-muted">
                            <span className="text-foreground font-medium">{dropKills.length}</span>{' '}
                            kills
                          </div>
                          <div className="text-foreground-muted">
                            Total Value:{' '}
                            <span className="text-foreground font-medium">
                              {formatISK(dropValue)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {dropKills.map((kill) => (
                          <a
                            key={kill.id}
                            href={kill.zkill_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block"
                          >
                            <div className="bg-background-elevated border border-border rounded-lg p-4 hover:border-primary/50 transition-colors">
                              <div className="flex items-start gap-4">
                                <div className="flex-1">
                                  <div className="font-medium text-foreground mb-1">
                                    {kill.victim_ship_name || 'Unknown Ship'}
                                  </div>
                                  {kill.victim_character_name && (
                                    <div className="text-sm text-foreground-muted mb-2">
                                      {kill.victim_character_name}
                                      {kill.victim_corporation_name &&
                                        ` • ${kill.victim_corporation_name}`}
                                    </div>
                                  )}
                                  <div className="flex gap-4 text-sm text-foreground-muted">
                                    {kill.zkb_total_value && (
                                      <div>
                                        Value:{' '}
                                        <span className="text-foreground">
                                          {formatISK(kill.zkb_total_value)}
                                        </span>
                                      </div>
                                    )}
                                    {kill.hunter_name && (
                                      <div>
                                        Hunter:{' '}
                                        <span className="text-foreground">{kill.hunter_name}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </a>
                        ))}
                      </div>
                    </Card>
                  );
                })}
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {isEditModalOpen && fleet && (
          <FleetModal
            fleet={fleet}
            fleetTypes={fleetTypes}
            fcs={fcs}
            onClose={() => setIsEditModalOpen(false)}
            onSuccess={() => {
              setIsEditModalOpen(false);
              loadFleetData();
            }}
          />
        )}
      </PageContainer>
    </RequireAuth>
  );
}
