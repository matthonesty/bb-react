'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Plus } from 'lucide-react';
import { DoctrineCard } from './DoctrineCard';
import { DoctrineModal } from './DoctrineModal';
import type { Doctrine } from '@/types';

interface DoctrinesListProps {
  fleetTypeId: number;
  canManage: boolean;
  onReload: () => void;
}

export function DoctrinesList({ fleetTypeId, canManage, onReload }: DoctrinesListProps) {
  const [doctrines, setDoctrines] = useState<Doctrine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    loadDoctrines();
  }, [fleetTypeId]);

  async function loadDoctrines() {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        fleet_type_id: fleetTypeId.toString(),
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
  }

  function openAddDoctrineModal() {
    setIsModalOpen(true);
  }

  function closeDoctrineModal() {
    setIsModalOpen(false);
  }

  function handleDoctrineModalSuccess() {
    loadDoctrines();
    onReload(); // Reload parent to update counts
  }

  async function deleteDoctrine(id: number, name: string) {
    if (!confirm(`Delete doctrine "${name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/doctrines?id=${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to delete doctrine');
      }

      loadDoctrines();
      onReload(); // Reload parent to update counts
    } catch (err: any) {
      setError(err.message);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-primary border-r-transparent"></div>
          <p className="mt-2 text-sm text-foreground-muted">Loading doctrines...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-danger/10 border border-danger text-danger rounded-lg">
        {error}
      </div>
    );
  }

  if (doctrines.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-foreground-muted mb-4">No doctrines yet</p>
        {canManage && (
          <Button onClick={openAddDoctrineModal}>
            <Plus size={16} className="mr-2" />
            Add Doctrine
          </Button>
        )}
        <DoctrineModal
          isOpen={isModalOpen}
          onClose={closeDoctrineModal}
          onSuccess={handleDoctrineModalSuccess}
          fleetTypeId={fleetTypeId}
        />
      </div>
    );
  }

  return (
    <>
      {canManage && (
        <div className="mb-4">
          <Button onClick={openAddDoctrineModal}>
            <Plus size={16} className="mr-2" />
            Add Doctrine
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {doctrines.map((doctrine) => (
          <DoctrineCard
            key={doctrine.id}
            doctrine={doctrine}
            canManage={canManage}
            onDelete={() => deleteDoctrine(doctrine.id, doctrine.name)}
          />
        ))}
      </div>

      <DoctrineModal
        isOpen={isModalOpen}
        onClose={closeDoctrineModal}
        onSuccess={handleDoctrineModalSuccess}
        fleetTypeId={fleetTypeId}
      />
    </>
  );
}
