/**
 * @fileoverview ESI Ship Information Utility
 * Fetches and caches ship specifications from EVE ESI API
 *
 * @module lib/esi/shipInfo
 */

const ESI_BASE_URL = 'https://esi.evetech.net/latest';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// In-memory cache for ship info (in production, consider Redis)
const shipInfoCache = new Map();

// Dogma attribute mappings
const DOGMA_ATTRIBUTES = {
  LOW_SLOTS: 12,
  MID_SLOTS: 13,
  HIGH_SLOTS: 14,
  CARGO_CAPACITY: 38,
  LAUNCHER_HARDPOINTS: 101,
  TURRET_HARDPOINTS: 102,
  RIG_SLOTS: 1137,
  RIG_SLOTS_ALT: 1154  // Alternative rig slots attribute
};

/**
 * Fetch ship type information from ESI
 * @param {number} typeId - EVE type ID
 * @returns {Promise<Object>} Ship information
 */
async function getShipInfo(typeId) {
  // Check cache first
  const cached = shipInfoCache.get(typeId);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  try {
    const response = await fetch(`${ESI_BASE_URL}/universe/types/${typeId}/`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Bombers Bar Fleet Composition Manager'
      }
    });

    if (!response.ok) {
      throw new Error(`ESI returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data) {
      throw new Error('ESI returned empty response for ship info');
    }

    // Parse ship specifications
    const shipInfo = parseShipInfo(data);

    // Cache the result
    shipInfoCache.set(typeId, {
      data: shipInfo,
      timestamp: Date.now()
    });

    return shipInfo;

  } catch (error) {
    console.error(`Error fetching ship info for type ${typeId}:`, error);
    throw error;
  }
}

/**
 * Parse ship information from ESI response
 * @param {Object} esiData - Raw ESI data
 * @returns {Object} Parsed ship info
 */
function parseShipInfo(esiData) {
  const dogmaAttrs = esiData.dogma_attributes || [];

  // Extract slot counts from dogma attributes
  const getAttribute = (attrId) => {
    const attr = dogmaAttrs.find(a => a.attribute_id === attrId);
    return attr ? Math.floor(attr.value) : 0;
  };

  return {
    type_id: esiData.type_id,
    name: esiData.name,
    description: esiData.description || '',
    group_id: esiData.group_id,
    mass: esiData.mass || 0,
    volume: esiData.volume || 0,
    capacity: esiData.capacity || 0,
    published: esiData.published || false,

    // Slot specifications
    high_slots: getAttribute(DOGMA_ATTRIBUTES.HIGH_SLOTS),
    mid_slots: getAttribute(DOGMA_ATTRIBUTES.MID_SLOTS),
    low_slots: getAttribute(DOGMA_ATTRIBUTES.LOW_SLOTS),
    rig_slots: getAttribute(DOGMA_ATTRIBUTES.RIG_SLOTS) || getAttribute(DOGMA_ATTRIBUTES.RIG_SLOTS_ALT),
    launcher_hardpoints: getAttribute(DOGMA_ATTRIBUTES.LAUNCHER_HARDPOINTS),
    turret_hardpoints: getAttribute(DOGMA_ATTRIBUTES.TURRET_HARDPOINTS),
    cargo_capacity: getAttribute(DOGMA_ATTRIBUTES.CARGO_CAPACITY),

    // Raw dogma for advanced usage
    dogma_attributes: dogmaAttrs,
    dogma_effects: esiData.dogma_effects || []
  };
}

/**
 * Fetch group information from ESI
 * @param {number} groupId - EVE group ID
 * @returns {Promise<Object>} Group information
 */
async function getGroupInfo(groupId) {
  try {
    const response = await fetch(`${ESI_BASE_URL}/universe/groups/${groupId}/`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Bombers Bar Fleet Composition Manager'
      }
    });

    if (!response.ok) {
      throw new Error(`ESI returned ${response.status}`);
    }

    const data = await response.json();

    if (!data) {
      throw new Error('ESI returned empty response for group info');
    }

    return data;

  } catch (error) {
    console.error(`Error fetching group info for ${groupId}:`, error);
    return { name: 'Unknown Group', group_id: groupId };
  }
}

/**
 * Search for ships by name
 * @param {string} query - Search query
 * @param {string} category - Optional category filter (e.g., 'ship')
 * @returns {Promise<Array>} Search results
 */
async function searchShips(query, category = 'inventory_type') {
  if (!query || query.length < 3) {
    return [];
  }

  try {
    const response = await fetch(
      `${ESI_BASE_URL}/search/?categories=${category}&search=${encodeURIComponent(query)}&strict=false`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Bombers Bar Fleet Composition Manager'
        }
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return []; // No results found
      }
      throw new Error(`ESI returned ${response.status}`);
    }

    const data = await response.json();

    if (!data) {
      return [];
    }

    return data.inventory_type || [];

  } catch (error) {
    console.error('Error searching ships:', error);
    return [];
  }
}

/**
 * Get detailed info for multiple type IDs
 * @param {Array<number>} typeIds - Array of type IDs
 * @returns {Promise<Array>} Array of ship info objects
 */
async function getMultipleShipInfo(typeIds) {
  const promises = typeIds.map(id => getShipInfo(id).catch(err => {
    console.error(`Failed to fetch ship ${id}:`, err);
    return null;
  }));

  const results = await Promise.all(promises);
  return results.filter(r => r !== null);
}

/**
 * Clear the ship info cache (useful for testing/maintenance)
 */
function clearCache() {
  shipInfoCache.clear();
}

/**
 * Get cache statistics
 */
function getCacheStats() {
  return {
    size: shipInfoCache.size,
    entries: Array.from(shipInfoCache.keys())
  };
}

module.exports = {
  getShipInfo,
  getGroupInfo,
  searchShips,
  getMultipleShipInfo,
  clearCache,
  getCacheStats,
  DOGMA_ATTRIBUTES
};
