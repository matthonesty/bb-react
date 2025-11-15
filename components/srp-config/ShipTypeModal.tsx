'use client';

import { useState, useEffect } from 'react';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { ShipType } from '@/types';

interface ShipTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  shipType?: ShipType | null;
}

export function ShipTypeModal({ isOpen, onClose, onSuccess, shipType }: ShipTypeModalProps) {
  const isEditMode = !!shipType;

  const [formData, setFormData] = useState({
    type_name: '',
    type_id: 0,
    group_name: '',
    group_id: 0,
    base_payout: 0,
    polarized_payout: null as number | null,
    fc_discretion: false,
    is_active: true,
    notes: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ESI lookup states
  const [shipLookup, setShipLookup] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);

  // Reset form when modal opens/closes or shipType changes
  useEffect(() => {
    if (isOpen && shipType) {
      setFormData({
        type_name: shipType.type_name,
        type_id: shipType.type_id,
        group_name: shipType.group_name,
        group_id: shipType.group_id,
        base_payout: shipType.base_payout,
        polarized_payout: shipType.polarized_payout,
        fc_discretion: shipType.fc_discretion,
        is_active: shipType.is_active,
        notes: shipType.notes || '',
      });
      setShipLookup(shipType.type_name);
    } else if (isOpen && !shipType) {
      setFormData({
        type_name: '',
        type_id: 0,
        group_name: '',
        group_id: 0,
        base_payout: 0,
        polarized_payout: null,
        fc_discretion: false,
        is_active: true,
        notes: '',
      });
      setShipLookup('');
    }
    setError(null);
  }, [isOpen, shipType]);

  // ESI Ship Type Lookup
  async function lookupShipType() {
    if (!shipLookup.trim()) return;

    setLookupLoading(true);
    setError(null);

    try {
      // Import the client helper
      const { resolveIds, getTypeInfo } = await import('@/lib/client/esi');

      // Resolve ship name to ID
      const resolved = await resolveIds([shipLookup.trim()]);

      if (!resolved.inventory_types || resolved.inventory_types.length === 0) {
        throw new Error(`Ship type "${shipLookup}" not found`);
      }

      const typeId = resolved.inventory_types[0].id;

      // Get type and group details
      const typeInfo = await getTypeInfo(typeId);

      setFormData({
        ...formData,
        type_id: typeInfo.type_id,
        type_name: typeInfo.type_name,
        group_id: typeInfo.group_id,
        group_name: typeInfo.group_name,
      });
      setShipLookup(typeInfo.type_name);
    } catch (err: any) {
      setError(err.message || 'Failed to lookup ship type');
    } finally {
      setLookupLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validation
    if (!formData.type_id || !formData.type_name || !formData.group_id || !formData.group_name) {
      setError('Please lookup a valid ship type using ESI');
      setLoading(false);
      return;
    }

    if (formData.base_payout <= 0) {
      setError('Base payout must be greater than 0');
      setLoading(false);
      return;
    }

    try {
      const payload = {
        type_id: formData.type_id,
        type_name: formData.type_name,
        group_id: formData.group_id,
        group_name: formData.group_name,
        base_payout: formData.base_payout,
        polarized_payout: formData.polarized_payout,
        fc_discretion: formData.fc_discretion,
        is_active: formData.is_active,
        notes: formData.notes || null,
        ...(isEditMode && { id: shipType!.id }),
      };

      const response = await fetch('/api/admin/srp-config', {
        method: isEditMode ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to save ship type');
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
      title={isEditMode ? 'Edit Ship Type' : 'Add Ship Type'}
      size="lg"
    >
      <form onSubmit={handleSubmit}>
        {error && (
          <div className="mb-4 bg-danger/10 border border-danger text-danger px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {/* Ship Type Lookup */}
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">
              Ship Type <span className="text-error">*</span>
            </label>
            <div className="flex gap-2">
              <Input
                type="text"
                value={shipLookup}
                onChange={(e) => setShipLookup(e.target.value)}
                placeholder="Ship type name"
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    lookupShipType();
                  }
                }}
              />
              <Button
                type="button"
                onClick={lookupShipType}
                isLoading={lookupLoading}
                disabled={lookupLoading || !shipLookup.trim()}
              >
                Lookup
              </Button>
            </div>
            {formData.type_name && formData.type_id > 0 && (
              <p className="mt-2 text-sm text-success">
                ✓ {formData.type_name} (ID: {formData.type_id}, Group: {formData.group_name})
              </p>
            )}
          </div>

          {/* Base Payout */}
          <Input
            label="Base Payout (ISK)"
            type="number"
            value={formData.base_payout || ''}
            onChange={(e) =>
              setFormData({ ...formData, base_payout: parseInt(e.target.value) || 0 })
            }
            placeholder="e.g. 100000000"
            required
          />

          {/* Polarized Payout */}
          <Input
            label="Polarized Payout (ISK, Optional)"
            type="number"
            value={formData.polarized_payout || ''}
            onChange={(e) =>
              setFormData({
                ...formData,
                polarized_payout: e.target.value ? parseInt(e.target.value) : null,
              })
            }
            placeholder="e.g. 150000000"
          />

          {/* FC Discretion & Active Status Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.fc_discretion}
                  onChange={(e) => setFormData({ ...formData, fc_discretion: e.target.checked })}
                  className="h-4 w-4 rounded border-input-border bg-input-bg text-primary focus:ring-2 focus:ring-primary focus:ring-offset-0"
                />
                <span className="text-sm font-medium text-foreground">Requires FC Discretion</span>
              </label>
            </div>

            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="h-4 w-4 rounded border-input-border bg-input-bg text-primary focus:ring-2 focus:ring-primary focus:ring-offset-0"
                />
                <span className="text-sm font-medium text-foreground">Active</span>
              </label>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any notes about this ship type..."
              rows={3}
              className="flex w-full rounded-md border border-input-border bg-input-bg px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
            />
          </div>
        </div>

        <ModalFooter>
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" isLoading={loading} disabled={loading}>
            {isEditMode ? 'Save Changes' : 'Add Ship Type'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
