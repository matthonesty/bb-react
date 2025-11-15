/**
 * @fileoverview Killmail Enrichment Service
 *
 * Enriches killmail data by fetching from zkillboard and ESI APIs.
 * Uses existing parser utilities and adds fleet-specific enrichment.
 *
 * @module lib/killmail/enrichment
 */

import axios from 'axios';
import { getKillmailFromESI } from './parser';
import { resolveNames } from '../esi';

export interface ZkbData {
  hash: string;
  zkb: {
    locationID?: number;
    totalValue?: number;
    fittedValue?: number;
    droppedValue?: number;
    destroyedValue?: number;
    points?: number;
    npc?: boolean;
    solo?: boolean;
    awox?: boolean;
  };
}

export interface DroppedItem {
  item_type_id: number;
  quantity_dropped: number;
  flag: number;
}

export interface EnrichedDroppedItem extends DroppedItem {
  item_name: string | null;
}

export interface EnrichedKillmailData {
  killmail_id: number;
  killmail_hash?: string;
  zkb_location_id?: number | null;
  zkb_total_value?: number;
  zkb_fitted_value?: number;
  zkb_dropped_value?: number;
  zkb_destroyed_value?: number;
  kill_time?: string;
  solar_system_id?: number;
  victim_character_id?: number | null;
  victim_character_name?: string | null;
  victim_corporation_id?: number | null;
  victim_corporation_name?: string | null;
  victim_alliance_id?: number | null;
  victim_alliance_name?: string | null;
  victim_ship_type_id?: number;
  victim_ship_name?: string | null;
  dropped_items?: EnrichedDroppedItem[] | null;
  enriched_at: Date;
  enrichment_error: string | null;
}

/**
 * Fetch zkillboard data for a killmail
 *
 * @param killmailId - Killmail ID
 * @returns zkillboard data
 *
 * @example
 * const zkbData = await fetchZkillData(131196380);
 * // Returns: {
 * //   hash: "81e1faaee849...",
 * //   zkb: { locationID, totalValue, droppedValue, ... }
 * // }
 */
export async function fetchZkillData(killmailId: number): Promise<ZkbData> {
  try {
    const url = `https://zkillboard.com/api/killID/${killmailId}/`;
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Bombers Bar Fleet Management System',
        'Accept-Encoding': 'gzip',
      },
      timeout: 10000, // 10 second timeout
    });

    if (!response.data || !response.data[0]) {
      throw new Error('Invalid zkillboard response format');
    }

    const data = response.data[0];

    if (!data.zkb || !data.zkb.hash) {
      throw new Error('No zkillboard data found');
    }

    return {
      hash: data.zkb.hash,
      zkb: data.zkb,
    };
  } catch (error: any) {
    console.error('[KILLMAIL ENRICHMENT] Error fetching from zkillboard:', error.message);
    throw new Error(`Failed to fetch zkillboard data: ${error.message}`);
  }
}

/**
 * Extract dropped items from ESI killmail
 *
 * @param killmail - Full killmail from ESI
 * @returns Array of dropped items
 *
 * @example
 * const droppedItems = extractDroppedItems(killmail);
 * // Returns: [
 * //   { item_type_id: 3841, quantity_dropped: 1, flag: 19 },
 * //   { item_type_id: 35657, quantity_dropped: 1, flag: 21 }
 * // ]
 */
export function extractDroppedItems(killmail: any): DroppedItem[] {
  if (!killmail.victim || !killmail.victim.items) {
    return [];
  }

  return killmail.victim.items
    .filter((item: any) => item.quantity_dropped && item.quantity_dropped > 0)
    .map((item: any) => ({
      item_type_id: item.item_type_id,
      quantity_dropped: item.quantity_dropped,
      flag: item.flag,
    }));
}

/**
 * Calculate total loot value from dropped items
 *
 * @returns Total ISK value of dropped loot
 */
export async function calculateLootValue(): Promise<number> {
  // For now, we rely on zkillboard's droppedValue
  // Future enhancement: fetch market prices and calculate ourselves
  return 0;
}

/**
 * Enrich a single killmail with data from zkillboard and ESI
 *
 * @param killmailId - Killmail ID
 * @returns Enriched killmail data
 *
 * @example
 * const enriched = await enrichKillmail(131196380);
 * // Returns: {
 * //   killmail_id: 131196380,
 * //   killmail_hash: "81e1faaee849...",
 * //   zkb_location_id: 50009416,
 * //   zkb_total_value: 209665300,
 * //   zkb_fitted_value: 209338639,
 * //   zkb_dropped_value: 5942072,
 * //   zkb_destroyed_value: 203723227,
 * //   zkb_points: 9,
 * //   zkb_npc: false,
 * //   zkb_solo: false,
 * //   zkb_awox: false,
 * //   kill_time: "2025-11-13T15:09:15Z",
 * //   solar_system_id: 30001446,
 * //   victim_character_id: 2115760932,
 * //   victim_corporation_id: 98598862,
 * //   victim_alliance_id: 99003581,
 * //   victim_ship_type_id: 11969,
 * //   victim_ship_name: "Confessor",
 * //   dropped_items: [{item_type_id, quantity_dropped, flag}, ...],
 * //   enriched_at: Date
 * // }
 */
export async function enrichKillmail(killmailId: number): Promise<EnrichedKillmailData> {
  try {
    console.log(`[KILLMAIL ENRICHMENT] Enriching killmail ${killmailId}...`);

    // Step 1: Fetch zkillboard data
    const zkbData = await fetchZkillData(killmailId);

    // Step 2: Fetch ESI killmail
    const killmail = await getKillmailFromESI(killmailId, zkbData.hash);

    // Step 3: Extract dropped items
    const droppedItems = extractDroppedItems(killmail);

    // Step 4: Resolve all IDs to names in bulk
    const idsToResolve: number[] = [];

    // Add character, corp, alliance IDs
    if (killmail.victim.character_id) idsToResolve.push(killmail.victim.character_id);
    if (killmail.victim.corporation_id) idsToResolve.push(killmail.victim.corporation_id);
    if (killmail.victim.alliance_id) idsToResolve.push(killmail.victim.alliance_id);

    // Add ship type ID
    idsToResolve.push(killmail.victim.ship_type_id);

    // Add item type IDs from dropped items
    droppedItems.forEach((item) => {
      if (item.item_type_id && !idsToResolve.includes(item.item_type_id)) {
        idsToResolve.push(item.item_type_id);
      }
    });

    // Resolve all names in one bulk call
    const nameMap: Record<number, string> = {};
    try {
      const resolvedNames = (await resolveNames(idsToResolve)) as Array<{ id: number; name: string }>;
      resolvedNames.forEach((item) => {
        nameMap[item.id] = item.name;
      });
    } catch (error: any) {
      console.warn(`[KILLMAIL ENRICHMENT] Failed to resolve names:`, error.message);
    }

    // Step 5: Enrich dropped items with names
    const enrichedDroppedItems: EnrichedDroppedItem[] = droppedItems.map((item) => ({
      ...item,
      item_name: nameMap[item.item_type_id] || null,
    }));

    // Step 6: Compile enriched data
    const enrichedData: EnrichedKillmailData = {
      killmail_id: killmailId,
      killmail_hash: zkbData.hash,

      // zkillboard data
      zkb_location_id: zkbData.zkb.locationID || null,
      zkb_total_value: Math.round(zkbData.zkb.totalValue || 0),
      zkb_fitted_value: Math.round(zkbData.zkb.fittedValue || 0),
      zkb_dropped_value: Math.round(zkbData.zkb.droppedValue || 0),
      zkb_destroyed_value: Math.round(zkbData.zkb.destroyedValue || 0),

      // ESI killmail data with resolved names
      kill_time: killmail.killmail_time,
      solar_system_id: killmail.solar_system_id,
      victim_character_id: killmail.victim.character_id || null,
      victim_character_name: nameMap[killmail.victim.character_id] || null,
      victim_corporation_id: killmail.victim.corporation_id || null,
      victim_corporation_name: nameMap[killmail.victim.corporation_id] || null,
      victim_alliance_id: killmail.victim.alliance_id || null,
      victim_alliance_name: nameMap[killmail.victim.alliance_id] || null,
      victim_ship_type_id: killmail.victim.ship_type_id,
      victim_ship_name: nameMap[killmail.victim.ship_type_id] || null,

      // Dropped items with names for loot calculation
      dropped_items: enrichedDroppedItems.length > 0 ? enrichedDroppedItems : null,

      // Enrichment metadata
      enriched_at: new Date(),
      enrichment_error: null,
    };

    console.log(`[KILLMAIL ENRICHMENT] Successfully enriched killmail ${killmailId}`);
    return enrichedData;
  } catch (error: any) {
    console.error(`[KILLMAIL ENRICHMENT] Failed to enrich killmail ${killmailId}:`, error.message);

    return {
      killmail_id: killmailId,
      enriched_at: new Date(),
      enrichment_error: error.message,
    };
  }
}

/**
 * Enrich multiple killmails in batch
 *
 * @param killmailIds - Array of killmail IDs
 * @param delayMs - Delay between requests (to avoid rate limiting)
 * @returns Array of enriched killmail data
 */
export async function enrichKillmailsBatch(
  killmailIds: number[],
  delayMs = 1000
): Promise<EnrichedKillmailData[]> {
  const results: EnrichedKillmailData[] = [];

  for (const killmailId of killmailIds) {
    try {
      const enriched = await enrichKillmail(killmailId);
      results.push(enriched);

      // Delay to avoid rate limiting
      if (delayMs > 0 && killmailIds.indexOf(killmailId) < killmailIds.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    } catch (error: any) {
      results.push({
        killmail_id: killmailId,
        enriched_at: new Date(),
        enrichment_error: error.message,
      });
    }
  }

  return results;
}
