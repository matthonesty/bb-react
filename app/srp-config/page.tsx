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
import { X, Plus, Pencil } from 'lucide-react';
import { ShipTypeModal } from '@/components/srp-config/ShipTypeModal';
import type { ShipType } from '@/types';

// Format ISK amounts
function formatISK(amount: number): string {
  return new Intl.NumberFormat('en-US').format(amount) + ' ISK';
}

export default function SRPConfigPage() {
  useEffect(() => {
    document.title = 'SRP Config - Bombers Bar';
  }, []);

  const { user, hasRole } = useAuth();
  const [shipTypes, setShipTypes] = useState<ShipType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [activeFilter, setActiveFilter] = useState('true');
  const [groupFilter, setGroupFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedShipType, setSelectedShipType] = useState<ShipType | null>(null);

  const canManage = hasRole(['admin', 'Council']);

  // Get unique groups for filter
  const uniqueGroups = Array.from(new Set(shipTypes.map((st) => st.group_name))).sort();

  useEffect(() => {
    loadShipTypes();
  }, [activeFilter, searchQuery]);

  async function loadShipTypes() {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        limit: '500',
      });

      if (activeFilter) params.append('is_active', activeFilter);
      if (searchQuery) params.append('search', searchQuery);

      const response = await fetch(`/api/admin/srp-config?${params}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to load ship types');
      }

      setShipTypes(data.ship_types);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function openAddModal() {
    setSelectedShipType(null);
    setIsModalOpen(true);
  }

  function openEditModal(shipType: ShipType) {
    setSelectedShipType(shipType);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setSelectedShipType(null);
  }

  function handleModalSuccess() {
    loadShipTypes();
  }

  // Client-side filter by group
  const filteredShipTypes = groupFilter
    ? shipTypes.filter((st) => st.group_name === groupFilter)
    : shipTypes;

  return (
    <RequireAuth requireFCRole>
      <PageContainer>
        <PageHeader
          title="SRP Config"
          description="Configure SRP payouts for ship types"
          actions={
            canManage && (
              <Button onClick={openAddModal}>
                <Plus size={16} className="mr-2" />
                Add Ship Type
              </Button>
            )
          }
        />

        {/* Filters */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Input
              type="text"
              placeholder="Search by ship or group name..."
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
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
            className="px-4 py-2 bg-input-bg border border-input-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="true">Active Only</option>
            <option value="false">Inactive Only</option>
            <option value="">All Ships</option>
          </select>

          <select
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
            className="px-4 py-2 bg-input-bg border border-input-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Groups</option>
            {uniqueGroups.map((group) => (
              <option key={group} value={group}>
                {group}
              </option>
            ))}
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
                <p className="mt-4 text-foreground-muted">Loading ship types...</p>
              </div>
            </div>
          ) : filteredShipTypes.length === 0 ? (
            <div className="flex items-center justify-center p-12">
              <p className="text-foreground-muted">No ship types found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Ship Name</TableHead>
                    <TableHead>Group</TableHead>
                    <TableHead>Base Payout</TableHead>
                    <TableHead>Polarized Payout</TableHead>
                    <TableHead>FC Discretion</TableHead>
                    <TableHead>Notes</TableHead>
                    {canManage && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredShipTypes.map((shipType) => (
                    <TableRow key={shipType.id}>
                      <TableCell>
                        <Badge variant={shipType.is_active ? 'success' : 'default'}>
                          {shipType.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium text-foreground">
                          {shipType.type_name}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="info">{shipType.group_name}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-mono text-success">
                          {formatISK(shipType.base_payout)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {shipType.polarized_payout ? (
                          <span className="text-sm font-mono text-success">
                            {formatISK(shipType.polarized_payout)}
                          </span>
                        ) : (
                          <span className="text-sm text-foreground-muted">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {shipType.fc_discretion ? (
                          <Badge variant="warning">Required</Badge>
                        ) : (
                          <span className="text-sm text-foreground-muted">-</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-xs">
                        {shipType.notes ? (
                          <span className="text-sm text-foreground truncate block">
                            {shipType.notes}
                          </span>
                        ) : (
                          <span className="text-sm text-foreground-muted">-</span>
                        )}
                      </TableCell>
                      {canManage && (
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => openEditModal(shipType)}>
                            <Pencil size={14} />
                          </Button>
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
        {!loading && filteredShipTypes.length > 0 && (
          <div className="mt-4 text-sm text-foreground-muted text-center">
            Showing {filteredShipTypes.length} ship type{filteredShipTypes.length !== 1 ? 's' : ''}
          </div>
        )}

        {/* Ship Type Modal */}
        <ShipTypeModal
          isOpen={isModalOpen}
          onClose={closeModal}
          onSuccess={handleModalSuccess}
          shipType={selectedShipType}
        />
      </PageContainer>
    </RequireAuth>
  );
}
