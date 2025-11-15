'use client';

import { useState } from 'react';
import { Crosshair, ChevronDown, ChevronRight } from 'lucide-react';
import { Doctrine } from '@/types';
import { Card } from '@/components/ui/Card';
import { DoctrineModal } from './DoctrineModal';

interface FleetTypeWithDoctrines {
  fleet_type_id: number;
  fleet_type_name: string;
  fleet_type_description: string | null;
  fleet_type_order: number;
  doctrines: Doctrine[];
}

interface DoctrinesDisplayProps {
  fleetTypes: FleetTypeWithDoctrines[];
}

interface GroupedShip {
  ship_name: string;
  ship_group_name: string | null;
  variants: Doctrine[];
}

export function DoctrinesDisplay({ fleetTypes }: DoctrinesDisplayProps) {
  if (fleetTypes.length === 0) {
    return (
      <Card>
        <div className="p-8 text-center">
          <Crosshair className="mx-auto h-12 w-12 text-foreground-muted" />
          <p className="mt-4 text-foreground-muted">No doctrines available</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {fleetTypes.map((fleetType) => (
        <FleetTypeSection key={fleetType.fleet_type_id} fleetType={fleetType} />
      ))}
    </div>
  );
}

function FleetTypeSection({ fleetType }: { fleetType: FleetTypeWithDoctrines }) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Group doctrines by ship name
  const groupedShips: Record<string, GroupedShip> = {};
  fleetType.doctrines.forEach((doctrine) => {
    if (!groupedShips[doctrine.ship_name]) {
      groupedShips[doctrine.ship_name] = {
        ship_name: doctrine.ship_name,
        ship_group_name: doctrine.ship_group_name,
        variants: [],
      };
    }
    groupedShips[doctrine.ship_name].variants.push(doctrine);
  });

  const ships = Object.values(groupedShips).sort((a, b) =>
    a.ship_name.localeCompare(b.ship_name)
  );

  return (
    <Card className="overflow-hidden">
      {/* Fleet Type Header - Clickable */}
      <div
        className="flex cursor-pointer items-center justify-between p-4 transition-colors hover:bg-surface-secondary"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-foreground">{fleetType.fleet_type_name}</h3>
          {fleetType.fleet_type_description && (
            <p className="mt-1 text-sm text-foreground-muted">{fleetType.fleet_type_description}</p>
          )}
        </div>
        <div className="ml-4">
          {isExpanded ? (
            <ChevronDown className="h-5 w-5 text-foreground-muted" />
          ) : (
            <ChevronRight className="h-5 w-5 text-foreground-muted" />
          )}
        </div>
      </div>

      {/* Ships List - Shown when expanded */}
      {isExpanded && (
        <div className="border-t border-border bg-background-dark p-4">
          <div className="space-y-3">
            {ships.map((ship) => (
              <ShipGroup key={ship.ship_name} ship={ship} />
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

function ShipGroup({ ship }: { ship: GroupedShip }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <div className="mb-2 flex items-center gap-2">
        <Crosshair className="h-4 w-4 text-primary" />
        <h4 className="font-semibold text-foreground">{ship.ship_name}</h4>
        {ship.ship_group_name && (
          <span className="text-sm text-foreground-muted">• {ship.ship_group_name}</span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {ship.variants.map((doctrine) => (
          <VariantButton key={doctrine.id} doctrine={doctrine} />
        ))}
      </div>
    </div>
  );
}

function VariantButton({ doctrine }: { doctrine: Doctrine }) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Extract variant name from full doctrine name (e.g., "Hound (Polarized)" -> "Polarized")
  const variantName = doctrine.name.match(/\(([^)]+)\)/)?.[1] || doctrine.name;

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="rounded-md border border-primary/30 bg-surface-secondary px-3 py-2 text-sm font-medium text-foreground transition-all hover:border-primary hover:bg-primary/10"
      >
        {variantName}
      </button>

      <DoctrineModal
        doctrine={doctrine}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
