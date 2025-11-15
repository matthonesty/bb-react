/**
 * @fileoverview EVE ESI Universe Service
 *
 * Fetches universe data (types, names, stations, etc.) from EVE ESI API.
 *
 * ESI Endpoints:
 * - POST /universe/names (IDs to names - bulk)
 * - POST /universe/ids (names to IDs - bulk)
 * - GET /universe/types/{type_id}
 * - GET /universe/stations/{station_id}
 * - GET /universe/structures/{structure_id}
 *
 * @see {@link https://esi.evetech.net/ui/#/Universe}
 */

import { ESI_BASE_URL, esiGet, esiPost } from './helpers.js';

/**
 * Get type information including group name
 *
 * Fetches type details and group details from ESI API.
 * Used for ship type lookup in admin management UI.
 *
 * @param {number} typeId - EVE type ID
 * @returns {Promise<Object>} Type and group info
 *
 * @example
 * const typeInfo = await getTypeInfo(33476);
 * // Returns: {
 * //   type_id: 33476,
 * //   type_name: "Mobile Cynosural Inhibitor",
 * //   group_id: 1249,
 * //   group_name: "Mobile Cyno Inhibitor"
 * // }
 */
async function getTypeInfo(typeId) {
  // Get type details
  const typeInfo = await esiGet(
    `${ESI_BASE_URL}/universe/types/${typeId}`
  );

  // Get group name
  const groupInfo = await esiGet(
    `${ESI_BASE_URL}/universe/groups/${typeInfo.group_id}`
  );

  return {
    type_id: typeId,
    type_name: typeInfo.name,
    group_id: typeInfo.group_id,
    group_name: groupInfo.name
  };
}

/**
 * Resolve IDs to names in bulk
 *
 * Resolves IDs to their names. Automatically chunks into multiple requests
 * if more than 1000 IDs (ESI limit per request).
 * Supports: agents, alliances, characters, constellations, corporations,
 * factions, inventory_types, regions, stations, systems
 *
 * @param {number[]} ids - Array of IDs to resolve (any amount)
 * @returns {Promise<Object[]>} Array of {id, name, category} objects
 *
 * @example
 * const names = await resolveNames([90504880, 98815119, 34]);
 * // Returns: [
 * //   { id: 90504880, name: "Karaff Tuborg", category: "character" },
 * //   { id: 98815119, name: "ECTrade", category: "corporation" },
 * //   { id: 34, name: "Tritanium", category: "inventory_type" }
 * // ]
 */
async function resolveNames(ids) {
  if (!ids || ids.length === 0) {
    return [];
  }

  const url = `${ESI_BASE_URL}/universe/names`;
  const CHUNK_SIZE = 1000; // ESI limit per request

  // If under limit, single request
  if (ids.length <= CHUNK_SIZE) {
    return await esiPost(url, ids, null);
  }

  // Over limit - chunk into multiple requests
  console.log(`[ESI] Resolving ${ids.length} IDs in ${Math.ceil(ids.length / CHUNK_SIZE)} chunks`);

  const allResults = [];
  for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
    const chunk = ids.slice(i, i + CHUNK_SIZE);
    const chunkResults = await esiPost(url, chunk, null);
    allResults.push(...chunkResults);
  }

  return allResults;
}

/**
 * Resolve names to IDs in bulk
 *
 * Resolves names to their IDs. Automatically chunks into multiple requests
 * if more than 500 names (ESI limit per request).
 * Only exact matches are returned.
 *
 * @param {string[]} names - Array of names to resolve (any amount)
 * @returns {Promise<Object>} Object with categories containing matched names/IDs
 *
 * @example
 * const ids = await resolveIds(["Karaff Tuborg", "ECTrade"]);
 * // Returns: {
 * //   characters: [{ id: 90504880, name: "Karaff Tuborg" }],
 * //   corporations: [{ id: 98815119, name: "ECTrade" }]
 * // }
 */
async function resolveIds(names) {
  if (!names || names.length === 0) {
    return {};
  }

  const url = `${ESI_BASE_URL}/universe/ids`;
  const CHUNK_SIZE = 500; // ESI limit per request

  // If under limit, single request
  if (names.length <= CHUNK_SIZE) {
    return await esiPost(url, names, null);
  }

  // Over limit - chunk into multiple requests and merge results
  console.log(`[ESI] Resolving ${names.length} names in ${Math.ceil(names.length / CHUNK_SIZE)} chunks`);

  const mergedResults = {};
  for (let i = 0; i < names.length; i += CHUNK_SIZE) {
    const chunk = names.slice(i, i + CHUNK_SIZE);
    const chunkResults = await esiPost(url, chunk, null);

    // Merge results from each chunk (categories like characters, corporations, etc.)
    for (const [category, items] of Object.entries(chunkResults)) {
      if (!mergedResults[category]) {
        mergedResults[category] = [];
      }
      mergedResults[category].push(...items);
    }
  }

  return mergedResults;
}

export {
  resolveNames,
  resolveIds,
  getTypeInfo
};
