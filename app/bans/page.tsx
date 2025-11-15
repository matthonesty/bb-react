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
import { formatDate } from '@/lib/utils/format';
import { X, Plus, Pencil, Trash2 } from 'lucide-react';
import type { Ban } from '@/types';

export default function BansPage() {
  useEffect(() => {
    document.title = 'Ban List - Bombers Bar';
  }, []);

  const { user, hasRole } = useAuth();
  const [bans, setBans] = useState<Ban[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [typeFilter, setTypeFilter] = useState('');
  const [banTypeFilter, setBanTypeFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const canManage = hasRole(['admin', 'Council']);

  useEffect(() => {
    loadBans();
  }, [typeFilter, banTypeFilter, searchQuery]);

  async function loadBans() {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        limit: '500',
      });

      if (typeFilter) params.append('type', typeFilter);
      if (banTypeFilter) params.append('ban_type', banTypeFilter);
      if (searchQuery) params.append('search', searchQuery);

      const response = await fetch(`/api/admin/bans?${params}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to load bans');
      }

      setBans(data.bans);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function deleteBan(id: number, name: string) {
    if (!confirm(`Are you sure you want to delete the ban for "${name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/bans?id=${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to delete ban');
      }

      loadBans();
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <RequireAuth requireFCRole>
      <PageContainer>
        <PageHeader
          title="Ban List"
          description="Manage banned characters, corporations, and alliances"
          actions={
            canManage && (
              <Button>
                <Plus size={16} className="mr-2" />
                Add Ban
              </Button>
            )
          }
        />

        {/* Filters */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Input
              type="text"
              placeholder="Search by name, reason, or banned by..."
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
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 bg-input-bg border border-input-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Types</option>
            <option value="Character">Character</option>
            <option value="Corp">Corporation</option>
            <option value="Alliance">Alliance</option>
          </select>

          <select
            value={banTypeFilter}
            onChange={(e) => setBanTypeFilter(e.target.value)}
            className="px-4 py-2 bg-input-bg border border-input-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Ban Types</option>
            <option value="bb">BB (Global)</option>
            <option value="xup">X-up Channel</option>
            <option value="hk">HK Channel</option>
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
                <p className="mt-4 text-foreground-muted">Loading bans...</p>
              </div>
            </div>
          ) : bans.length === 0 ? (
            <div className="flex items-center justify-center p-12">
              <p className="text-foreground-muted">No bans found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>ESI ID</TableHead>
                    <TableHead>Ban Scope</TableHead>
                    <TableHead>Banned By</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Date</TableHead>
                    {canManage && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bans.map((ban) => (
                    <TableRow key={ban.id}>
                      <TableCell>
                        <span className="text-sm font-medium text-foreground">
                          {ban.name}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          ban.type === 'Character' ? 'default' :
                          ban.type === 'Corp' ? 'warning' : 'info'
                        }>
                          {ban.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-foreground-muted">
                          {ban.esi_id || '-'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {ban.bb_banned && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-error/20 text-error border border-error/30">
                              BB
                            </span>
                          )}
                          {ban.xup_banned && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-warning/20 text-warning border border-warning/30">
                              X-up
                            </span>
                          )}
                          {ban.hk_banned && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/20 text-primary border border-primary/30">
                              HK
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-foreground">
                          {ban.banned_by || '-'}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <span className="text-sm text-foreground truncate block">
                          {ban.reason || '-'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-foreground-muted whitespace-nowrap">
                          {formatDate(ban.ban_date, 'MMM d, yyyy')}
                        </span>
                      </TableCell>
                      {canManage && (
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {/* TODO: Edit modal */}}
                            >
                              <Pencil size={14} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteBan(ban.id, ban.name)}
                              className="text-error hover:text-error hover:bg-error/10"
                            >
                              <Trash2 size={14} />
                            </Button>
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
        {!loading && bans.length > 0 && (
          <div className="mt-4 text-sm text-foreground-muted text-center">
            Showing {bans.length} ban{bans.length !== 1 ? 's' : ''}
          </div>
        )}
      </PageContainer>
    </RequireAuth>
  );
}
