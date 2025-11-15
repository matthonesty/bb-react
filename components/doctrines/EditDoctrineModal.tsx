'use client';

import { useState, useEffect } from 'react';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import type { Doctrine } from '@/types';

interface EditDoctrineModalProps {
  doctrine: Doctrine;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const DOCTRINE_NAME_OPTIONS = ['Tech 1', 'Tech 2', 'Polarized', 'Other'] as const;

export function EditDoctrineModal({ doctrine, isOpen, onClose, onSuccess }: EditDoctrineModalProps) {
  // Extract current variant from doctrine name (e.g., "Hound (Polarized)" -> "Polarized")
  const extractVariant = (doctrineName: string) => {
    const match = doctrineName.match(/\(([^)]+)\)/);
    if (match) {
      const variant = match[1];
      // Check if it's a preset option
      if (['Tech 1', 'Tech 2', 'Polarized'].includes(variant)) {
        return variant;
      }
      // Otherwise it's a custom name
      return 'Other';
    }
    return '';
  };

  const extractCustomName = (doctrineName: string) => {
    const match = doctrineName.match(/\(([^)]+)\)/);
    if (match) {
      const variant = match[1];
      // If it's not a preset, return the custom name
      if (!['Tech 1', 'Tech 2', 'Polarized'].includes(variant)) {
        return variant;
      }
    }
    return '';
  };

  const [name, setName] = useState(extractVariant(doctrine.name));
  const [customName, setCustomName] = useState(extractCustomName(doctrine.name));
  const [notes, setNotes] = useState(doctrine.notes || '');
  const [isActive, setIsActive] = useState(doctrine.is_active);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when doctrine changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setName(extractVariant(doctrine.name));
      setCustomName(extractCustomName(doctrine.name));
      setNotes(doctrine.notes || '');
      setIsActive(doctrine.is_active);
      setError(null);
    }
  }, [isOpen, doctrine]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!name) {
      setError('Doctrine type is required');
      return;
    }

    // Use custom name if "Other" is selected, otherwise use preset
    const finalName = name === 'Other' ? customName.trim() : name;

    if (!finalName) {
      setError('Please enter a doctrine name');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/doctrines?id=${doctrine.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: finalName,
          notes: notes.trim() || null,
          is_active: isActive,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to update doctrine');
      }

      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update doctrine');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Doctrine">
      <form onSubmit={handleSubmit}>
        {error && (
          <div className="mb-4 p-3 bg-danger/10 border border-danger text-danger rounded-md text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {/* Ship Info (read-only) */}
          <div>
            <label className="block text-sm font-medium text-foreground-muted mb-1">
              Ship
            </label>
            <p className="text-foreground">{doctrine.ship_name}</p>
          </div>

          {/* Doctrine Type */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Doctrine Type <span className="text-error">*</span>
            </label>
            <select
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 bg-input-bg border border-input-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Select type...</option>
              {DOCTRINE_NAME_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          {/* Custom Name Input - Show when "Other" is selected */}
          {name === 'Other' && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Custom Type Name <span className="text-error">*</span>
              </label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="e.g., Faction, Officer Fit, Budget..."
                required
                className="w-full px-3 py-2 bg-input-bg border border-input-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Usage instructions, special considerations, etc..."
              rows={4}
              className="w-full px-3 py-2 bg-input-bg border border-input-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Active Status */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-input-border bg-input-bg text-primary focus:ring-2 focus:ring-primary"
            />
            <label htmlFor="isActive" className="text-sm text-foreground">
              Active (visible to users)
            </label>
          </div>
        </div>

        <ModalFooter>
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
