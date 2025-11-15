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
  shipName?: string;
  size?: number;
}

// Slot coordinate mappings for 398x398 panel
const SLOT_POSITIONS = {
  high: [
    { x: 73, y: 60 },
    { x: 102, y: 42 },
    { x: 134, y: 27 },
    { x: 169, y: 21 },
    { x: 203, y: 22 },
    { x: 238, y: 30 },
    { x: 270, y: 45 },
    { x: 295, y: 64 },
  ],
  mid: [
    { x: 26, y: 140 },
    { x: 24, y: 176 },
    { x: 23, y: 212 },
    { x: 30, y: 245 },
    { x: 46, y: 278 },
    { x: 69, y: 304 },
    { x: 100, y: 328 },
    { x: 133, y: 342 },
  ],
  low: [
    { x: 344, y: 143 },
    { x: 350, y: 178 },
    { x: 349, y: 213 },
    { x: 340, y: 246 },
    { x: 323, y: 277 },
    { x: 300, y: 304 },
    { x: 268, y: 324 },
    { x: 234, y: 338 },
  ],
  rig: [
    { x: 148, y: 259 },
    { x: 185, y: 267 },
    { x: 221, y: 259 },
  ],
};

// Panel background images for different slot configurations
const PANEL_IMAGES = {
  base: 'https://zkillboard.com/img/panel/tyrannis.png',
  high: {
    0: null,
    1: 'https://zkillboard.com/img/panel/1h.png',
    2: 'https://zkillboard.com/img/panel/2h.png',
    3: 'https://zkillboard.com/img/panel/3h.png',
    4: 'https://zkillboard.com/img/panel/4h.png',
    5: 'https://zkillboard.com/img/panel/5h.png',
    6: 'https://zkillboard.com/img/panel/6h.png',
    7: 'https://zkillboard.com/img/panel/7h.png',
    8: 'https://zkillboard.com/img/panel/8h.png',
  } as Record<number, string | null>,
  mid: {
    0: null,
    1: 'https://zkillboard.com/img/panel/1m.png',
    2: 'https://zkillboard.com/img/panel/2m.png',
    3: 'https://zkillboard.com/img/panel/3m.png',
    4: 'https://zkillboard.com/img/panel/4m.png',
    5: 'https://zkillboard.com/img/panel/5m.png',
    6: 'https://zkillboard.com/img/panel/6m.png',
    7: 'https://zkillboard.com/img/panel/7m.png',
    8: 'https://zkillboard.com/img/panel/8m.png',
  } as Record<number, string | null>,
  low: {
    0: null,
    1: 'https://zkillboard.com/img/panel/1l.png',
    2: 'https://zkillboard.com/img/panel/2l.png',
    3: 'https://zkillboard.com/img/panel/3l.png',
    4: 'https://zkillboard.com/img/panel/4l.png',
    5: 'https://zkillboard.com/img/panel/5l.png',
    6: 'https://zkillboard.com/img/panel/6l.png',
    7: 'https://zkillboard.com/img/panel/7l.png',
    8: 'https://zkillboard.com/img/panel/8l.png',
  } as Record<number, string | null>,
  rig: {
    0: null,
    1: 'https://zkillboard.com/img/panel/1r.png',
    2: 'https://zkillboard.com/img/panel/2r.png',
    3: 'https://zkillboard.com/img/panel/3r.png',
  } as Record<number, string | null>,
};

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
  shipName,
  size = 32,
}: FittingWheelProps) {
  const getTypeIconUrl = (typeId: number, iconSize: number) => {
    return `https://images.evetech.net/types/${typeId}/icon?size=${iconSize}`;
  };

  const getShipRenderUrl = (typeId: number, renderSize: number) => {
    return `https://images.evetech.net/types/${typeId}/render?size=${renderSize}`;
  };

  const renderSlots = (
    slotType: 'high' | 'mid' | 'low' | 'rig',
    slotCount: number,
    modules: ModuleItem[]
  ) => {
    const positions = SLOT_POSITIONS[slotType];
    const slots = [];

    for (let i = 0; i < slotCount; i++) {
      const pos = positions[i];
      const module = modules[i];

      if (module && module.type_id) {
        const moduleName = (module as any).name || module.type_name || 'Module';
        slots.push(
          <div
            key={`${slotType}-${i}`}
            style={{
              position: 'absolute',
              left: `${pos.x}px`,
              top: `${pos.y}px`,
              width: `${size}px`,
              height: `${size}px`,
              zIndex: 2,
            }}
          >
            <a
              href={`https://everef.net/type/${module.type_id}`}
              target="_blank"
              rel="noopener noreferrer"
              title={moduleName}
            >
              <img
                className="img-rounded"
                src={getTypeIconUrl(module.type_id, size)}
                alt={moduleName}
                style={{
                  height: `${size}px`,
                  width: `${size}px`,
                }}
              />
            </a>
          </div>
        );
      } else {
        slots.push(
          <div
            key={`${slotType}-${i}`}
            style={{
              position: 'absolute',
              left: `${pos.x}px`,
              top: `${pos.y}px`,
              width: `${size}px`,
              height: `${size}px`,
            }}
          />
        );
      }
    }

    return slots;
  };

  return (
    <div
      className="fitting-panel"
      style={{
        position: 'relative',
        height: '398px',
        width: '398px',
        margin: '0 auto',
      }}
    >
      {/* Base background */}
      <div
        className="mask"
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: '398px',
          height: '398px',
          zIndex: -1,
        }}
      >
        <img
          src={PANEL_IMAGES.base}
          alt=""
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            height: '398px',
            width: '398px',
            border: 0,
          }}
        />
      </div>

      {/* High slot panel */}
      {highSlots > 0 && PANEL_IMAGES.high[highSlots] && (
        <div
          className="highx"
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: '398px',
            height: '398px',
            zIndex: -1,
          }}
        >
          <img
            src={PANEL_IMAGES.high[highSlots] || ''}
            alt=""
            style={{ border: 0, width: '398px', height: '398px' }}
          />
        </div>
      )}

      {/* Mid slot panel */}
      {midSlots > 0 && PANEL_IMAGES.mid[midSlots] && (
        <div
          className="midx"
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: '398px',
            height: '398px',
            zIndex: -1,
          }}
        >
          <img
            src={PANEL_IMAGES.mid[midSlots] || ''}
            alt=""
            style={{ border: 0, width: '398px', height: '398px' }}
          />
        </div>
      )}

      {/* Low slot panel */}
      {lowSlots > 0 && PANEL_IMAGES.low[lowSlots] && (
        <div
          className="lowx"
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: '398px',
            height: '398px',
            zIndex: -1,
          }}
        >
          <img
            src={PANEL_IMAGES.low[lowSlots] || ''}
            alt=""
            style={{ border: 0, width: '398px', height: '398px' }}
          />
        </div>
      )}

      {/* Rig slot panel */}
      {rigSlots > 0 && PANEL_IMAGES.rig[rigSlots] && (
        <div
          className="rigxx"
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: '398px',
            height: '398px',
            zIndex: -1,
          }}
        >
          <img
            src={PANEL_IMAGES.rig[rigSlots] || ''}
            alt=""
            style={{ border: 0, width: '398px', height: '398px' }}
          />
        </div>
      )}

      {/* Ship render in center */}
      <div
        className="bigship"
        style={{
          position: 'absolute',
          left: '72px',
          top: '71px',
          width: '256px',
          height: '256px',
          zIndex: -2,
        }}
      >
        <span
          className="shipImageSpan"
          style={{ height: '256px', width: '256px', display: 'block' }}
        >
          <img
            src={getShipRenderUrl(shipTypeId, 256)}
            alt={shipName || 'Ship'}
            className="shipImageRender img-rounded"
            style={{
              height: '256px',
              width: '256px',
              display: 'block',
            }}
            onError={(e) => {
              (e.target as HTMLImageElement).src = getTypeIconUrl(shipTypeId, 256);
            }}
          />
        </span>
      </div>

      {/* Render all slots */}
      {renderSlots('high', highSlots, highSlotModules)}
      {renderSlots('mid', midSlots, midSlotModules)}
      {renderSlots('low', lowSlots, lowSlotModules)}
      {renderSlots('rig', rigSlots, rigModules)}
    </div>
  );
}
