/**
 * @fileoverview Killmail Parsing Service
 *
 * Parses zkillboard links from EVE mail and fetches killmail data.
 *
 * Workflow:
 * 1. Extract killmail ID from zkillboard URL
 * 2. Fetch killmail from zkillboard API to get hash
 * 3. Fetch full killmail from ESI using ID + hash
 * 4. Parse victim ship type and fit
 */

import axios from 'axios';
import { ESI_BASE_URL, esiGet } from '../esi';
import { Pool } from 'pg';

export interface KillReportLinkData {
  killmailId: number;
  hash: string;
}

export interface PolarizedResult {
  is_polarized: boolean;
  count: number;
  warning: string | null;
}

export interface ParsedKillmail {
  killmail_id: number;
  killmail_time: string;
  victim_character_id: number;
  victim_corporation_id: number;
  victim_alliance_id: number | null;
  victim_ship_type_id: number;
  damage_taken: number;
  items: any[];
  solar_system_id: number;
  attackers_count: number;
  hash?: string;
}

export interface FCInfo {
  fc_id: number;
  status: string;
  rank: string;
  main_character_name: string;
}

export interface ProximityKillmail {
  attackers?: number[];
  fleet_commanders?: FCInfo[];
  [key: string]: any;
}

export interface ProximityData {
  sourceKillmail?: any;
  relatedKillmails?: ProximityKillmail[];
  victimAsAttacker?: ProximityKillmail[];
  timeWindow?: any;
  count?: any;
}

export interface ParseKillmailResult {
  hash: string;
  killmail: any;
  parsed: ParsedKillmail;
  is_polarized: boolean;
  polarized_count: number;
  polarized_warning: string | null;
  source: 'killReport' | 'zkillboard';
}

/**
 * Extract killmail ID from zkillboard URL
 *
 * Supports formats:
 * - https://zkillboard.com/kill/131006011/
 * - https://zkillboard.com/kill/131006011
 * - zkillboard.com/kill/131006011/
 *
 * @param text - Text containing zkillboard URL
 * @returns Killmail ID or null if not found
 *
 * @example
 * extractKillmailId("Check this: https://zkillboard.com/kill/131006011/")
 * // Returns: 131006011
 */
export function extractKillmailId(text: string): number | null {
  // Match zkillboard.com/kill/NUMBER
  const regex = /zkillboard\.com\/kill\/(\d+)/i;
  const match = text.match(regex);

  if (match && match[1]) {
    return parseInt(match[1]);
  }

  return null;
}

/**
 * Extract killmail ID and hash from EVE in-game kill report link
 *
 * EVE in-game kill links have format:
 * <url=killReport:KILLMAIL_ID:HASH>Kill: Character Name (Ship)</url>
 *
 * @param text - Text containing EVE kill report link
 * @returns { killmailId, hash } or null if not found
 *
 * @example
 * extractKillReportLink("<url=killReport:130838826:4b7930e8b8f7077b6a2999f3127a83061b62400b>Kill: Isarra Vess (Nemesis)</url>")
 * // Returns: { killmailId: 130838826, hash: "4b7930e8b8f7077b6a2999f3127a83061b62400b" }
 */
export function extractKillReportLink(text: string): KillReportLinkData | null {
  // Match killReport:KILLMAIL_ID:HASH
  const regex = /killReport:(\d+):([a-f0-9]{40})/i;
  const match = text.match(regex);

  if (match && match[1] && match[2]) {
    return {
      killmailId: parseInt(match[1]),
      hash: match[2],
    };
  }

  return null;
}

/**
 * Fetch killmail hash from zkillboard API
 *
 * @param killmailId - Killmail ID
 * @returns Killmail hash
 *
 * @example
 * const hash = await getKillmailHash(131006011);
 * // Returns: "3a06facfb5a56fd3e2fa54ec4fcaec6d821cc008"
 */
export async function getKillmailHash(killmailId: number): Promise<string> {
  try {
    const url = `https://zkillboard.com/api/killID/${killmailId}/`;
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Bombers Bar O-Bomber-care System',
        'Accept-Encoding': 'gzip',
      },
    });

    if (!response.data || !response.data[0] || !response.data[0].zkb) {
      throw new Error('Invalid zkillboard response format');
    }

    const hash = response.data[0].zkb.hash;
    if (!hash) {
      throw new Error('No hash found in zkillboard response');
    }

    return hash;
  } catch (error: any) {
    console.error('[KILLMAIL] Error fetching hash from zkillboard:', error.message);
    throw new Error(`Failed to fetch killmail hash: ${error.message}`);
  }
}

/**
 * Fetch full killmail from ESI
 *
 * @param killmailId - Killmail ID
 * @param hash - Killmail hash from zkillboard
 * @returns Full killmail data
 *
 * @example
 * const killmail = await getKillmailFromESI(131006011, "3a06...");
 * // Returns: { killmail_id, killmail_time, victim: {...}, attackers: [...] }
 */
export async function getKillmailFromESI(killmailId: number, hash: string): Promise<any> {
  try {
    const url = `${ESI_BASE_URL}/killmails/${killmailId}/${hash}/`;
    const killmail = await esiGet(url);

    if (!killmail) {
      throw new Error('ESI returned empty killmail data');
    }

    return killmail;
  } catch (error: any) {
    console.error('[KILLMAIL] Error fetching from ESI:', error.message);
    throw new Error(`Failed to fetch killmail from ESI: ${error.message}`);
  }
}

/**
 * Parse killmail to extract SRP-relevant information
 *
 * @param killmail - Full killmail from ESI
 * @returns Parsed killmail data
 *
 * @example
 * const parsed = parseKillmail(killmailData);
 * // Returns: { killmail_id: 131006011, victim_ship_type_id: 624, ... }
 */
export function parseKillmail(killmail: any): ParsedKillmail {
  if (!killmail) {
    throw new Error('Killmail data is null or undefined');
  }

  if (!killmail.victim) {
    throw new Error('Killmail missing victim data');
  }

  return {
    killmail_id: killmail.killmail_id,
    killmail_time: killmail.killmail_time,
    victim_character_id: killmail.victim.character_id,
    victim_corporation_id: killmail.victim.corporation_id,
    victim_alliance_id: killmail.victim.alliance_id || null,
    victim_ship_type_id: killmail.victim.ship_type_id,
    damage_taken: killmail.victim.damage_taken,
    items: killmail.victim.items || [],
    solar_system_id: killmail.solar_system_id,
    attackers_count: killmail.attackers ? killmail.attackers.length : 0,
  };
}

/**
 * Check if killmail has polarized weapons
 *
 * Polarized Torpedo Launcher must be fitted in high slots (flags 28, 29, 30).
 * Full polarized fit requires 3 launchers. If less than 3, a warning is included.
 *
 * Polarized Torpedo Launcher type ID: 34294
 *
 * @param items - Items from killmail
 * @returns Polarized detection result
 */
export function hasPolarizedWeapons(items: any[]): PolarizedResult {
  if (!items || !Array.isArray(items)) {
    return {
      is_polarized: false,
      count: 0,
      warning: null,
    };
  }

  const POLARIZED_TORPEDO_LAUNCHER = 34294;
  const HIGH_SLOT_FLAGS = [28, 29, 30];

  // Count polarized torpedo launchers in high slots
  const polarizedCount = items.filter(
    (item) =>
      item.item_type_id === POLARIZED_TORPEDO_LAUNCHER && HIGH_SLOT_FLAGS.includes(item.flag)
  ).length;

  let warning = null;
  if (polarizedCount > 0 && polarizedCount < 3) {
    warning = `Only ${polarizedCount} polarized launcher(s) fitted (expected 3 for full polarized fit)`;
  }

  return {
    is_polarized: polarizedCount > 0,
    count: polarizedCount,
    warning: warning,
  };
}

/**
 * Load all Fleet Commanders into memory and build character ID lookup map
 *
 * @param db - Database instance
 * @returns Map of character_id -> FC info
 */
export async function loadFleetCommandersMap(db: Pool): Promise<Map<string, FCInfo>> {
  const fcMap = new Map<string, FCInfo>();

  try {
    if (!db) {
      return fcMap;
    }

    const result = await db.query('SELECT * FROM fleet_commanders');

    for (const fc of result.rows) {
      const fcInfo: FCInfo = {
        fc_id: fc.id,
        status: fc.status,
        rank: fc.rank,
        main_character_name: fc.main_character_name,
      };

      // Map main character ID
      if (fc.main_character_id) {
        fcMap.set(String(fc.main_character_id), fcInfo);
      }

      // Map BB corp alt ID
      if (fc.bb_corp_alt_id) {
        fcMap.set(String(fc.bb_corp_alt_id), fcInfo);
      }

      // Map additional alts
      if (fc.additional_alts) {
        const alts =
          typeof fc.additional_alts === 'string'
            ? JSON.parse(fc.additional_alts)
            : fc.additional_alts;

        if (Array.isArray(alts)) {
          for (const alt of alts) {
            if (alt.character_id) {
              fcMap.set(String(alt.character_id), fcInfo);
            }
          }
        }
      }
    }

    console.log(
      `[KILLMAIL] Loaded ${result.rows.length} Fleet Commanders (${fcMap.size} character IDs mapped)`
    );
    return fcMap;
  } catch (error: any) {
    console.warn(`[KILLMAIL] Failed to load Fleet Commanders:`, error.message);
    return fcMap;
  }
}

/**
 * Enrich proximity data with Fleet Commander information
 *
 * @param proximityData - Raw proximity data from API
 * @param fcMap - Map of character_id -> FC info
 * @returns Enriched proximity data
 */
export function enrichProximityWithFCs(
  proximityData: ProximityData,
  fcMap: Map<string, FCInfo>
): ProximityData {
  if (!proximityData || !fcMap || fcMap.size === 0) {
    return proximityData;
  }

  const enrichedData = { ...proximityData };

  // Enrich relatedKillmails
  if (enrichedData.relatedKillmails && Array.isArray(enrichedData.relatedKillmails)) {
    enrichedData.relatedKillmails = enrichedData.relatedKillmails.map((km) => {
      if (!km.attackers || !Array.isArray(km.attackers)) {
        return km;
      }

      const fcs: FCInfo[] = [];
      const fcSet = new Set<number>();

      for (const attackerId of km.attackers) {
        const fcInfo = fcMap.get(String(attackerId));
        if (fcInfo && !fcSet.has(fcInfo.fc_id)) {
          fcs.push(fcInfo);
          fcSet.add(fcInfo.fc_id);
        }
      }

      return {
        ...km,
        fleet_commanders: fcs.length > 0 ? fcs : undefined,
      };
    });
  }

  // Enrich victimAsAttacker
  if (enrichedData.victimAsAttacker && Array.isArray(enrichedData.victimAsAttacker)) {
    enrichedData.victimAsAttacker = enrichedData.victimAsAttacker.map((km) => {
      if (!km.attackers || !Array.isArray(km.attackers)) {
        return km;
      }

      const fcs: FCInfo[] = [];
      const fcSet = new Set<number>();

      for (const attackerId of km.attackers) {
        const fcInfo = fcMap.get(String(attackerId));
        if (fcInfo && !fcSet.has(fcInfo.fc_id)) {
          fcs.push(fcInfo);
          fcSet.add(fcInfo.fc_id);
        }
      }

      return {
        ...km,
        fleet_commanders: fcs.length > 0 ? fcs : undefined,
      };
    });
  }

  return enrichedData;
}

/**
 * Fetch proximity data for a killmail from edencom.net API
 *
 * Retrieves related killmails that occurred near the same time/location,
 * and checks if the victim was involved as an attacker in other kills.
 *
 * @param killmailId - Killmail ID
 * @param fcMap - Optional Fleet Commander map for enrichment
 * @returns Proximity data or null if unavailable
 *
 * @example
 * const proximity = await getProximityData(130922515, fcMap);
 * // Returns: {
 * //   sourceKillmail: {...},
 * //   relatedKillmails: [{..., fleet_commanders: [{fc_id, status, rank, main_character_name}]}],
 * //   victimAsAttacker: [{..., fleet_commanders: [...]}],
 * //   timeWindow: {...},
 * //   count: {...}
 * // }
 */
export async function getProximityData(
  killmailId: number,
  fcMap: Map<string, FCInfo> | null = null
): Promise<ProximityData | null> {
  try {
    const url = `https://data.edencom.net/api/killmails-by-proximity?killmailId=${killmailId}`;
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Bombers Bar O-Bomber-care System',
        'Accept-Encoding': 'gzip',
      },
      timeout: 5000, // 5 second timeout to avoid blocking processing
    });

    let proximityData: ProximityData = response.data || null;

    // Enrich with FC info if map provided
    if (proximityData && fcMap) {
      proximityData = enrichProximityWithFCs(proximityData, fcMap);
    }

    return proximityData;
  } catch (error: any) {
    console.warn(`[KILLMAIL] Failed to fetch proximity data for ${killmailId}:`, error.message);
    // Return null on error - proximity data is optional enrichment
    return null;
  }
}

/**
 * Full killmail parsing workflow
 *
 * Extracts killmail ID and hash from text (either EVE in-game kill link or zkillboard URL),
 * fetches from ESI, and returns parsed data ready for SRP validation.
 *
 * Supports two formats:
 * 1. EVE in-game kill link: <url=killReport:ID:HASH>...</url> (preferred - no zkillboard API call needed)
 * 2. Zkillboard URL: https://zkillboard.com/kill/ID/ (requires zkillboard API call to get hash)
 *
 * @param text - Text containing killmail link (e.g., from EVE mail)
 * @returns Parsed killmail data with hash
 *
 * @example
 * const result = await parseKillmailFromText(mailBody);
 * // Returns: {
 * //   hash: "3a06...",
 * //   killmail: {...},
 * //   parsed: { victim_ship_type_id: 624, ... },
 * //   is_polarized: false,
 * //   source: 'killReport'
 * // }
 */
export async function parseKillmailFromText(text: string): Promise<ParseKillmailResult> {
  let killmailId: number;
  let hash: string;
  let source: 'killReport' | 'zkillboard';

  // Try to extract from EVE in-game kill report link first (preferred - includes hash)
  const killReportData = extractKillReportLink(text);
  if (killReportData) {
    killmailId = killReportData.killmailId;
    hash = killReportData.hash;
    source = 'killReport';
    console.log(`[KILLMAIL] Parsed EVE in-game kill link: ${killmailId} (hash from link)`);
  } else {
    // Fall back to zkillboard URL extraction
    const extractedId = extractKillmailId(text);
    if (!extractedId) {
      throw new Error(
        'No killmail link found in text (supported formats: EVE in-game kill link or zkillboard URL)'
      );
    }
    killmailId = extractedId;

    // Get hash from zkillboard API
    hash = await getKillmailHash(killmailId);
    source = 'zkillboard';
    console.log(`[KILLMAIL] Parsed zkillboard URL: ${killmailId} (hash from zkillboard API)`);
  }

  // Get full killmail from ESI
  const killmail = await getKillmailFromESI(killmailId, hash);

  // Parse killmail
  const parsed = parseKillmail(killmail);

  // Store hash in parsed data for later reference
  parsed.hash = hash;

  // Check for polarized weapons
  const polarizedResult = hasPolarizedWeapons(parsed.items);

  return {
    hash,
    killmail,
    parsed,
    is_polarized: polarizedResult.is_polarized,
    polarized_count: polarizedResult.count,
    polarized_warning: polarizedResult.warning,
    source,
  };
}
