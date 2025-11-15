'use client';

import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Trash2 } from 'lucide-react';
import { FittingDisplay } from './FittingDisplay';
import type { Doctrine, ModuleItem } from '@/types';

interface DoctrineCardProps {
  doctrine: Doctrine;
  canManage: boolean;
  onDelete: () => void;
}

export function DoctrineCard({ doctrine, canManage, onDelete }: DoctrineCardProps) {
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
        showCopyButton={true}
        notes={doctrine.notes}
      />
    </Card>
  );
}
