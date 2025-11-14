/**
 * @fileoverview Killmail Enrichment Service
 *
 * Enriches killmail data by fetching from zkillboard and ESI APIs.
 * Uses existing parser utilities and adds fleet-specific enrichment.
 *
 * @module lib/killmail/enrichment
 */

const axios = require('axios');
const { getKillmailHash, getKillmailFromESI } = require('./parser');
const { getTypeInfo, resolveNames } = require('../esi/universe');

/**
 * Fetch zkillboard data for a killmail
 *
 * @param {number} killmailId - Killmail ID
 * @returns {Promise<Object>} zkillboard data
 * @property {string} hash - Killmail hash
 * @property {Object} zkb - zkillboard metadata
 *
 * @example
 * const zkbData = await fetchZkillData(131196380);
 * // Returns: {
 * //   hash: "81e1faaee849...",
 * //   zkb: { locationID, totalValue, droppedValue, ... }
 * // }
 */
async function fetchZkillData(killmailId) {
  try {
    const url = `https://zkillboard.com/api/killID/${killmailId}/`;
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Bombers Bar Fleet Management System',
        'Accept-Encoding': 'gzip'
      },
      timeout: 10000 // 10 second timeout
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
      zkb: data.zkb
    };
  } catch (error) {
    console.error('[KILLMAIL ENRICHMENT] Error fetching from zkillboard:', error.message);
    throw new Error(`Failed to fetch zkillboard data: ${error.message}`);
  }
}

/**
 * Extract dropped items from ESI killmail
 *
 * @param {Object} killmail - Full killmail from ESI
 * @returns {Array} Array of dropped items
 *
 * @example
 * const droppedItems = extractDroppedItems(killmail);
 * // Returns: [
 * //   { item_type_id: 3841, quantity_dropped: 1, flag: 19 },
 * //   { item_type_id: 35657, quantity_dropped: 1, flag: 21 }
 * // ]
 */
function extractDroppedItems(killmail) {
  if (!killmail.victim || !killmail.victim.items) {
    return [];
  }

  return killmail.victim.items
    .filter(item => item.quantity_dropped && item.quantity_dropped > 0)
    .map(item => ({
      item_type_id: item.item_type_id,
      quantity_dropped: item.quantity_dropped,
      flag: item.flag
    }));
}

/**
 * Calculate total loot value from dropped items
 *
 * @param {Array} droppedItems - Array of dropped items
 * @returns {Promise<number>} Total ISK value of dropped loot
 */
async function calculateLootValue(droppedItems) {
  // For now, we rely on zkillboard's droppedValue
  // Future enhancement: fetch market prices and calculate ourselves
  return 0;
}

/**
 * Enrich a single killmail with data from zkillboard and ESI
 *
 * @param {number} killmailId - Killmail ID
 * @returns {Promise<Object>} Enriched killmail data
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
async function enrichKillmail(killmailId) {
  try {
    console.log(`[KILLMAIL ENRICHMENT] Enriching killmail ${killmailId}...`);

    // Step 1: Fetch zkillboard data
    const zkbData = await fetchZkillData(killmailId);

    // Step 2: Fetch ESI killmail
    const killmail = await getKillmailFromESI(killmailId, zkbData.hash);

    // Step 3: Extract dropped items
    const droppedItems = extractDroppedItems(killmail);

    // Step 4: Resolve all IDs to names in bulk
    const idsToResolve = [];

    // Add character, corp, alliance IDs
    if (killmail.victim.character_id) idsToResolve.push(killmail.victim.character_id);
    if (killmail.victim.corporation_id) idsToResolve.push(killmail.victim.corporation_id);
    if (killmail.victim.alliance_id) idsToResolve.push(killmail.victim.alliance_id);

    // Add ship type ID
    idsToResolve.push(killmail.victim.ship_type_id);

    // Add item type IDs from dropped items
    droppedItems.forEach(item => {
      if (item.item_type_id && !idsToResolve.includes(item.item_type_id)) {
        idsToResolve.push(item.item_type_id);
      }
    });

    // Resolve all names in one bulk call
    let nameMap = {};
    try {
      const resolvedNames = await resolveNames(idsToResolve);
      resolvedNames.forEach(item => {
        nameMap[item.id] = item.name;
      });
    } catch (error) {
      console.warn(`[KILLMAIL ENRICHMENT] Failed to resolve names:`, error.message);
    }

    // Step 5: Enrich dropped items with names
    const enrichedDroppedItems = droppedItems.map(item => ({
      ...item,
      item_name: nameMap[item.item_type_id] || null
    }));

    // Step 6: Compile enriched data
    const enrichedData = {
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
      enrichment_error: null
    };

    console.log(`[KILLMAIL ENRICHMENT] Successfully enriched killmail ${killmailId}`);
    return enrichedData;

  } catch (error) {
    console.error(`[KILLMAIL ENRICHMENT] Failed to enrich killmail ${killmailId}:`, error.message);

    return {
      killmail_id: killmailId,
      enriched_at: new Date(),
      enrichment_error: error.message
    };
  }
}

/**
 * Enrich multiple killmails in batch
 *
 * @param {Array<number>} killmailIds - Array of killmail IDs
 * @param {number} delayMs - Delay between requests (to avoid rate limiting)
 * @returns {Promise<Array>} Array of enriched killmail data
 */
async function enrichKillmailsBatch(killmailIds, delayMs = 1000) {
  const results = [];

  for (const killmailId of killmailIds) {
    try {
      const enriched = await enrichKillmail(killmailId);
      results.push(enriched);

      // Delay to avoid rate limiting
      if (delayMs > 0 && killmailIds.indexOf(killmailId) < killmailIds.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    } catch (error) {
      results.push({
        killmail_id: killmailId,
        enriched_at: new Date(),
        enrichment_error: error.message
      });
    }
  }

  return results;
}

module.exports = {
  fetchZkillData,
  extractDroppedItems,
  calculateLootValue,
  enrichKillmail,
  enrichKillmailsBatch
};
