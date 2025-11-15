/**
 * @fileoverview Ban List Checker
 *
 * Helper functions to check if characters, corps, or alliances are banned.
 */

import pool from '../db';

export type BanType = 'bb' | 'xup' | 'hk';
export type BanTypeOrAll = BanType | 'all';

export interface BanRecord {
  id: number;
  name: string;
  esi_id: number | null;
  type: string;
  bb_banned: boolean;
  xup_banned: boolean;
  hk_banned: boolean;
  banned_by: string | null;
  reason: string | null;
  ban_date: Date;
  created_at: Date;
  updated_at: Date;
}

export interface AddBanData {
  name: string;
  esiId?: number | null;
  type: string;
  bbBanned?: boolean;
  xupBanned?: boolean;
  hkBanned?: boolean;
  bannedBy?: string | null;
  reason?: string | null;
  banDate?: Date;
}

const COLUMN_MAP: Record<BanType, string> = {
  bb: 'bb_banned',
  xup: 'xup_banned',
  hk: 'hk_banned',
};

/**
 * Check if an entity is banned by ID or name
 *
 * @param idOrName - Entity ID or name to check
 * @param banType - Type of ban to check: 'bb', 'xup', 'hk'
 * @returns Ban record if banned, null if not banned
 */
export async function isBanned(
  idOrName: number | string,
  banType: BanType = 'bb'
): Promise<BanRecord | null> {
  const column = COLUMN_MAP[banType];
  if (!column) {
    throw new Error(`Invalid ban type: ${banType}. Must be 'bb', 'xup', or 'hk'`);
  }

  if (typeof idOrName === 'number' || !isNaN(parseInt(String(idOrName)))) {
    const id = typeof idOrName === 'number' ? idOrName : parseInt(String(idOrName));
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
 * @param idsOrNames - Array of entity IDs or names to check
 * @param banType - Type of ban to check: 'bb', 'xup', 'hk'
 * @returns Map of id/name -> ban record
 */
export async function areBanned(
  idsOrNames: Array<number | string>,
  banType: BanType = 'bb'
): Promise<Map<number | string, BanRecord>> {
  const column = COLUMN_MAP[banType];
  if (!column) {
    throw new Error(`Invalid ban type: ${banType}. Must be 'bb', 'xup', or 'hk'`);
  }

  const ids: number[] = [];
  const names: string[] = [];

  for (const item of idsOrNames) {
    if (typeof item === 'number' || !isNaN(parseInt(String(item)))) {
      ids.push(typeof item === 'number' ? item : parseInt(String(item)));
    } else {
      names.push(String(item).toLowerCase());
    }
  }

  const result = await pool.query(
    `SELECT * FROM ban_list
     WHERE (esi_id = ANY($1::bigint[]) OR LOWER(name) = ANY($2::text[]))
     AND ${column} = true`,
    [ids.length > 0 ? ids : [null], names.length > 0 ? names : [null]]
  );

  const banMap = new Map<number | string, BanRecord>();
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
 * @param banType - Type of ban to retrieve: 'bb', 'xup', 'hk', 'all'
 * @returns Array of ban records
 *
 * @example
 * const allBans = await getAllBans('bb');
 * console.log(`Total BB bans: ${allBans.length}`);
 */
export async function getAllBans(banType: BanTypeOrAll = 'bb'): Promise<BanRecord[]> {
  let query: string;
  if (banType === 'all') {
    query =
      'SELECT * FROM ban_list WHERE bb_banned = true OR xup_banned = true OR hk_banned = true ORDER BY name';
  } else {
    const column = COLUMN_MAP[banType];
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
 * @param banData - Ban data
 * @returns Created/updated ban record
 */
export async function addBan(banData: AddBanData): Promise<BanRecord> {
  const {
    name,
    esiId = null,
    type,
    bbBanned = false,
    xupBanned = false,
    hkBanned = false,
    bannedBy = null,
    reason = null,
    banDate = new Date(),
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
 * @param name - Entity name to unban
 * @param banType - Ban type to remove: 'bb', 'xup', 'hk', 'all'
 * @returns True if ban was removed
 */
export async function removeBan(name: string, banType: BanTypeOrAll = 'all'): Promise<boolean> {
  if (banType === 'all') {
    // Remove entire record
    const result = await pool.query('DELETE FROM ban_list WHERE LOWER(name) = LOWER($1)', [name]);
    return (result.rowCount ?? 0) > 0;
  } else {
    // Just unset specific ban flag
    const column = COLUMN_MAP[banType];
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

    return (result.rowCount ?? 0) > 0;
  }
}
