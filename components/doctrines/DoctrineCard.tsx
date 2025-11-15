'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Copy, Trash2 } from 'lucide-react';
import { FittingWheel } from './FittingWheel';
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
    lowSlotModules.forEach(mod => {
      if (mod && mod.type_id) {
        const name = (mod as any).name || mod.type_name || 'Unknown Module';
        eft += `${name}\n`;
      }
    });
    eft += '\n';

    // Mid slots
    midSlotModules.forEach(mod => {
      if (mod && mod.type_id) {
        const name = (mod as any).name || mod.type_name || 'Unknown Module';
        eft += `${name}\n`;
      }
    });
    eft += '\n';

    // High slots
    highSlotModules.forEach(mod => {
      if (mod && mod.type_id) {
        const name = (mod as any).name || mod.type_name || 'Unknown Module';
        eft += `${name}\n`;
      }
    });
    eft += '\n';

    // Rigs
    rigModules.forEach(mod => {
      if (mod && mod.type_id) {
        const name = (mod as any).name || mod.type_name || 'Unknown Module';
        eft += `${name}\n`;
      }
    });
    eft += '\n';

    // Cargo
    cargoItems.forEach(item => {
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

  const renderModuleList = (title: string, modules: ModuleItem[]) => {
    const filledModules = modules.filter(m => m !== null && m && m.type_id);
    if (filledModules.length === 0) return null;

    return (
      <div className="mb-3">
        <h5 className="text-xs font-semibold text-foreground-muted mb-1.5 uppercase tracking-wider">{title}</h5>
        <div className="space-y-1">
          {filledModules.map((module, index) => {
            const name = (module as any).name || module.type_name || 'Unknown Module';
            return (
              <div key={index} className="text-sm text-foreground flex items-center gap-2">
                <span className="text-primary font-mono text-xs">{module.quantity}x</span>
                <span>{name}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <Card variant="bordered" className="hover:border-primary/50 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-lg font-semibold text-foreground">
              {doctrine.name}
            </h4>
            {!doctrine.is_active && (
              <Badge variant="default" className="bg-foreground-muted/20 text-foreground-muted text-xs">
                Inactive
              </Badge>
            )}
          </div>
          <p className="text-sm text-foreground-muted">
            {doctrine.ship_name}
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={copyFitting}
          >
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

      {/* Fitting Wheel and Module Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Fitting Wheel */}
        <div className="lg:col-span-1 flex justify-center items-start" style={{ position: 'relative', zIndex: 1 }}>
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
            shipName={doctrine.ship_name}
            size={32}
          />
        </div>

        {/* Module Lists */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4" style={{ position: 'relative', zIndex: 2 }}>
          <div className="space-y-3">
            {renderModuleList('High Slots', highSlotModules)}
            {renderModuleList('Mid Slots', midSlotModules)}
          </div>
          <div className="space-y-3">
            {renderModuleList('Low Slots', lowSlotModules)}
            {renderModuleList('Rigs', rigModules)}
          </div>
        </div>
      </div>

      {/* Cargo */}
      {cargoItems.filter(c => c !== null && c && c.type_id).length > 0 && (
        <div className="mt-4 p-3 bg-background-dark rounded-md">
          {renderModuleList('Cargo', cargoItems)}
        </div>
      )}

      {/* Notes */}
      {doctrine.notes && (
        <div className="mt-4 p-3 bg-background-dark rounded-md border border-border">
          <h5 className="text-xs font-semibold text-foreground-muted mb-2 uppercase tracking-wider">Notes</h5>
          <p className="text-sm text-foreground whitespace-pre-wrap">
            {doctrine.notes}
          </p>
        </div>
      )}
    </Card>
  );
}
