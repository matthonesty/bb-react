'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Eye, Trash2 } from 'lucide-react';
import { ViewDoctrineModal } from './ViewDoctrineModal';
import { FittingWheel } from './FittingWheel';
import type { Doctrine, ModuleItem } from '@/types';

interface DoctrineCardProps {
  doctrine: Doctrine;
  canManage: boolean;
  onDelete: () => void;
}

export function DoctrineCard({ doctrine, canManage, onDelete }: DoctrineCardProps) {
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

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
    <>
      <Card variant="bordered" className="hover:border-primary/50 transition-colors">
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
              variant="ghost"
              size="sm"
              onClick={() => setIsViewModalOpen(true)}
            >
              <Eye size={14} />
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

        <div className="flex justify-center my-4">
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
            size={32}
          />
        </div>

        {doctrine.notes && (
          <div className="mt-4 p-3 bg-background-dark rounded-md text-sm text-foreground">
            {doctrine.notes}
          </div>
        )}
      </Card>

      <ViewDoctrineModal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        doctrine={doctrine}
      />
    </>
  );
}
