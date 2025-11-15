'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Plus, X } from 'lucide-react';
import { FleetTypeCard } from '@/components/doctrines/FleetTypeCard';
import { FleetTypeModal } from '@/components/doctrines/FleetTypeModal';
import type { FleetType } from '@/types';

export default function DoctrinesPage() {
  useEffect(() => {
    document.title = 'Doctrines - Bombers Bar';
  }, []);

  const { user, hasRole } = useAuth();
  const [fleetTypes, setFleetTypes] = useState<FleetType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);

  // Modal state
  const [isFleetTypeModalOpen, setIsFleetTypeModalOpen] = useState(false);
  const [selectedFleetType, setSelectedFleetType] = useState<FleetType | null>(null);

  const canManage = hasRole(['admin', 'Council']);

  useEffect(() => {
    loadFleetTypes();
  }, [includeInactive]);

  async function loadFleetTypes() {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (includeInactive) {
        params.append('include_inactive', 'true');
      }

      const response = await fetch(`/api/admin/fleet-types?${params}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to load fleet types');
      }

      setFleetTypes(data.fleet_types);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function openAddFleetTypeModal() {
    setSelectedFleetType(null);
    setIsFleetTypeModalOpen(true);
  }

  function openEditFleetTypeModal(fleetType: FleetType) {
    setSelectedFleetType(fleetType);
    setIsFleetTypeModalOpen(true);
  }

  function closeFleetTypeModal() {
    setIsFleetTypeModalOpen(false);
    setSelectedFleetType(null);
  }

  function handleFleetTypeModalSuccess() {
    loadFleetTypes();
  }

  async function deleteFleetType(id: number, name: string, doctrineCount: number) {
    const message =
      doctrineCount > 0
        ? `Delete "${name}" and its ${doctrineCount} doctrine(s)?`
        : `Delete "${name}"?`;

    if (!confirm(message)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/fleet-types?id=${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to delete fleet type');
      }

      loadFleetTypes();
    } catch (err: any) {
      setError(err.message);
    }
  }

  // Filter fleet types by search query
  const filteredFleetTypes = fleetTypes.filter((ft) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return ft.name.toLowerCase().includes(query) || ft.description?.toLowerCase().includes(query);
  });

  return (
    <RequireAuth requireFCRole>
      <PageContainer>
        <PageHeader
          title="Doctrines"
          description="Manage fleet types and ship fittings (doctrines)"
          actions={
            canManage && (
              <Button onClick={openAddFleetTypeModal}>
                <Plus size={16} className="mr-2" />
                Add Fleet Type
              </Button>
            )
          }
        />

        {/* Filters */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Input
              type="text"
              placeholder="Search fleet types or doctrines..."
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
            value={includeInactive ? 'true' : 'false'}
            onChange={(e) => setIncludeInactive(e.target.value === 'true')}
            className="px-4 py-2 bg-input-bg border border-input-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="false">Active Only</option>
            <option value="true">Include Inactive</option>
          </select>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-danger/10 border border-danger text-danger px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Fleet Types List */}
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
              <p className="mt-4 text-foreground-muted">Loading fleet types...</p>
            </div>
          </div>
        ) : filteredFleetTypes.length === 0 ? (
          <div className="flex items-center justify-center p-12">
            <div className="text-center">
              <p className="text-foreground-muted mb-4">
                {searchQuery ? 'No fleet types match your search' : 'No fleet types found'}
              </p>
              {canManage && !searchQuery && (
                <Button onClick={openAddFleetTypeModal}>
                  <Plus size={16} className="mr-2" />
                  Add Fleet Type
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredFleetTypes.map((fleetType) => (
              <FleetTypeCard
                key={fleetType.id}
                fleetType={fleetType}
                canManage={canManage}
                onEdit={() => openEditFleetTypeModal(fleetType)}
                onDelete={() =>
                  deleteFleetType(fleetType.id, fleetType.name, fleetType.doctrine_count || 0)
                }
                onReload={loadFleetTypes}
              />
            ))}
          </div>
        )}

        {/* Fleet Type Modal */}
        <FleetTypeModal
          isOpen={isFleetTypeModalOpen}
          onClose={closeFleetTypeModal}
          onSuccess={handleFleetTypeModalSuccess}
          fleetType={selectedFleetType}
        />
      </PageContainer>
    </RequireAuth>
  );
}
