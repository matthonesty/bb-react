'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { X, Plus, Pencil, Trash2 } from 'lucide-react';
import { FCModal } from '@/components/fcs/FCModal';
import type { FleetCommander } from '@/types';

export default function FCsPage() {
  useEffect(() => {
    document.title = 'Fleet Commanders - Bombers Bar';
  }, []);

  const { user, hasRole } = useAuth();
  const [fcs, setFcs] = useState<FleetCommander[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('Active');
  const [rankFilter, setRankFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFC, setSelectedFC] = useState<FleetCommander | null>(null);

  // Admin/Council can manage all, Election Officer can manage non-admin
  const canManage = hasRole(['admin', 'Council', 'Election Officer']);
  const isAdmin = hasRole(['admin']);
  const isCouncil = hasRole(['Council']);

  useEffect(() => {
    loadFCs();
  }, [statusFilter, rankFilter, searchQuery]);

  async function loadFCs() {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        limit: '500',
      });

      if (statusFilter) params.append('status', statusFilter);
      if (rankFilter) params.append('rank', rankFilter);
      if (searchQuery) params.append('search', searchQuery);

      const response = await fetch(`/api/admin/fcs?${params}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to load FCs');
      }

      setFcs(data.fcs);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function openAddModal() {
    setSelectedFC(null);
    setIsModalOpen(true);
  }

  function openEditModal(fc: FleetCommander) {
    setSelectedFC(fc);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setSelectedFC(null);
  }

  function handleModalSuccess() {
    loadFCs();
  }

  async function deleteFC(id: number, name: string) {
    if (!confirm(`Are you sure you want to delete FC "${name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/fcs?id=${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to delete FC');
      }

      loadFCs();
    } catch (err: any) {
      setError(err.message);
    }
  }

  // Check if user can edit a specific FC
  function canEdit(fc: FleetCommander): boolean {
    if (isAdmin) return true;
    if (isCouncil) {
      // Council can edit non-admin and non-council
      return !fc.is_admin && fc.access_level !== 'Council';
    }
    // Election Officer can edit non-admin
    return !fc.is_admin;
  }

  // Only Admin and Council can delete
  const canDelete = hasRole(['admin', 'Council']);

  return (
    <RequireAuth requireFCRole>
      <PageContainer>
        <PageHeader
          title="Fleet Commanders"
          description="Manage fleet commanders and their access levels"
          actions={
            canManage && (
              <Button onClick={openAddModal}>
                <Plus size={16} className="mr-2" />
                Add FC
              </Button>
            )
          }
        />

        {/* Filters */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Input
              type="text"
              placeholder="Search by name or notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground transition-colors"
                aria-label="Clear search"
              >
                <X size={18} />
              </button>
            )}
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-input-bg border border-input-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Banned">Banned</option>
          </select>

          <select
            value={rankFilter}
            onChange={(e) => setRankFilter(e.target.value)}
            className="px-4 py-2 bg-input-bg border border-input-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Ranks</option>
            <option value="SFC">SFC</option>
            <option value="JFC">JFC</option>
            <option value="FC">FC</option>
            <option value="Support">Support</option>
          </select>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-danger/10 border border-danger text-danger px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Table */}
        <Card variant="bordered" padding="none">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <div className="text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
                <p className="mt-4 text-foreground-muted">Loading FCs...</p>
              </div>
            </div>
          ) : fcs.length === 0 ? (
            <div className="flex items-center justify-center p-12">
              <p className="text-foreground-muted">No FCs found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Rank</TableHead>
                    <TableHead>Access Level</TableHead>
                    <TableHead>Main Character</TableHead>
                    <TableHead>BB Corp Alt</TableHead>
                    <TableHead>Additional Alts</TableHead>
                    {canManage && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fcs.map((fc) => (
                    <TableRow key={fc.id}>
                      <TableCell>
                        <Badge
                          variant={
                            fc.status === 'Active'
                              ? 'success'
                              : fc.status === 'Inactive'
                              ? 'default'
                              : 'error'
                          }
                        >
                          {fc.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            fc.rank === 'SFC'
                              ? 'info'
                              : fc.rank === 'JFC'
                              ? 'warning'
                              : 'default'
                          }
                        >
                          {fc.rank}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {fc.is_admin ? (
                          <Badge variant="error">Admin</Badge>
                        ) : fc.access_level ? (
                          <Badge variant="info">{fc.access_level}</Badge>
                        ) : (
                          <span className="text-sm text-foreground-muted">None</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium text-foreground">
                          {fc.main_character_name}
                        </span>
                      </TableCell>
                      <TableCell>
                        {fc.bb_corp_alt_name ? (
                          <span className="text-sm text-foreground">
                            {fc.bb_corp_alt_name}
                          </span>
                        ) : (
                          <span className="text-sm text-foreground-muted">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {fc.additional_alts && fc.additional_alts.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {fc.additional_alts.map((alt, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-secondary/20 text-foreground border border-secondary/30"
                              >
                                {alt.character_name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm text-foreground-muted">-</span>
                        )}
                      </TableCell>
                      {canManage && (
                        <TableCell>
                          <div className="flex gap-2">
                            {canEdit(fc) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditModal(fc)}
                              >
                                <Pencil size={14} />
                              </Button>
                            )}
                            {canDelete && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteFC(fc.id, fc.main_character_name)}
                                className="text-error hover:text-error hover:bg-error/10"
                              >
                                <Trash2 size={14} />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>

        {/* Results Count */}
        {!loading && fcs.length > 0 && (
          <div className="mt-4 text-sm text-foreground-muted text-center">
            Showing {fcs.length} FC{fcs.length !== 1 ? 's' : ''}
          </div>
        )}

        {/* FC Modal */}
        <FCModal
          isOpen={isModalOpen}
          onClose={closeModal}
          onSuccess={handleModalSuccess}
          fc={selectedFC}
        />
      </PageContainer>
    </RequireAuth>
  );
}
