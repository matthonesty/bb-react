'use client';

import { useState, useEffect } from 'react';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { FleetType } from '@/types';

interface FleetTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  fleetType?: FleetType | null;
}

export function FleetTypeModal({ isOpen, onClose, onSuccess, fleetType }: FleetTypeModalProps) {
  const isEditMode = !!fleetType;

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    display_order: 0,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens/closes or fleet type changes
  useEffect(() => {
    if (isOpen && fleetType) {
      setFormData({
        name: fleetType.name,
        description: fleetType.description || '',
        display_order: fleetType.display_order || 0,
      });
    } else if (isOpen && !fleetType) {
      setFormData({
        name: '',
        description: '',
        display_order: 0,
      });
    }
    setError(null);
  }, [isOpen, fleetType]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let url = '/api/admin/fleet-types';
      if (isEditMode) {
        url += `?id=${fleetType!.id}`;
      }

      const response = await fetch(url, {
        method: isEditMode ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to save fleet type');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? 'Edit Fleet Type' : 'Add Fleet Type'}
      size="lg"
    >
      <form onSubmit={handleSubmit}>
        {error && (
          <div className="mb-4 p-3 bg-danger/10 border border-danger text-danger rounded-md text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Fleet Type Name <span className="text-error">*</span>
            </label>
            <Input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Standard BLOPS"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of this fleet type..."
              rows={3}
              className="w-full px-3 py-2 bg-input-bg border border-input-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Display Order</label>
            <Input
              type="number"
              value={formData.display_order}
              onChange={(e) =>
                setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })
              }
              min={0}
            />
            <p className="mt-1 text-xs text-foreground-muted">Lower numbers appear first</p>
          </div>
        </div>

        <ModalFooter>
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving...' : isEditMode ? 'Update' : 'Create'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
