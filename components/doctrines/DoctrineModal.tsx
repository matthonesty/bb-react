'use client';

import { useState, useEffect } from 'react';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FittingWheel } from './FittingWheel';
import type { FittingImport, Doctrine } from '@/types';

interface DoctrineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  fleetTypeId: number;
  doctrine?: Doctrine | null;
}

const DOCTRINE_NAME_OPTIONS = ['Tech 1', 'Tech 2', 'Polarized', 'Other'] as const;

export function DoctrineModal({ isOpen, onClose, onSuccess, fleetTypeId, doctrine = null }: DoctrineModalProps) {
  const isEditMode = !!doctrine;
  const [fittingText, setFittingText] = useState('');
  const [importedFitting, setImportedFitting] = useState<FittingImport | null>(null);
  const [doctrineName, setDoctrineName] = useState('');
  const [customDoctrineName, setCustomDoctrineName] = useState('');
  const [doctrineNotes, setDoctrineNotes] = useState('');

  const [importing, setImporting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens/closes or load existing doctrine
  useEffect(() => {
    if (isOpen) {
      if (doctrine) {
        // Edit mode - pre-populate with existing doctrine data
        const parseModules = (modules: any): any[] => {
          if (typeof modules === 'string') {
            try {
              const parsed = JSON.parse(modules);
              return Array.isArray(parsed) ? parsed.filter((item) => item != null) : [];
            } catch {
              return [];
            }
          }
          if (Array.isArray(modules)) {
            return modules.filter((item) => item != null);
          }
          return [];
        };

        // Extract doctrine name (e.g., "Hound (Polarized)" -> "Polarized")
        const nameMatch = doctrine.name.match(/\(([^)]+)\)/);
        const extractedName = nameMatch ? nameMatch[1] : doctrine.name;

        // Check if it's a preset name or custom
        const isPreset = DOCTRINE_NAME_OPTIONS.includes(extractedName as any);

        setImportedFitting({
          ship_type_id: doctrine.ship_type_id,
          ship_name: doctrine.ship_name,
          ship_group_id: doctrine.ship_group_id || 0,
          ship_group_name: doctrine.ship_group_name || '',
          name: doctrine.name,
          high_slots: doctrine.high_slots || 0,
          mid_slots: doctrine.mid_slots || 0,
          low_slots: doctrine.low_slots || 0,
          rig_slots: doctrine.rig_slots || 0,
          launcher_hardpoints: 0,
          turret_hardpoints: 0,
          cargo_capacity: 0,
          high_slot_modules: parseModules(doctrine.high_slot_modules),
          mid_slot_modules: parseModules(doctrine.mid_slot_modules),
          low_slot_modules: parseModules(doctrine.low_slot_modules),
          rig_modules: parseModules(doctrine.rig_modules),
          cargo_items: parseModules(doctrine.cargo_items),
          module_counts: {
            high: parseModules(doctrine.high_slot_modules).filter((m) => m?.type_id).length,
            mid: parseModules(doctrine.mid_slot_modules).filter((m) => m?.type_id).length,
            low: parseModules(doctrine.low_slot_modules).filter((m) => m?.type_id).length,
            rig: parseModules(doctrine.rig_modules).filter((m) => m?.type_id).length,
            cargo: parseModules(doctrine.cargo_items).length,
          },
        });
        setDoctrineName(isPreset ? extractedName : 'Other');
        setCustomDoctrineName(isPreset ? '' : extractedName);
        setDoctrineNotes(doctrine.notes || '');
        setFittingText(''); // Don't show fitting text in edit mode
      } else {
        // Add mode - clear form
        setFittingText('');
        setImportedFitting(null);
        setDoctrineName('');
        setCustomDoctrineName('');
        setDoctrineNotes('');
      }
      setError(null);
    }
  }, [isOpen, doctrine]);

  async function handleImport() {
    if (!fittingText.trim()) {
      setError('Please paste a fitting');
      return;
    }

    setImporting(true);
    setError(null);

    try {
      const response = await fetch('/api/esi/fitting-import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fitting_text: fittingText }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to import fitting');
      }

      setImportedFitting(data.fitting);
      setDoctrineName(data.fitting.name);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setImporting(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!importedFitting) {
      setError('Please import a fitting first');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Use custom name if "Other" is selected, otherwise use preset
      const finalName = doctrineName === 'Other' ? customDoctrineName.trim() : doctrineName;

      if (!finalName) {
        setError('Please enter a doctrine name');
        return;
      }

      const payload = {
        fleet_type_id: fleetTypeId,
        name: finalName,
        ship_type_id: importedFitting.ship_type_id,
        ship_name: importedFitting.ship_name,
        ship_group_id: importedFitting.ship_group_id,
        ship_group_name: importedFitting.ship_group_name,
        high_slots: importedFitting.high_slots,
        mid_slots: importedFitting.mid_slots,
        low_slots: importedFitting.low_slots,
        rig_slots: importedFitting.rig_slots,
        high_slot_modules: importedFitting.high_slot_modules,
        mid_slot_modules: importedFitting.mid_slot_modules,
        low_slot_modules: importedFitting.low_slot_modules,
        rig_modules: importedFitting.rig_modules,
        cargo_items: importedFitting.cargo_items,
        notes: doctrineNotes || null,
      };

      const url = isEditMode ? `/api/admin/doctrines?id=${doctrine.id}` : '/api/admin/doctrines';
      const method = isEditMode ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to save doctrine');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditMode ? 'Edit Doctrine' : 'Add Doctrine'} size="xl">
      <form onSubmit={handleSubmit}>
        {error && (
          <div className="mb-4 p-3 bg-danger/10 border border-danger text-danger rounded-md text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {/* Fitting Import */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Paste EVE Fitting <span className="text-error">*</span>
            </label>
            {!isEditMode && (
              <>
                <textarea
                  value={fittingText}
                  onChange={(e) => setFittingText(e.target.value)}
                  placeholder="Link fitting in chat, copy your message, paste here"
                  rows={4}
                  disabled={!!importedFitting}
                  className="w-full px-3 py-2 bg-input-bg border border-input-border rounded-md text-foreground font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                />
                {!importedFitting && (
                  <Button type="button" onClick={handleImport} disabled={importing} className="mt-2">
                    {importing ? 'Importing...' : 'Import Fitting'}
                  </Button>
                )}
              </>
            )}
            {isEditMode && (
              <p className="text-sm text-foreground-muted italic">
                Editing existing doctrine. To change the fitting, create a new doctrine instead.
              </p>
            )}
          </div>

          {/* Fitting Preview */}
          {importedFitting && (
            <>
              <div className="p-4 bg-background-dark rounded-lg border border-border">
                <div className="mb-4">
                  <h4 className="text-lg font-semibold text-primary">{importedFitting.name}</h4>
                  <p className="text-sm text-foreground-muted">
                    {importedFitting.ship_name} ({importedFitting.ship_group_name})
                  </p>
                </div>

                <div className="flex justify-center my-4">
                  <FittingWheel
                    highSlotModules={importedFitting.high_slot_modules}
                    midSlotModules={importedFitting.mid_slot_modules}
                    lowSlotModules={importedFitting.low_slot_modules}
                    rigModules={importedFitting.rig_modules}
                    highSlots={importedFitting.high_slots}
                    midSlots={importedFitting.mid_slots}
                    lowSlots={importedFitting.low_slots}
                    rigSlots={importedFitting.rig_slots}
                    shipTypeId={importedFitting.ship_type_id}
                    size={32}
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-sm">
                  <div className="bg-background p-2 rounded">
                    <span className="text-foreground-muted">High: </span>
                    <span className="text-primary font-semibold">
                      {importedFitting.module_counts.high}/{importedFitting.high_slots}
                    </span>
                  </div>
                  <div className="bg-background p-2 rounded">
                    <span className="text-foreground-muted">Mid: </span>
                    <span className="text-primary font-semibold">
                      {importedFitting.module_counts.mid}/{importedFitting.mid_slots}
                    </span>
                  </div>
                  <div className="bg-background p-2 rounded">
                    <span className="text-foreground-muted">Low: </span>
                    <span className="text-primary font-semibold">
                      {importedFitting.module_counts.low}/{importedFitting.low_slots}
                    </span>
                  </div>
                  <div className="bg-background p-2 rounded">
                    <span className="text-foreground-muted">Rigs: </span>
                    <span className="text-primary font-semibold">
                      {importedFitting.module_counts.rig}/{importedFitting.rig_slots}
                    </span>
                  </div>
                  <div className="bg-background p-2 rounded">
                    <span className="text-foreground-muted">Cargo: </span>
                    <span className="text-primary font-semibold">
                      {importedFitting.module_counts.cargo} items
                    </span>
                  </div>
                </div>

                {importedFitting.cargo_items.length > 0 && (
                  <div className="mt-4 p-3 bg-background rounded">
                    <h5 className="text-sm font-semibold text-foreground-muted mb-2">Cargo</h5>
                    <div className="space-y-1">
                      {importedFitting.cargo_items.map((item, index) => {
                        const itemName = item.type_name || (item as any).name || 'Unknown Item';
                        return (
                          <div
                            key={index}
                            className="text-sm text-foreground flex items-center gap-2"
                          >
                            <span className="text-primary font-mono">{item.quantity}x</span>
                            <span>{itemName}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Doctrine Type <span className="text-error">*</span>
                </label>
                <select
                  value={doctrineName}
                  onChange={(e) => setDoctrineName(e.target.value)}
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
              {doctrineName === 'Other' && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Custom Type Name <span className="text-error">*</span>
                  </label>
                  <input
                    type="text"
                    value={customDoctrineName}
                    onChange={(e) => setCustomDoctrineName(e.target.value)}
                    placeholder="e.g., Faction, Officer Fit, Budget..."
                    required
                    className="w-full px-3 py-2 bg-input-bg border border-input-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={doctrineNotes}
                  onChange={(e) => setDoctrineNotes(e.target.value)}
                  placeholder="Usage instructions, special considerations, etc..."
                  rows={3}
                  className="w-full px-3 py-2 bg-input-bg border border-input-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </>
          )}
        </div>

        <ModalFooter>
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          {importedFitting && (
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : isEditMode ? 'Update Doctrine' : 'Save Doctrine'}
            </Button>
          )}
        </ModalFooter>
      </form>
    </Modal>
  );
}
