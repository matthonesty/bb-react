'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ChevronRight, Pencil, Trash2 } from 'lucide-react';
import { DoctrinesList } from './DoctrinesList';
import type { FleetType } from '@/types';

interface FleetTypeCardProps {
  fleetType: FleetType;
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onReload: () => void;
}

export function FleetTypeCard({
  fleetType,
  canManage,
  onEdit,
  onDelete,
  onReload,
}: FleetTypeCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  function toggleExpanded() {
    setIsExpanded(!isExpanded);
  }

  return (
    <Card variant="bordered" padding="none" className="overflow-hidden">
      {/* Fleet Type Header */}
      <div
        onClick={toggleExpanded}
        className="p-6 cursor-pointer hover:bg-card-hover transition-colors border-b border-border"
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-xl font-semibold text-primary">{fleetType.name}</h3>
              {!fleetType.is_active && (
                <Badge variant="default" className="bg-foreground-muted/20 text-foreground-muted">
                  Inactive
                </Badge>
              )}
            </div>
            {fleetType.description && (
              <p className="text-foreground-muted text-sm">{fleetType.description}</p>
            )}
          </div>

          <div className="flex items-center gap-4">
            <Badge variant="info" className="font-medium">
              {fleetType.active_doctrine_count || 0} / {fleetType.doctrine_count || 0} Doctrines
            </Badge>

            {canManage && (
              <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="sm" onClick={onEdit}>
                  <Pencil size={14} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onDelete}
                  className="text-error hover:text-error hover:bg-error/10"
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            )}

            <ChevronRight
              size={24}
              className={`text-foreground-muted transition-transform ${
                isExpanded ? 'rotate-90' : ''
              }`}
            />
          </div>
        </div>
      </div>

      {/* Doctrines List (shown when expanded) */}
      {isExpanded && (
        <div className="bg-background-dark p-6">
          <DoctrinesList fleetTypeId={fleetType.id} canManage={canManage} onReload={onReload} />
        </div>
      )}
    </Card>
  );
}
