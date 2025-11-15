'use client';

import { useState } from 'react';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface AddParticipantModalProps {
  fleetId: number;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddParticipantModal({ fleetId, onClose, onSuccess }: AddParticipantModalProps) {
  const [formData, setFormData] = useState({
    character_id: '',
    character_name: '',
    role: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload = {
        fleet_id: fleetId,
        character_id: parseInt(formData.character_id),
        character_name: formData.character_name.trim(),
        role: formData.role.trim() || null,
      };

      const response = await fetch('/api/admin/fleet-participants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to add participant');
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="Add Participant">
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          {error && (
            <div className="p-3 bg-error/10 border border-error rounded-lg">
              <p className="text-error text-sm">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-foreground-muted mb-2">
              Character ID *
            </label>
            <Input
              type="number"
              value={formData.character_id}
              onChange={(e) => setFormData({ ...formData, character_id: e.target.value })}
              placeholder="12345678"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground-muted mb-2">
              Character Name *
            </label>
            <Input
              type="text"
              value={formData.character_name}
              onChange={(e) => setFormData({ ...formData, character_name: e.target.value })}
              placeholder="Character Name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground-muted mb-2">
              Role (optional)
            </label>
            <Input
              type="text"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              placeholder="e.g., Hunter, Scout"
            />
          </div>
        </div>

        <ModalFooter>
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={loading}>
            Add Participant
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
