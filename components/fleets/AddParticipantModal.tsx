'use client';

import { useState } from 'react';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { CheckCircle, XCircle } from 'lucide-react';

interface AddParticipantModalProps {
  fleetId: number;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddParticipantModal({ fleetId, onClose, onSuccess }: AddParticipantModalProps) {
  const [formData, setFormData] = useState({
    character_name: '',
    role: 'Hunter',
  });

  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationStatus, setValidationStatus] = useState<'none' | 'valid' | 'invalid'>('none');
  const [validatedCharacterName, setValidatedCharacterName] = useState<string>('');

  const handleCheckESI = async () => {
    if (!formData.character_name.trim()) {
      setError('Please enter a character name');
      return;
    }

    setChecking(true);
    setError(null);
    setValidationStatus('none');

    try {
      const response = await fetch('/api/esi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: 'resolveIds',
          params: {
            names: [formData.character_name.trim()],
          },
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to validate character');
      }

      // Check if character was found
      if (data.data?.characters && data.data.characters.length > 0) {
        setValidationStatus('valid');
        setValidatedCharacterName(data.data.characters[0].name);
        setError(null);
      } else {
        setValidationStatus('invalid');
        setError(`Character "${formData.character_name}" not found in EVE Online`);
      }
    } catch (err: unknown) {
      setValidationStatus('invalid');
      setError(err instanceof Error ? err.message : 'Failed to validate character');
    } finally {
      setChecking(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Require validation before submission
    if (validationStatus !== 'valid') {
      setError('Please validate the character name using the "Check ESI" button first');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        fleet_id: fleetId,
        character_name: validatedCharacterName,
        role: formData.role,
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
    <Modal isOpen onClose={onClose} title="Add Hunters or Support">
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          {error && (
            <div className="p-3 bg-error/10 border border-error rounded-lg">
              <p className="text-error text-sm">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-foreground-muted mb-2">
              Character Name *
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type="text"
                  value={formData.character_name}
                  onChange={(e) => {
                    setFormData({ ...formData, character_name: e.target.value });
                    setValidationStatus('none');
                    setValidatedCharacterName('');
                  }}
                  placeholder="Character Name"
                  required
                  className={
                    validationStatus === 'valid'
                      ? 'pr-10 border-success'
                      : validationStatus === 'invalid'
                      ? 'pr-10 border-error'
                      : ''
                  }
                />
                {validationStatus === 'valid' && (
                  <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-success" />
                )}
                {validationStatus === 'invalid' && (
                  <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-error" />
                )}
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={handleCheckESI}
                isLoading={checking}
                disabled={!formData.character_name.trim() || checking}
              >
                Check ESI
              </Button>
            </div>
            {validationStatus === 'valid' && (
              <p className="mt-1 text-sm text-success">✓ Character verified: {validatedCharacterName}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground-muted mb-2">
              Role *
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              required
              className="w-full px-4 py-2 bg-input-bg border border-input-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="Hunter">Hunter</option>
              <option value="BLOPS">BLOPS</option>
              <option value="HIC Roller">HIC Roller</option>
              <option value="Roller">Roller</option>
            </select>
          </div>
        </div>

        <ModalFooter>
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={loading}
            disabled={validationStatus !== 'valid' || loading}
          >
            Add Hunters/Support
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
