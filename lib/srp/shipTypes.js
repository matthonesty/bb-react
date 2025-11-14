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

/**
 * Load all approved ship types from database
 * Called once at start of mail processing cycle
 *
 * @returns {Promise<Object>} Map of type_id -> ship data
 *
 * @example
 * const ships = await getAllApprovedShips();
 * // Returns: {
 * //   12034: { type_id: 12034, name: 'Hound', group_id: 834, group_name: 'Stealth Bomber', payout: 40000000, polarized_payout: 70000000, ... },
 * //   ...
 * // }
 */
async function getAllApprovedShips() {
  const Database = require('../../src/database');
  const db = await Database.getInstance();

  const result = await db.query(
    'SELECT * FROM srp_ship_types WHERE is_active = TRUE'
  );

  const ships = {};
  result.rows.forEach(row => {
    ships[row.type_id] = {
      type_id: row.type_id,
      name: row.type_name,
      group_id: row.group_id,
      group_name: row.group_name,
      payout: row.base_payout,
      polarized_payout: row.polarized_payout,
      fc_discretion: row.fc_discretion,
      notes: row.notes
    };
  });

  return ships;
}

/**
 * Check if ship is approved (synchronous - requires pre-loaded ship map)
 *
 * @param {number} typeId - EVE type ID
 * @param {Object} shipsMap - Pre-loaded ship types map from getAllApprovedShips()
 * @returns {boolean} True if ship is approved
 *
 * @example
 * const ships = await getAllApprovedShips();
 * if (isApprovedShip(12034, ships)) {
 *   console.log('Hound is approved');
 * }
 */
function isApprovedShip(typeId, shipsMap) {
  return typeId in shipsMap;
}

/**
 * Get payout amount (synchronous - requires pre-loaded ship map)
 *
 * @param {number} typeId - EVE type ID
 * @param {Object} shipsMap - Pre-loaded ship types map from getAllApprovedShips()
 * @param {boolean} isPolarized - Whether fit is polarized
 * @returns {number|null} Payout amount in ISK, or null if not approved
 *
 * @example
 * const ships = await getAllApprovedShips();
 * const payout = getPayoutAmount(12034, ships, true);
 * console.log(payout); // 70000000 (polarized bomber)
 */
function getPayoutAmount(typeId, shipsMap, isPolarized = false) {
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
 * @param {number} typeId - EVE type ID
 * @param {Object} shipsMap - Pre-loaded ship types map from getAllApprovedShips()
 * @returns {Object|null} Ship data or null if not approved
 *
 * @example
 * const ships = await getAllApprovedShips();
 * const info = getShipInfo(12034, ships);
 * console.log(info.name); // "Hound"
 */
function getShipInfo(typeId, shipsMap) {
  return shipsMap[typeId] || null;
}

/**
 * Get all ship types grouped by ESI group name (for mail templates)
 *
 * @param {Object} shipsMap - Pre-loaded ship types map from getAllApprovedShips()
 * @returns {Object} Ships grouped by group_name
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
function getShipsByGroup(shipsMap) {
  const grouped = {};

  Object.values(shipsMap).forEach(ship => {
    const groupName = ship.group_name;
    if (!grouped[groupName]) {
      grouped[groupName] = [];
    }
    grouped[groupName].push({
      type_id: ship.type_id,
      name: ship.name,
      notes: ship.notes
    });
  });

  return grouped;
}

module.exports = {
  getAllApprovedShips,
  isApprovedShip,
  getPayoutAmount,
  getShipInfo,
  getShipsByGroup
};
