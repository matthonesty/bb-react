'use client';

import { useState, useEffect } from 'react';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { FleetCommander } from '@/types';
import { X } from 'lucide-react';

interface FCModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  fc?: FleetCommander | null;
}

interface CharacterLookup {
  id: number;
  name: string;
}

export function FCModal({ isOpen, onClose, onSuccess, fc }: FCModalProps) {
  const isEditMode = !!fc;

  const [formData, setFormData] = useState({
    status: 'Active' as 'Active' | 'Inactive' | 'Banned',
    rank: 'FC' as 'SFC' | 'JFC' | 'FC' | 'Support',
    main_character_name: '',
    main_character_id: 0,
    bb_corp_alt_name: '',
    bb_corp_alt_id: 0,
    additional_alts: [] as Array<{ character_id: number; character_name: string }>,
    notes: '',
    access_level: '' as '' | 'FC' | 'OBomberCare' | 'Accountant' | 'Council' | 'Election Officer',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Character lookup states
  const [mainCharLookup, setMainCharLookup] = useState('');
  const [bbCorpAltLookup, setBBCorpAltLookup] = useState('');
  const [additionalAltLookup, setAdditionalAltLookup] = useState('');
  const [lookupLoading, setLookupLoading] = useState({
    main: false,
    bbCorp: false,
    additional: false,
  });

  // Reset form when modal opens/closes or fc changes
  useEffect(() => {
    if (isOpen && fc) {
      setFormData({
        status: fc.status as any,
        rank: fc.rank,
        main_character_name: fc.main_character_name,
        main_character_id: fc.main_character_id,
        bb_corp_alt_name: fc.bb_corp_alt_name || '',
        bb_corp_alt_id: fc.bb_corp_alt_id || 0,
        additional_alts: fc.additional_alts || [],
        notes: fc.notes || '',
        access_level: (fc.access_level || '') as any,
      });
      setMainCharLookup(fc.main_character_name);
      setBBCorpAltLookup(fc.bb_corp_alt_name || '');
    } else if (isOpen && !fc) {
      setFormData({
        status: 'Active',
        rank: 'FC',
        main_character_name: '',
        main_character_id: 0,
        bb_corp_alt_name: '',
        bb_corp_alt_id: 0,
        additional_alts: [],
        notes: '',
        access_level: '',
      });
      setMainCharLookup('');
      setBBCorpAltLookup('');
    }
    setAdditionalAltLookup('');
    setError(null);
  }, [isOpen, fc]);

  // ESI Character Lookup
  async function lookupCharacter(name: string): Promise<CharacterLookup | null> {
    if (!name.trim()) return null;

    try {
      const { resolveIds } = await import('@/lib/client/esi');

      const data = await resolveIds([name.trim()]);

      // resolveIds returns { characters: [{id, name}], corporations: [{id, name}], ... }
      if (!data.characters || data.characters.length === 0) {
        throw new Error(`Character "${name}" not found`);
      }

      const character = data.characters[0];

      return {
        id: character.id,
        name: character.name,
      };
    } catch (err: any) {
      throw new Error(err.message || 'Failed to lookup character');
    }
  }

  async function handleMainCharacterLookup() {
    setLookupLoading({ ...lookupLoading, main: true });
    setError(null);

    try {
      const char = await lookupCharacter(mainCharLookup);
      if (char) {
        setFormData({
          ...formData,
          main_character_name: char.name,
          main_character_id: char.id,
        });
        setMainCharLookup(char.name);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLookupLoading({ ...lookupLoading, main: false });
    }
  }

  async function handleBBCorpAltLookup() {
    if (!bbCorpAltLookup.trim()) {
      // Clear the BB corp alt
      setFormData({
        ...formData,
        bb_corp_alt_name: '',
        bb_corp_alt_id: 0,
      });
      setBBCorpAltLookup('');
      return;
    }

    setLookupLoading({ ...lookupLoading, bbCorp: true });
    setError(null);

    try {
      const char = await lookupCharacter(bbCorpAltLookup);
      if (char) {
        setFormData({
          ...formData,
          bb_corp_alt_name: char.name,
          bb_corp_alt_id: char.id,
        });
        setBBCorpAltLookup(char.name);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLookupLoading({ ...lookupLoading, bbCorp: false });
    }
  }

  async function handleAddAdditionalAlt() {
    if (!additionalAltLookup.trim()) return;

    setLookupLoading({ ...lookupLoading, additional: true });
    setError(null);

    try {
      const char = await lookupCharacter(additionalAltLookup);
      if (char) {
        // Check if already in list
        if (formData.additional_alts.some((alt) => alt.character_id === char.id)) {
          setError('This character is already in the additional alts list');
          return;
        }

        setFormData({
          ...formData,
          additional_alts: [
            ...formData.additional_alts,
            { character_id: char.id, character_name: char.name },
          ],
        });
        setAdditionalAltLookup('');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLookupLoading({ ...lookupLoading, additional: false });
    }
  }

  function removeAdditionalAlt(characterId: number) {
    setFormData({
      ...formData,
      additional_alts: formData.additional_alts.filter((alt) => alt.character_id !== characterId),
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validation
    if (!formData.main_character_id || !formData.main_character_name) {
      setError('Main character is required');
      setLoading(false);
      return;
    }

    try {
      const payload = {
        status: formData.status,
        rank: formData.rank,
        main_character_id: formData.main_character_id,
        main_character_name: formData.main_character_name,
        bb_corp_alt_id: formData.bb_corp_alt_id || null,
        bb_corp_alt_name: formData.bb_corp_alt_name || null,
        additional_alts: formData.additional_alts,
        notes: formData.notes || null,
        access_level: formData.access_level || null,
        ...(isEditMode && { id: fc!.id }),
      };

      const response = await fetch('/api/admin/fcs', {
        method: isEditMode ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to save FC');
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
      title={isEditMode ? 'Edit Fleet Commander' : 'Add Fleet Commander'}
      size="xl"
    >
      <form onSubmit={handleSubmit}>
        {error && (
          <div className="mb-4 bg-danger/10 border border-danger text-danger px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {/* Status & Rank Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                Status <span className="text-error">*</span>
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="flex h-10 w-full rounded-md border border-input-border bg-input-bg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Banned">Banned</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                Rank <span className="text-error">*</span>
              </label>
              <select
                value={formData.rank}
                onChange={(e) => setFormData({ ...formData, rank: e.target.value as any })}
                className="flex h-10 w-full rounded-md border border-input-border bg-input-bg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              >
                <option value="SFC">SFC</option>
                <option value="JFC">JFC</option>
                <option value="FC">FC</option>
                <option value="Support">Support</option>
              </select>
            </div>
          </div>

          {/* Main Character */}
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">
              Main Character <span className="text-error">*</span>
            </label>
            <div className="flex gap-2">
              <Input
                type="text"
                value={mainCharLookup}
                onChange={(e) => setMainCharLookup(e.target.value)}
                placeholder="Character name"
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleMainCharacterLookup();
                  }
                }}
              />
              <Button
                type="button"
                onClick={handleMainCharacterLookup}
                isLoading={lookupLoading.main}
                disabled={lookupLoading.main || !mainCharLookup.trim()}
              >
                Lookup
              </Button>
            </div>
            {formData.main_character_name && (
              <p className="mt-2 text-sm text-success">
                ✓ {formData.main_character_name} (ID: {formData.main_character_id})
              </p>
            )}
          </div>

          {/* BB Corp Alt */}
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">
              BB Corp Alt (Optional)
            </label>
            <div className="flex gap-2">
              <Input
                type="text"
                value={bbCorpAltLookup}
                onChange={(e) => setBBCorpAltLookup(e.target.value)}
                placeholder="Character name"
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleBBCorpAltLookup();
                  }
                }}
              />
              <Button
                type="button"
                onClick={handleBBCorpAltLookup}
                isLoading={lookupLoading.bbCorp}
                disabled={lookupLoading.bbCorp}
              >
                Lookup
              </Button>
            </div>
            {formData.bb_corp_alt_name && (
              <p className="mt-2 text-sm text-success">
                ✓ {formData.bb_corp_alt_name} (ID: {formData.bb_corp_alt_id})
              </p>
            )}
          </div>

          {/* Additional Alts */}
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">
              Additional Alts (Optional)
            </label>
            <div className="flex gap-2">
              <Input
                type="text"
                value={additionalAltLookup}
                onChange={(e) => setAdditionalAltLookup(e.target.value)}
                placeholder="Character name"
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddAdditionalAlt();
                  }
                }}
              />
              <Button
                type="button"
                onClick={handleAddAdditionalAlt}
                isLoading={lookupLoading.additional}
                disabled={lookupLoading.additional || !additionalAltLookup.trim()}
              >
                Add
              </Button>
            </div>
            {formData.additional_alts.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {formData.additional_alts.map((alt) => (
                  <span
                    key={alt.character_id}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-md text-sm font-medium bg-secondary/20 text-foreground border border-secondary/30"
                  >
                    {alt.character_name}
                    <button
                      type="button"
                      onClick={() => removeAdditionalAlt(alt.character_id)}
                      className="ml-1 hover:text-error transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Access Level */}
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">Access Level</label>
            <select
              value={formData.access_level}
              onChange={(e) => setFormData({ ...formData, access_level: e.target.value as any })}
              className="flex h-10 w-full rounded-md border border-input-border bg-input-bg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="">None</option>
              <option value="FC">FC</option>
              <option value="OBomberCare">OBomberCare</option>
              <option value="Accountant">Accountant</option>
              <option value="Council">Council</option>
              <option value="Election Officer">Election Officer</option>
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any notes about this FC..."
              rows={4}
              className="flex w-full rounded-md border border-input-border bg-input-bg px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
            />
          </div>
        </div>

        <ModalFooter>
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" isLoading={loading} disabled={loading}>
            {isEditMode ? 'Save Changes' : 'Add FC'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
