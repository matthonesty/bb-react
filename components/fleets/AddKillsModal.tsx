'use client';

import { useState } from 'react';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { FleetParticipant } from '@/types';

interface AddKillsModalProps {
  fleetId: number;
  participants: FleetParticipant[];
  onClose: () => void;
  onSuccess: () => void;
}

export function AddKillsModal({ fleetId, participants, onClose, onSuccess }: AddKillsModalProps) {
  const [formData, setFormData] = useState({
    drop_number: 1,
    hunter_id: '',
    zkill_urls: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Parse zkill URLs (one per line)
      const urls = formData.zkill_urls
        .split('\n')
        .map((url) => url.trim())
        .filter((url) => url.length > 0);

      if (urls.length === 0) {
        throw new Error('Please enter at least one zkillboard URL');
      }

      const payload = {
        fleet_id: fleetId,
        hunter_id: formData.hunter_id ? parseInt(formData.hunter_id) : null,
        drop_number: formData.drop_number,
        zkill_urls: urls,
      };

      const response = await fetch('/api/admin/fleet-kills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to add kills');
      }

      // Show success/error summary
      if (data.error_count > 0) {
        const errorMessages = data.errors.map((e: { url: string; error: string }) =>
          `${e.url}: ${e.error}`
        ).join('\n');
        setError(`Added ${data.inserted_count} kills, ${data.error_count} errors:\n${errorMessages}`);
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 3000);
      } else {
        onSuccess();
        onClose();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="Add Kills">
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          {error && (
            <div className="p-3 bg-error/10 border border-error rounded-lg">
              <p className="text-error text-sm whitespace-pre-wrap">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-foreground-muted mb-2">
              Drop Number *
            </label>
            <Input
              type="number"
              value={formData.drop_number}
              onChange={(e) => setFormData({ ...formData, drop_number: parseInt(e.target.value) || 1 })}
              min="1"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground-muted mb-2">
              Hunter (optional)
            </label>
            <select
              value={formData.hunter_id}
              onChange={(e) => setFormData({ ...formData, hunter_id: e.target.value })}
              className="w-full px-3 py-2 bg-input-bg border border-input-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">No hunter assigned</option>
              {participants.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.character_name} {p.role && `(${p.role})`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground-muted mb-2">
              zkillboard URLs *
            </label>
            <textarea
              value={formData.zkill_urls}
              onChange={(e) => setFormData({ ...formData, zkill_urls: e.target.value })}
              placeholder="https://zkillboard.com/kill/129129383/&#10;https://zkillboard.com/kill/128946440/"
              rows={6}
              className="w-full px-3 py-2 bg-input-bg border border-input-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none font-mono text-sm"
              required
            />
            <p className="text-xs text-foreground-muted mt-1">
              Enter one or multiple zkillboard URLs. Each URL must be on a new line.
            </p>
          </div>
        </div>

        <ModalFooter>
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={loading}>
            Add Kills
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
