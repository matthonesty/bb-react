'use client';

import { useState } from 'react';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Copy } from 'lucide-react';
import { FittingWheel } from './FittingWheel';
import type { Doctrine, ModuleItem } from '@/types';

interface ViewDoctrineModalProps {
  isOpen: boolean;
  onClose: () => void;
  doctrine: Doctrine;
}

export function ViewDoctrineModal({ isOpen, onClose, doctrine }: ViewDoctrineModalProps) {
  const [copied, setCopied] = useState(false);

  // Parse JSON strings if needed
  const parseModules = (modules: ModuleItem[] | string): ModuleItem[] => {
    if (typeof modules === 'string') {
      try {
        return JSON.parse(modules);
      } catch {
        return [];
      }
    }
    return modules || [];
  };

  const highSlotModules = parseModules(doctrine.high_slot_modules);
  const midSlotModules = parseModules(doctrine.mid_slot_modules);
  const lowSlotModules = parseModules(doctrine.low_slot_modules);
  const rigModules = parseModules(doctrine.rig_modules);
  const cargoItems = parseModules(doctrine.cargo_items);

  async function copyFitting() {
    // In a real implementation, you would reconstruct the EVE fitting format
    // For now, we'll just copy the doctrine name
    try {
      await navigator.clipboard.writeText(doctrine.name);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }

  const renderModuleList = (title: string, modules: ModuleItem[]) => {
    if (modules.length === 0) return null;

    return (
      <div className="mb-4">
        <h5 className="text-sm font-semibold text-foreground-muted mb-2">{title}</h5>
        <div className="space-y-1">
          {modules.map((module, index) => (
            <div key={index} className="text-sm text-foreground flex items-center gap-2">
              <span className="text-primary font-mono">{module.quantity}x</span>
              <span>{module.type_name}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={doctrine.name}
      size="xl"
    >
      <div className="space-y-6">
        <div className="text-center">
          <p className="text-foreground-muted">
            {doctrine.ship_name}
          </p>
        </div>

        <div className="flex justify-center">
          <FittingWheel
            highSlotModules={highSlotModules}
            midSlotModules={midSlotModules}
            lowSlotModules={lowSlotModules}
            rigModules={rigModules}
            highSlots={doctrine.high_slots}
            midSlots={doctrine.mid_slots}
            lowSlots={doctrine.low_slots}
            rigSlots={doctrine.rig_slots}
            shipTypeId={doctrine.ship_type_id}
            size={64}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-4">
            {renderModuleList('High Slots', highSlotModules)}
            {renderModuleList('Mid Slots', midSlotModules)}
          </div>
          <div className="space-y-4">
            {renderModuleList('Low Slots', lowSlotModules)}
            {renderModuleList('Rigs', rigModules)}
          </div>
        </div>

        {cargoItems.length > 0 && (
          <div className="p-3 bg-background-dark rounded">
            {renderModuleList('Cargo', cargoItems)}
          </div>
        )}

        {doctrine.notes && (
          <div className="p-4 bg-background-dark rounded border border-border">
            <h5 className="text-sm font-semibold text-foreground-muted mb-2">Notes</h5>
            <p className="text-sm text-foreground whitespace-pre-wrap">
              {doctrine.notes}
            </p>
          </div>
        )}
      </div>

      <ModalFooter>
        <Button
          variant="secondary"
          onClick={copyFitting}
        >
          <Copy size={16} className="mr-2" />
          {copied ? 'Copied!' : 'Copy Fitting'}
        </Button>
        <Button onClick={onClose}>
          Close
        </Button>
      </ModalFooter>
    </Modal>
  );
}
