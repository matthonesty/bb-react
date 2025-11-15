'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Copy, Trash2 } from 'lucide-react';
import { FittingDisplay } from './FittingDisplay';
import type { Doctrine, ModuleItem } from '@/types';

interface DoctrineCardProps {
  doctrine: Doctrine;
  canManage: boolean;
  onDelete: () => void;
}

export function DoctrineCard({ doctrine, canManage, onDelete }: DoctrineCardProps) {
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

  const generateEFTFitting = () => {
    let eft = `[${doctrine.ship_name}, ${doctrine.name}]\n\n`;

    // Low slots
    lowSlotModules.forEach((mod) => {
      if (mod && mod.type_id) {
        const name = (mod as any).name || mod.type_name || 'Unknown Module';
        eft += `${name}\n`;
      }
    });
    eft += '\n';

    // Mid slots
    midSlotModules.forEach((mod) => {
      if (mod && mod.type_id) {
        const name = (mod as any).name || mod.type_name || 'Unknown Module';
        eft += `${name}\n`;
      }
    });
    eft += '\n';

    // High slots
    highSlotModules.forEach((mod) => {
      if (mod && mod.type_id) {
        const name = (mod as any).name || mod.type_name || 'Unknown Module';
        eft += `${name}\n`;
      }
    });
    eft += '\n';

    // Rigs
    rigModules.forEach((mod) => {
      if (mod && mod.type_id) {
        const name = (mod as any).name || mod.type_name || 'Unknown Module';
        eft += `${name}\n`;
      }
    });
    eft += '\n';

    // Cargo
    cargoItems.forEach((item) => {
      if (item && item.type_id) {
        const name = (item as any).name || item.type_name || 'Unknown Item';
        eft += `${name} x${item.quantity}\n`;
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
    <Card variant="bordered" className="hover:border-primary/50 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-lg font-semibold text-foreground">{doctrine.name}</h4>
            {!doctrine.is_active && (
              <Badge
                variant="default"
                className="bg-foreground-muted/20 text-foreground-muted text-xs"
              >
                Inactive
              </Badge>
            )}
          </div>
          <p className="text-sm text-foreground-muted">{doctrine.ship_name}</p>
        </div>

        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={copyFitting}>
            <Copy size={14} className="mr-1.5" />
            {copied ? 'Copied!' : 'Copy Fitting'}
          </Button>
          {canManage && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="text-error hover:text-error hover:bg-error/10"
            >
              <Trash2 size={14} />
            </Button>
          )}
        </div>
      </div>

      {/* Fitting Display */}
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
        showCopyButton={false}
        notes={doctrine.notes}
      />
    </Card>
  );
}
