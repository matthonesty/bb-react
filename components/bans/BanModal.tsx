'use client';

import { useState, useEffect } from 'react';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { Ban } from '@/types';

interface BanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  ban?: Ban | null;
}

export function BanModal({ isOpen, onClose, onSuccess, ban }: BanModalProps) {
  const isEditMode = !!ban;

  const [formData, setFormData] = useState({
    name: '',
    type: 'Character' as 'Character' | 'Corp' | 'Alliance',
    bb_banned: false,
    xup_banned: false,
    hk_banned: false,
    banned_by: '',
    reason: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens/closes or ban changes
  useEffect(() => {
    if (isOpen && ban) {
      setFormData({
        name: ban.name,
        type: ban.type,
        bb_banned: ban.bb_banned,
        xup_banned: ban.xup_banned,
        hk_banned: ban.hk_banned,
        banned_by: ban.banned_by || '',
        reason: ban.reason || '',
      });
    } else if (isOpen && !ban) {
      setFormData({
        name: '',
        type: 'Character',
        bb_banned: false,
        xup_banned: false,
        hk_banned: false,
        banned_by: '',
        reason: '',
      });
    }
    setError(null);
  }, [isOpen, ban]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload = {
        ...formData,
        ...(isEditMode && { id: ban!.id }),
      };

      const response = await fetch('/api/admin/bans', {
        method: isEditMode ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to save ban');
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
      title={isEditMode ? 'Edit Ban' : 'Add Ban'}
      size="lg"
    >
      <form onSubmit={handleSubmit}>
        {error && (
          <div className="mb-4 bg-danger/10 border border-danger text-danger px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {/* Name */}
          <Input
            label="Name"
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Character/Corp/Alliance name"
            required
          />

          {/* Type */}
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">
              Type <span className="text-error">*</span>
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
              className="flex h-10 w-full rounded-md border border-input-border bg-input-bg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              required
            >
              <option value="Character">Character</option>
              <option value="Corp">Corporation</option>
              <option value="Alliance">Alliance</option>
            </select>
          </div>

          {/* Ban Scope Checkboxes */}
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">
              Ban Scope
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.bb_banned}
                  onChange={(e) => setFormData({ ...formData, bb_banned: e.target.checked })}
                  className="h-4 w-4 rounded border-input-border bg-input-bg text-primary focus:ring-2 focus:ring-primary focus:ring-offset-0"
                />
                <span className="text-sm text-foreground">BB (Global)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.xup_banned}
                  onChange={(e) => setFormData({ ...formData, xup_banned: e.target.checked })}
                  className="h-4 w-4 rounded border-input-border bg-input-bg text-primary focus:ring-2 focus:ring-primary focus:ring-offset-0"
                />
                <span className="text-sm text-foreground">X-up Channel</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.hk_banned}
                  onChange={(e) => setFormData({ ...formData, hk_banned: e.target.checked })}
                  className="h-4 w-4 rounded border-input-border bg-input-bg text-primary focus:ring-2 focus:ring-primary focus:ring-offset-0"
                />
                <span className="text-sm text-foreground">HK Channel</span>
              </label>
            </div>
          </div>

          {/* Banned By */}
          <Input
            label="Banned By"
            type="text"
            value={formData.banned_by}
            onChange={(e) => setFormData({ ...formData, banned_by: e.target.value })}
            placeholder="FC name (optional)"
          />

          {/* Reason */}
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">
              Reason
            </label>
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="Reason for ban..."
              rows={4}
              className="flex w-full rounded-md border border-input-border bg-input-bg px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
            />
          </div>
        </div>

        <ModalFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            isLoading={loading}
            disabled={loading}
          >
            {isEditMode ? 'Save Changes' : 'Add Ban'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
