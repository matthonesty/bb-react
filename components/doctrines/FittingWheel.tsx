'use client';

import type { ModuleItem } from '@/types';

interface FittingWheelProps {
  highSlotModules: ModuleItem[];
  midSlotModules: ModuleItem[];
  lowSlotModules: ModuleItem[];
  rigModules: ModuleItem[];
  highSlots: number;
  midSlots: number;
  lowSlots: number;
  rigSlots: number;
  shipTypeId: number;
  size?: number;
}

export function FittingWheel({
  highSlotModules,
  midSlotModules,
  lowSlotModules,
  rigModules,
  highSlots,
  midSlots,
  lowSlots,
  rigSlots,
  shipTypeId,
  size = 32,
}: FittingWheelProps) {
  const imageUrl = `https://images.evetech.net/types/${shipTypeId}/icon?size=${size}`;

  // Create slot indicators
  const createSlots = (count: number, filled: ModuleItem[], color: string) => {
    const slots = [];
    for (let i = 0; i < count; i++) {
      const module = filled[i];
      slots.push(
        <div
          key={i}
          className={`w-2 h-2 rounded-full ${module ? color : 'bg-foreground-muted/30'}`}
          title={module ? `${module.quantity}x ${module.type_name}` : 'Empty slot'}
        />
      );
    }
    return slots;
  };

  return (
    <div className="inline-flex flex-col items-center gap-2">
      {/* Ship Icon */}
      <div className="relative">
        <img
          src={imageUrl}
          alt="Ship"
          width={size}
          height={size}
          className="rounded"
        />
      </div>

      {/* Module Slots Grid */}
      <div className="grid grid-cols-4 gap-3 text-xs">
        {/* High Slots */}
        {highSlots > 0 && (
          <div className="flex flex-col items-center gap-1">
            <span className="text-foreground-muted font-medium">High</span>
            <div className="flex flex-col gap-1">
              {createSlots(highSlots, highSlotModules, 'bg-orange-500')}
            </div>
          </div>
        )}

        {/* Mid Slots */}
        {midSlots > 0 && (
          <div className="flex flex-col items-center gap-1">
            <span className="text-foreground-muted font-medium">Mid</span>
            <div className="flex flex-col gap-1">
              {createSlots(midSlots, midSlotModules, 'bg-yellow-500')}
            </div>
          </div>
        )}

        {/* Low Slots */}
        {lowSlots > 0 && (
          <div className="flex flex-col items-center gap-1">
            <span className="text-foreground-muted font-medium">Low</span>
            <div className="flex flex-col gap-1">
              {createSlots(lowSlots, lowSlotModules, 'bg-blue-500')}
            </div>
          </div>
        )}

        {/* Rig Slots */}
        {rigSlots > 0 && (
          <div className="flex flex-col items-center gap-1">
            <span className="text-foreground-muted font-medium">Rigs</span>
            <div className="flex flex-col gap-1">
              {createSlots(rigSlots, rigModules, 'bg-purple-500')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
