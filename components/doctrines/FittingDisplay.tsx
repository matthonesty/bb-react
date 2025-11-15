'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Copy } from 'lucide-react';
import { FittingWheel } from './FittingWheel';
import type { ModuleItem } from '@/types';

interface FittingDisplayProps {
  // Ship information
  shipTypeId: number;
  shipName: string;
  fittingName: string;

  // Slot counts
  highSlots: number;
  midSlots: number;
  lowSlots: number;
  rigSlots: number;

  // Modules (already parsed)
  highSlotModules: ModuleItem[];
  midSlotModules: ModuleItem[];
  lowSlotModules: ModuleItem[];
  rigModules: ModuleItem[];
  cargoItems: ModuleItem[];

  // Optional features
  showCopyButton?: boolean;
  notes?: string | null;
}

export function FittingDisplay({
  shipTypeId,
  shipName,
  fittingName,
  highSlots,
  midSlots,
  lowSlots,
  rigSlots,
  highSlotModules,
  midSlotModules,
  lowSlotModules,
  rigModules,
  cargoItems,
  showCopyButton = true,
  notes,
}: FittingDisplayProps) {
  const [copied, setCopied] = useState(false);

  const generateEFTFitting = () => {
    let eft = `[${shipName}, ${fittingName}]\n\n`;

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

  const renderModuleList = (title: string, modules: ModuleItem[]) => {
    const filledModules = modules.filter((m) => m !== null && m && m.type_id);
    if (filledModules.length === 0) return null;

    return (
      <div className="mb-3">
        <h5 className="text-xs font-semibold text-foreground-muted mb-1.5 uppercase tracking-wider">
          {title}
        </h5>
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
    <div className="space-y-4">
      {/* Fitting Wheel - Centered */}
      <div className="flex justify-center mb-6">
        <FittingWheel
          highSlotModules={highSlotModules}
          midSlotModules={midSlotModules}
          lowSlotModules={lowSlotModules}
          rigModules={rigModules}
          highSlots={highSlots}
          midSlots={midSlots}
          lowSlots={lowSlots}
          rigSlots={rigSlots}
          shipTypeId={shipTypeId}
          shipName={shipName}
          size={32}
        />
      </div>

      {/* Module Lists - Below Wheel */}
      <div className="space-y-4">
        {/* Row 1: High and Mid Slots */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderModuleList('High Slots', highSlotModules)}
          {renderModuleList('Mid Slots', midSlotModules)}
        </div>

        {/* Row 2: Low Slots and Rigs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderModuleList('Low Slots', lowSlotModules)}
          {renderModuleList('Rigs', rigModules)}
        </div>

        {/* Row 3: Cargo (full width) */}
        {cargoItems.filter((c) => c !== null && c && c.type_id).length > 0 && (
          <div>{renderModuleList('Cargo', cargoItems)}</div>
        )}
      </div>

      {/* Notes */}
      {notes && (
        <div className="p-3 bg-background-dark rounded-md border border-border">
          <h5 className="text-xs font-semibold text-foreground-muted mb-2 uppercase tracking-wider">
            Notes
          </h5>
          <p className="text-sm text-foreground whitespace-pre-wrap">{notes}</p>
        </div>
      )}
    </div>
  );
}
