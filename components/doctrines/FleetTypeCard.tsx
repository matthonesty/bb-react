'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { ChevronRight, Pencil, Trash2, Plus, Crosshair } from 'lucide-react';
import { DoctrineModal as DoctrineFormModal } from './DoctrineModal';
import { DoctrineModal as DoctrineViewModal } from '@/components/public/DoctrineModal';
import type { FleetType, Doctrine } from '@/types';

interface GroupedShip {
  ship_name: string;
  ship_group_name: string | null;
  variants: Doctrine[];
}

interface FleetTypeCardProps {
  fleetType: FleetType;
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onReload: () => void;
}

export function FleetTypeCard({
  fleetType,
  canManage,
  onEdit,
  onDelete,
  onReload,
}: FleetTypeCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [doctrines, setDoctrines] = useState<Doctrine[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  function toggleExpanded() {
    setIsExpanded(!isExpanded);
  }

  const loadDoctrines = useCallback(async () => {
    if (!isExpanded) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        fleet_type_id: fleetType.id.toString(),
      });

      const response = await fetch(`/api/admin/doctrines?${params}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to load doctrines');
      }

      setDoctrines(data.doctrines);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [fleetType.id, isExpanded]);

  useEffect(() => {
    loadDoctrines();
  }, [loadDoctrines]);

  const handleAddDoctrineSuccess = () => {
    loadDoctrines();
    onReload();
  };

  // Group doctrines by ship name
  const groupedShips: Record<string, GroupedShip> = {};
  doctrines.forEach((doctrine) => {
    if (!groupedShips[doctrine.ship_name]) {
      groupedShips[doctrine.ship_name] = {
        ship_name: doctrine.ship_name,
        ship_group_name: doctrine.ship_group_name,
        variants: [],
      };
    }
    groupedShips[doctrine.ship_name].variants.push(doctrine);
  });

  const ships = Object.values(groupedShips).sort((a, b) =>
    a.ship_name.localeCompare(b.ship_name)
  );

  return (
    <Card variant="bordered" padding="none" className="overflow-hidden">
      {/* Fleet Type Header */}
      <div
        onClick={toggleExpanded}
        className="p-6 cursor-pointer hover:bg-card-hover transition-colors border-b border-border"
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-xl font-semibold text-primary">{fleetType.name}</h3>
              {!fleetType.is_active && (
                <Badge variant="default" className="bg-foreground-muted/20 text-foreground-muted">
                  Inactive
                </Badge>
              )}
            </div>
            {fleetType.description && (
              <p className="text-foreground-muted text-sm">{fleetType.description}</p>
            )}
          </div>

          <div className="flex items-center gap-4">
            <Badge variant="info" className="font-medium">
              {fleetType.active_doctrine_count || 0} / {fleetType.doctrine_count || 0} Doctrines
            </Badge>

            {canManage && (
              <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="sm" onClick={onEdit}>
                  <Pencil size={14} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onDelete}
                  className="text-error hover:text-error hover:bg-error/10"
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            )}

            <ChevronRight
              size={24}
              className={`text-foreground-muted transition-transform ${
                isExpanded ? 'rotate-90' : ''
              }`}
            />
          </div>
        </div>
      </div>

      {/* Doctrines Display (shown when expanded) */}
      {isExpanded && (
        <div className="border-t border-border bg-background-dark p-6">
          {canManage && (
            <div className="mb-4">
              <Button onClick={() => setIsAddModalOpen(true)}>
                <Plus size={16} className="mr-2" />
                Add Doctrine
              </Button>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="text-center">
                <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-primary border-r-transparent"></div>
                <p className="mt-2 text-sm text-foreground-muted">Loading doctrines...</p>
              </div>
            </div>
          ) : error ? (
            <div className="p-4 bg-danger/10 border border-danger text-danger rounded-lg">{error}</div>
          ) : doctrines.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-foreground-muted">No doctrines yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {ships.map((ship) => (
                <ShipGroup key={ship.ship_name} ship={ship} canManage={canManage} onReload={handleAddDoctrineSuccess} />
              ))}
            </div>
          )}

          {/* Add Doctrine Modal */}
          <DoctrineFormModal
            isOpen={isAddModalOpen}
            onClose={() => setIsAddModalOpen(false)}
            onSuccess={handleAddDoctrineSuccess}
            fleetTypeId={fleetType.id}
          />
        </div>
      )}
    </Card>
  );
}

function ShipGroup({ ship, canManage, onReload }: { ship: GroupedShip; canManage: boolean; onReload: () => void }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <div className="mb-2 flex items-center gap-2">
        <Crosshair className="h-4 w-4 text-primary" />
        <h4 className="font-semibold text-foreground">{ship.ship_name}</h4>
        {ship.ship_group_name && (
          <span className="text-sm text-foreground-muted">• {ship.ship_group_name}</span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {ship.variants.map((doctrine) => (
          <VariantButton key={doctrine.id} doctrine={doctrine} canManage={canManage} onReload={onReload} />
        ))}
      </div>
    </div>
  );
}

function VariantButton({ doctrine, canManage, onReload }: { doctrine: Doctrine; canManage: boolean; onReload: () => void }) {
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Extract variant name from full doctrine name (e.g., "Hound (Polarized)" -> "Polarized")
  const variantName = doctrine.name.match(/\(([^)]+)\)/)?.[1] || doctrine.name;

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/admin/doctrines?id=${doctrine.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to delete doctrine');
      }

      setIsDeleteModalOpen(false);
      onReload();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditSuccess = () => {
    setIsEditModalOpen(false);
    onReload();
  };

  return (
    <>
      <div className="relative group">
        <button
          onClick={() => setIsViewModalOpen(true)}
          className="rounded-md border border-primary/30 bg-surface-secondary px-3 py-2 text-sm font-medium text-foreground transition-all hover:border-primary hover:bg-primary/10"
        >
          {variantName}
        </button>

        {canManage && (
          <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-10">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsEditModalOpen(true);
              }}
              className="bg-surface border border-border rounded-full p-1 hover:bg-surface-secondary"
              title="Edit"
            >
              <Pencil size={12} className="text-foreground-muted" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsDeleteModalOpen(true);
              }}
              className="bg-surface border border-border rounded-full p-1 hover:bg-surface-secondary"
              title="Delete"
            >
              <Trash2 size={12} className="text-error" />
            </button>
          </div>
        )}
      </div>

      {/* View Modal */}
      <DoctrineViewModal
        doctrine={doctrine}
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
      />

      {/* Edit Modal */}
      {canManage && (
        <DoctrineFormModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSuccess={handleEditSuccess}
          fleetTypeId={doctrine.fleet_type_id}
          doctrine={doctrine}
        />
      )}

      {/* Delete Confirmation Modal */}
      {canManage && (
        <ConfirmModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleDeleteConfirm}
          title="Delete Doctrine"
          message={`Are you sure you want to delete "${doctrine.name}"? This action cannot be undone.`}
          confirmText="Delete"
          confirmVariant="danger"
          isLoading={isDeleting}
        />
      )}
    </>
  );
}
