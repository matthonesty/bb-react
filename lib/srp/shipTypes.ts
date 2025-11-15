/**
 * @fileoverview O'Bomber-care Ship Types & Payouts (Database-Driven)
 *
 * Loads approved ship types from database and provides synchronous helper functions.
 * Ship types are identified by EVE type IDs.
 *
 * USAGE PATTERN:
 * 1. Load ships once at start of processing cycle: const ships = await getAllApprovedShips()
 * 2. Pass ships map to synchronous helpers: isApprovedShip(typeId, ships)
 * 3. No caching, no repeated queries - load once per batch
 */

import pool from '../db';

export interface ShipInfo {
  type_id: number;
  name: string;
  group_id: number;
  group_name: string;
  payout: number;
  polarized_payout: number | null;
  fc_discretion: boolean;
  notes: string | null;
}

export interface ShipsMap {
  [typeId: number]: ShipInfo;
}

export interface GroupedShips {
  [groupName: string]: Array<{
    type_id: number;
    name: string;
    notes: string | null;
  }>;
}

/**
 * Load all approved ship types from database
 * Called once at start of mail processing cycle
 *
 * @returns Map of type_id -> ship data
 *
 * @example
 * const ships = await getAllApprovedShips();
 * // Returns: {
 * //   12034: { type_id: 12034, name: 'Hound', group_id: 834, group_name: 'Stealth Bomber', payout: 40000000, polarized_payout: 70000000, ... },
 * //   ...
 * // }
 */
export async function getAllApprovedShips(): Promise<ShipsMap> {
  const result = await pool.query('SELECT * FROM srp_ship_types WHERE is_active = TRUE');

  const ships: ShipsMap = {};
  result.rows.forEach((row) => {
    ships[row.type_id] = {
      type_id: row.type_id,
      name: row.type_name,
      group_id: row.group_id,
      group_name: row.group_name,
      payout: row.base_payout,
      polarized_payout: row.polarized_payout,
      fc_discretion: row.fc_discretion,
      notes: row.notes,
    };
  });

  return ships;
}

/**
 * Check if ship is approved (synchronous - requires pre-loaded ship map)
 *
 * @param typeId - EVE type ID
 * @param shipsMap - Pre-loaded ship types map from getAllApprovedShips()
 * @returns True if ship is approved
 *
 * @example
 * const ships = await getAllApprovedShips();
 * if (isApprovedShip(12034, ships)) {
 *   console.log('Hound is approved');
 * }
 */
export function isApprovedShip(typeId: number, shipsMap: ShipsMap): boolean {
  return typeId in shipsMap;
}

/**
 * Get payout amount (synchronous - requires pre-loaded ship map)
 *
 * @param typeId - EVE type ID
 * @param shipsMap - Pre-loaded ship types map from getAllApprovedShips()
 * @param isPolarized - Whether fit is polarized
 * @returns Payout amount in ISK, or null if not approved
 *
 * @example
 * const ships = await getAllApprovedShips();
 * const payout = getPayoutAmount(12034, ships, true);
 * console.log(payout); // 70000000 (polarized bomber)
 */
export function getPayoutAmount(
  typeId: number,
  shipsMap: ShipsMap,
  isPolarized = false
): number | null {
  const ship = shipsMap[typeId];
  if (!ship) return null;

  if (isPolarized && ship.polarized_payout) {
    return ship.polarized_payout;
  }

  return ship.payout;
}

/**
 * Get ship info (synchronous - requires pre-loaded ship map)
 *
 * @param typeId - EVE type ID
 * @param shipsMap - Pre-loaded ship types map from getAllApprovedShips()
 * @returns Ship data or null if not approved
 *
 * @example
 * const ships = await getAllApprovedShips();
 * const info = getShipInfo(12034, ships);
 * console.log(info.name); // "Hound"
 */
export function getShipInfo(typeId: number, shipsMap: ShipsMap): ShipInfo | null {
  return shipsMap[typeId] || null;
}

/**
 * Get all ship types grouped by ESI group name (for mail templates)
 *
 * @param shipsMap - Pre-loaded ship types map from getAllApprovedShips()
 * @returns Ships grouped by group_name
 *
 * @example
 * const ships = await getAllApprovedShips();
 * const grouped = getShipsByGroup(ships);
 * // Returns: {
 * //   "Stealth Bomber": [
 * //     { type_id: 12034, name: "Hound", notes: null },
 * //     { type_id: 12032, name: "Manticore", notes: null },
 * //     ...
 * //   ],
 * //   "Strategic Cruiser": [
 * //     { type_id: 29990, name: "Loki", notes: "Hunters/Links Only" },
 * //     ...
 * //   ]
 * // }
 */
export function getShipsByGroup(shipsMap: ShipsMap): GroupedShips {
  const grouped: GroupedShips = {};

  Object.values(shipsMap).forEach((ship) => {
    const groupName = ship.group_name;
    if (!grouped[groupName]) {
      grouped[groupName] = [];
    }
    grouped[groupName].push({
      type_id: ship.type_id,
      name: ship.name,
      notes: ship.notes,
    });
  });

  return grouped;
}
