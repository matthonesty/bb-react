/**
 * @fileoverview Ban List Checker
 *
 * Helper functions to check if characters, corps, or alliances are banned.
 */

const pool = require('../db.ts').default;

/**
 * Check if an entity is banned by ID or name
 *
 * @param {number|string} idOrName - Entity ID or name to check
 * @param {string} [banType='bb'] - Type of ban to check: 'bb', 'xup', 'hk'
 * @returns {Promise<Object|null>} Ban record if banned, null if not banned
 */
async function isBanned(idOrName, banType = 'bb') {

  const columnMap = {
    'bb': 'bb_banned',
    'xup': 'xup_banned',
    'hk': 'hk_banned'
  };

  const column = columnMap[banType];
  if (!column) {
    throw new Error(`Invalid ban type: ${banType}. Must be 'bb', 'xup', or 'hk'`);
  }

  if (typeof idOrName === 'number' || !isNaN(parseInt(idOrName))) {
    const id = typeof idOrName === 'number' ? idOrName : parseInt(idOrName);
    const result = await pool.query(
      `SELECT * FROM ban_list WHERE esi_id = $1 AND ${column} = true`,
      [id]
    );
    return result.rows.length > 0 ? result.rows[0] : null;
  } else {
    const result = await pool.query(
      `SELECT * FROM ban_list WHERE LOWER(name) = LOWER($1) AND ${column} = true`,
      [idOrName]
    );
    return result.rows.length > 0 ? result.rows[0] : null;
  }
}

/**
 * Check if multiple entities are banned by IDs or names
 *
 * @param {Array<number|string>} idsOrNames - Array of entity IDs or names to check
 * @param {string} [banType='bb'] - Type of ban to check: 'bb', 'xup', 'hk'
 * @returns {Promise<Map>} Map of id/name -> ban record
 */
async function areBanned(idsOrNames, banType = 'bb') {

  const columnMap = {
    'bb': 'bb_banned',
    'xup': 'xup_banned',
    'hk': 'hk_banned'
  };

  const column = columnMap[banType];
  if (!column) {
    throw new Error(`Invalid ban type: ${banType}. Must be 'bb', 'xup', or 'hk'`);
  }

  const ids = [];
  const names = [];

  for (const item of idsOrNames) {
    if (typeof item === 'number' || !isNaN(parseInt(item))) {
      ids.push(typeof item === 'number' ? item : parseInt(item));
    } else {
      names.push(item.toLowerCase());
    }
  }

  const result = await pool.query(
    `SELECT * FROM ban_list
     WHERE (esi_id = ANY($1::bigint[]) OR LOWER(name) = ANY($2::text[]))
     AND ${column} = true`,
    [ids.length > 0 ? ids : [null], names.length > 0 ? names : [null]]
  );

  const banMap = new Map();
  for (const row of result.rows) {
    if (row.esi_id) {
      banMap.set(row.esi_id, row);
    }
    banMap.set(row.name.toLowerCase(), row);
  }

  return banMap;
}

/**
 * Get all banned entities
 *
 * @param {string} [banType='bb'] - Type of ban to retrieve: 'bb', 'xup', 'hk', 'all'
 * @returns {Promise<Array>} Array of ban records
 *
 * @example
 * const allBans = await getAllBans('bb');
 * console.log(`Total BB bans: ${allBans.length}`);
 */
async function getAllBans(banType = 'bb') {

  let query;
  if (banType === 'all') {
    query = 'SELECT * FROM ban_list WHERE bb_banned = true OR xup_banned = true OR hk_banned = true ORDER BY name';
  } else {
    const columnMap = {
      'bb': 'bb_banned',
      'xup': 'xup_banned',
      'hk': 'hk_banned'
    };

    const column = columnMap[banType];
    if (!column) {
      throw new Error(`Invalid ban type: ${banType}. Must be 'bb', 'xup', 'hk', or 'all'`);
    }

    query = `SELECT * FROM ban_list WHERE ${column} = true ORDER BY name`;
  }

  const result = await pool.query(query);
  return result.rows;
}

/**
 * Add or update a ban
 *
 * @param {Object} banData - Ban data
 * @param {string} banData.name - Entity name
 * @param {number} [banData.esiId] - Entity ESI ID
 * @param {string} banData.type - Entity type
 * @param {boolean} [banData.bbBanned=false] - Global BB ban
 * @param {boolean} [banData.xupBanned=false] - X-up channel ban
 * @param {boolean} [banData.hkBanned=false] - HK channel ban
 * @param {string} [banData.bannedBy] - Who issued the ban
 * @param {string} [banData.reason] - Reason for ban
 * @param {Date} [banData.banDate] - Date of ban
 * @returns {Promise<Object>} Created/updated ban record
 */
async function addBan(banData) {

  const {
    name,
    esiId = null,
    type,
    bbBanned = false,
    xupBanned = false,
    hkBanned = false,
    bannedBy = null,
    reason = null,
    banDate = new Date()
  } = banData;

  if (!name || !type) {
    throw new Error('Name and type are required');
  }

  const result = await pool.query(
    `INSERT INTO ban_list (
      name, esi_id, type, bb_banned, xup_banned, hk_banned,
      banned_by, reason, ban_date, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
    ON CONFLICT (name)
    DO UPDATE SET
      esi_id = $2,
      type = $3,
      bb_banned = $4,
      xup_banned = $5,
      hk_banned = $6,
      banned_by = $7,
      reason = $8,
      ban_date = $9,
      updated_at = NOW()
    RETURNING *`,
    [name, esiId, type, bbBanned, xupBanned, hkBanned, bannedBy, reason, banDate]
  );

  return result.rows[0];
}

/**
 * Remove a ban (or specific ban type)
 *
 * @param {string} name - Entity name to unban
 * @param {string} [banType='all'] - Ban type to remove: 'bb', 'xup', 'hk', 'all'
 * @returns {Promise<boolean>} True if ban was removed
 */
async function removeBan(name, banType = 'all') {

  if (banType === 'all') {
    // Remove entire record
    const result = await pool.query(
      'DELETE FROM ban_list WHERE LOWER(name) = LOWER($1)',
      [name]
    );
    return result.rowCount > 0;
  } else {
    // Just unset specific ban flag
    const columnMap = {
      'bb': 'bb_banned',
      'xup': 'xup_banned',
      'hk': 'hk_banned'
    };

    const column = columnMap[banType];
    if (!column) {
      throw new Error(`Invalid ban type: ${banType}. Must be 'bb', 'xup', 'hk', or 'all'`);
    }

    const result = await pool.query(
      `UPDATE ban_list
       SET ${column} = false, updated_at = NOW()
       WHERE LOWER(name) = LOWER($1)`,
      [name]
    );

    // If all ban flags are now false, delete the record
    await pool.query(
      `DELETE FROM ban_list
       WHERE LOWER(name) = LOWER($1)
       AND bb_banned = false
       AND xup_banned = false
       AND hk_banned = false`,
      [name]
    );

    return result.rowCount > 0;
  }
}

module.exports = {
  isBanned,
  areBanned,
  getAllBans,
  addBan,
  removeBan
};
