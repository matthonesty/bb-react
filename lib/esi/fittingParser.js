/**
 * @fileoverview EVE Online Fitting Parser
 * Parses EVE's native fitting format and categorizes modules by slot type
 *
 * @module lib/esi/fittingParser
 */

const ESI_BASE_URL = 'https://esi.evetech.net/latest';

// Dogma effect IDs for slot types
const DOGMA_EFFECTS = {
  HIGH_SLOT: 12,     // hiPower
  MID_SLOT: 13,      // medPower
  LOW_SLOT: 11,      // loPower
  RIG_SLOT: 2663,    // rigSlot
  SUB_SYSTEM: 3772   // subSystem (for T3 cruisers)
};

// Cache for item dogma effects (to reduce ESI calls)
const itemEffectsCache = new Map();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Parse EVE fitting URL format
 * Format: <url=fitting:12032:5299;1:31592;1:380;1:...>Fit Name</url>
 * @param {string} fittingText - Full fitting text including URL tags
 * @returns {Object} Parsed fitting data
 */
function parseFittingURL(fittingText) {
  // Extract fitting data from URL tag
  const urlMatch = fittingText.match(/<url=fitting:([^>]+)>([^<]+)<\/url>/);

  if (!urlMatch) {
    throw new Error('Invalid fitting format. Expected EVE fitting URL format.');
  }

  const fittingData = urlMatch[1];
  const fittingName = urlMatch[2];

  // Split fitting data into parts
  const parts = fittingData.split(':');

  if (parts.length < 2) {
    throw new Error('Invalid fitting data structure');
  }

  const shipTypeId = parseInt(parts[0]);

  if (isNaN(shipTypeId)) {
    throw new Error('Invalid ship type ID');
  }

  // Parse modules (format: typeId;quantity)
  const modules = [];
  for (let i = 1; i < parts.length; i++) {
    if (!parts[i] || parts[i] === '_') continue; // Skip empty slots

    const [typeIdStr, quantityStr] = parts[i].split(';');
    const typeId = parseInt(typeIdStr);
    const quantity = parseInt(quantityStr) || 1;

    if (!isNaN(typeId) && typeId > 0) {
      modules.push({ type_id: typeId, quantity });
    }
  }

  return {
    ship_type_id: shipTypeId,
    name: fittingName,
    modules
  };
}

/**
 * Parse EVE fitting from various formats
 * Supports: URL format, EFT format, or simple module list
 * @param {string} fittingText - Fitting text
 * @returns {Object} Parsed fitting
 */
function parseFitting(fittingText) {
  // Try URL format first
  if (fittingText.includes('<url=fitting:')) {
    return parseFittingURL(fittingText);
  }

  // Try EFT format (future enhancement)
  // [Ship Name, Fitting Name]
  // Module Name
  // ...

  throw new Error('Unsupported fitting format. Please use EVE in-game fitting link.');
}

/**
 * Get dogma effects for an item type
 * @param {number} typeId - Item type ID
 * @returns {Promise<Array>} Array of effect objects
 */
async function getItemEffects(typeId) {
  // Check cache
  const cached = itemEffectsCache.get(typeId);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.effects;
  }

  try {
    const response = await fetch(`${ESI_BASE_URL}/universe/types/${typeId}/`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Bombers Bar Fleet Composition Manager'
      }
    });

    if (!response.ok) {
      throw new Error(`ESI returned ${response.status}`);
    }

    const data = await response.json();
    const effects = data.dogma_effects || [];

    // Cache the result
    itemEffectsCache.set(typeId, {
      effects,
      timestamp: Date.now(),
      name: data.name
    });

    return effects;

  } catch (error) {
    console.error(`Error fetching effects for type ${typeId}:`, error);
    return [];
  }
}

/**
 * Determine which slot type a module fits into
 * @param {number} typeId - Module type ID
 * @returns {Promise<string>} Slot type: 'high', 'mid', 'low', 'rig', 'subsystem', or 'cargo'
 */
async function determineSlotType(typeId) {
  const effects = await getItemEffects(typeId);
  const effectIds = effects.map(e => e.effect_id);

  if (effectIds.includes(DOGMA_EFFECTS.HIGH_SLOT)) return 'high';
  if (effectIds.includes(DOGMA_EFFECTS.MID_SLOT)) return 'mid';
  if (effectIds.includes(DOGMA_EFFECTS.LOW_SLOT)) return 'low';
  if (effectIds.includes(DOGMA_EFFECTS.RIG_SLOT)) return 'rig';
  if (effectIds.includes(DOGMA_EFFECTS.SUB_SYSTEM)) return 'subsystem';

  // If no slot effect found, assume it's cargo (ammo, charges, etc.)
  return 'cargo';
}

/**
 * Categorize modules into slot types
 * @param {Array} modules - Array of {type_id, quantity}
 * @returns {Promise<Object>} Categorized modules
 */
async function categorizeModules(modules) {
  const categorized = {
    high: [],
    mid: [],
    low: [],
    rig: [],
    subsystem: [],
    cargo: []
  };

  const itemNames = new Map(); // Cache names

  for (const module of modules) {
    const slotType = await determineSlotType(module.type_id);

    // Get cached name if available
    const cached = itemEffectsCache.get(module.type_id);
    const name = cached ? cached.name : `Type ${module.type_id}`;

    const moduleData = {
      type_id: module.type_id,
      name,
      quantity: module.quantity
    };

    // For fitted modules (high/mid/low/rig/subsystem), expand quantity into individual slots
    // For cargo items, keep as single entry with quantity
    if (slotType === 'cargo') {
      categorized[slotType].push(moduleData);
    } else {
      // Expand into individual slot entries
      for (let i = 0; i < module.quantity; i++) {
        categorized[slotType].push({
          type_id: module.type_id,
          name,
          quantity: 1 // Each slot gets quantity 1
        });
      }
    }
  }

  return categorized;
}

/**
 * Parse and categorize a complete fitting
 * @param {string} fittingText - EVE fitting text
 * @returns {Promise<Object>} Complete fitting with categorized modules
 */
async function parseAndCategorizeFitting(fittingText) {
  // Parse the fitting format
  const parsed = parseFitting(fittingText);

  // Categorize modules by slot type
  const categorized = await categorizeModules(parsed.modules);

  return {
    ship_type_id: parsed.ship_type_id,
    name: parsed.name,
    high_slot_modules: categorized.high,
    mid_slot_modules: categorized.mid,
    low_slot_modules: categorized.low,
    rig_modules: categorized.rig,
    subsystem_modules: categorized.subsystem,
    cargo_items: categorized.cargo
  };
}

/**
 * Convert categorized fitting to JSONB format for database
 * Pads arrays to match ship's slot counts and converts to fixed-length arrays
 * @param {Object} categorized - Categorized modules
 * @param {Object} shipSpecs - Ship specifications (slot counts)
 * @returns {Object} JSONB-ready fitting data
 */
function formatForDatabase(categorized, shipSpecs) {
  const padArray = (arr, length) => {
    const padded = [...arr];
    while (padded.length < length) {
      padded.push(null);
    }
    return padded.slice(0, length); // Ensure exact length
  };

  return {
    high_slot_modules: padArray(categorized.high_slot_modules || [], shipSpecs.high_slots || 8),
    mid_slot_modules: padArray(categorized.mid_slot_modules || [], shipSpecs.mid_slots || 8),
    low_slot_modules: padArray(categorized.low_slot_modules || [], shipSpecs.low_slots || 8),
    rig_modules: padArray(categorized.rig_modules || [], shipSpecs.rig_slots || 3),
    cargo_items: categorized.cargo_items || []
  };
}

/**
 * Generate EVE fitting link from doctrine data
 * @param {Object} doctrine - Doctrine with modules
 * @returns {string} EVE fitting URL format
 */
function generateFittingLink(doctrine) {
  const parts = [doctrine.ship_type_id];

  // Helper to add modules
  const addModules = (modules) => {
    if (!modules) return;
    modules.forEach(mod => {
      if (mod && mod.type_id) {
        parts.push(`${mod.type_id};${mod.quantity || 1}`);
      } else {
        parts.push('_'); // Empty slot
      }
    });
  };

  // Add in order: high, mid, low, rigs, cargo
  addModules(doctrine.high_slot_modules);
  addModules(doctrine.mid_slot_modules);
  addModules(doctrine.low_slot_modules);
  addModules(doctrine.rig_modules);
  addModules(doctrine.cargo_items);

  const fittingData = parts.join(':');
  return `<url=fitting:${fittingData}>${doctrine.name}</url>`;
}

/**
 * Clear the effects cache (useful for testing)
 */
function clearCache() {
  itemEffectsCache.clear();
}

module.exports = {
  parseFitting,
  parseFittingURL,
  parseAndCategorizeFitting,
  categorizeModules,
  determineSlotType,
  formatForDatabase,
  generateFittingLink,
  clearCache,
  DOGMA_EFFECTS
};
