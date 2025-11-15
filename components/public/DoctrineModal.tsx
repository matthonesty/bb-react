'use client';

import { useState } from 'react';
import { Copy } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FittingDisplay } from '@/components/doctrines/FittingDisplay';
import { Doctrine, ModuleItem } from '@/types';

interface DoctrineModalProps {
  doctrine: Doctrine | null;
  isOpen: boolean;
  onClose: () => void;
}

export function DoctrineModal({ doctrine, isOpen, onClose }: DoctrineModalProps) {
  const [copied, setCopied] = useState(false);

  if (!doctrine) return null;

  // Parse module data if it's a string
  const parseModules = (modules: ModuleItem[] | string): ModuleItem[] => {
    if (typeof modules === 'string') {
      try {
        const parsed = JSON.parse(modules);
        if (Array.isArray(parsed)) {
          return parsed.filter((item): item is ModuleItem => item != null);
        }
        return [];
      } catch {
        return [];
      }
    }
    if (Array.isArray(modules)) {
      return modules.filter((item): item is ModuleItem => item != null);
    }
    return [];
  };

  const highSlotModules = parseModules(doctrine.high_slot_modules);
  const midSlotModules = parseModules(doctrine.mid_slot_modules);
  const lowSlotModules = parseModules(doctrine.low_slot_modules);
  const rigModules = parseModules(doctrine.rig_modules);
  const cargoItems = parseModules(doctrine.cargo_items);

  const generateEFTFitting = () => {
    let eft = `[${doctrine.ship_name}, ${doctrine.name}]\n\n`;

    const getModuleName = (mod: ModuleItem): string => {
      return mod.type_name || (mod as { name?: string }).name || 'Unknown Module';
    };

    // Low slots
    lowSlotModules.forEach((mod) => {
      if (mod && mod.type_id) {
        eft += `${getModuleName(mod)}\n`;
      }
    });
    eft += '\n';

    // Mid slots
    midSlotModules.forEach((mod) => {
      if (mod && mod.type_id) {
        eft += `${getModuleName(mod)}\n`;
      }
    });
    eft += '\n';

    // High slots
    highSlotModules.forEach((mod) => {
      if (mod && mod.type_id) {
        eft += `${getModuleName(mod)}\n`;
      }
    });
    eft += '\n';

    // Rigs
    rigModules.forEach((mod) => {
      if (mod && mod.type_id) {
        eft += `${getModuleName(mod)}\n`;
      }
    });
    eft += '\n';

    // Cargo
    cargoItems.forEach((item) => {
      if (item && item.type_id) {
        eft += `${getModuleName(item)} x${item.quantity}\n`;
      }
    });

    return eft;
  };

  const copyFitting = async () => {
    try {
      const eft = generateEFTFitting();
      await navigator.clipboard.writeText(eft);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={doctrine.name}>
      <div className="max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm text-foreground-muted">
            {doctrine.ship_group_name}
          </p>
          <Button variant="secondary" size="sm" onClick={copyFitting}>
            <Copy size={14} className="mr-1.5" />
            {copied ? 'Copied!' : 'Copy Fitting'}
          </Button>
        </div>

        <FittingDisplay
          shipTypeId={doctrine.ship_type_id}
          shipName={doctrine.ship_name}
          fittingName={doctrine.name}
          highSlots={doctrine.high_slots}
          midSlots={doctrine.mid_slots}
          lowSlots={doctrine.low_slots}
          rigSlots={doctrine.rig_slots}
          highSlotModules={highSlotModules}
          midSlotModules={midSlotModules}
          lowSlotModules={lowSlotModules}
          rigModules={rigModules}
          cargoItems={cargoItems}
          notes={doctrine.notes}
        />
      </div>
    </Modal>
  );
}
