/**
 * @fileoverview Role-Based Access Control (RBAC) for EVE SSO Authentication
 *
 * Implements role assignment and verification for authenticated users.
 *
 * Role Assignment:
 * - user: Default role for all authenticated users
 * - admin: Hardcoded in ADMIN_CHARACTER_IDS env var (for security/bootstrap)
 * - moderator: Managed via database (not hardcoded)
 *
 * Security:
 * - Admin character IDs are hardcoded in environment for security
 * - Other roles (moderator, custom roles) should be managed via database
 * - Roles are assigned server-side only (not in JWT or client-visible)
 * - Admin checks happen on every request (no caching)
 *
 * @see {@link ./middleware.js} for authentication implementation
 */

/**
 * Available user roles
 * @enum {string}
 */
const ROLES = {
  USER: 'user',
  ADMIN: 'admin',           // ENV-controlled only
  COUNCIL: 'Council',       // Database-managed via fleet_commanders
  ACCOUNTANT: 'Accountant', // Database-managed via fleet_commanders
  OBOMBERCARE: 'OBomberCare', // Database-managed via fleet_commanders
  FC: 'FC',                 // Database-managed via fleet_commanders
  ELECTION_OFFICER: 'Election Officer' // Database-managed via fleet_commanders (manual SQL only)
};

/**
 * Get list of admin character IDs from environment
 *
 * Checks both ADMIN_CHARACTER_ID (singular) and ADMIN_CHARACTER_IDS (plural).
 * Supports both formats for flexibility.
 *
 * @returns {number[]} Array of admin character IDs
 * @private
 *
 * @example
 * // .env file option 1 (single admin):
 * // ADMIN_CHARACTER_ID=12345
 * // Returns: [12345]
 *
 * @example
 * // .env file option 2 (multiple admins):
 * // ADMIN_CHARACTER_IDS=12345,67890,11111
 * // Returns: [12345, 67890, 11111]
 */
function getAdminCharacterIds() {
  const adminIds = [];

  // Check for single admin ID
  const singleAdminId = process.env.ADMIN_CHARACTER_ID;
  if (singleAdminId) {
    const parsed = parseInt(singleAdminId, 10);
    if (!isNaN(parsed)) {
      adminIds.push(parsed);
    }
  }

  // Check for multiple admin IDs
  const multipleAdminIds = process.env.ADMIN_CHARACTER_IDS || '';
  if (multipleAdminIds.trim()) {
    const parsed = multipleAdminIds
      .split(',')
      .map(id => id.trim())
      .filter(id => id.length > 0)
      .map(id => parseInt(id, 10))
      .filter(id => !isNaN(id));

    adminIds.push(...parsed);
  }

  // Remove duplicates
  return [...new Set(adminIds)];
}

/**
 * Check if character ID is an admin
 *
 * Compares character ID against configured admin list.
 * Admin IDs are read from ADMIN_CHARACTER_IDS environment variable.
 *
 * @param {number} characterId - EVE character ID to check
 * @returns {boolean} True if character is an admin
 *
 * @example
 * // .env: ADMIN_CHARACTER_IDS=12345,67890
 * isAdmin(12345) // Returns: true
 * isAdmin(99999) // Returns: false
 */
function isAdmin(characterId) {
  const adminIds = getAdminCharacterIds();
  const numericId = typeof characterId === 'string' ? parseInt(characterId, 10) : characterId;
  return adminIds.includes(numericId);
}


/**
 * Get FC access level from database
 *
 * Queries the fleet_commanders table to get the access_level for a character.
 * Checks both main_character_id and bb_corp_alt_id.
 *
 * @param {number} characterId - EVE character ID
 * @returns {Promise<string|null>} Access level (Council, Accountant, OBomberCare, FC) or null
 * @private
 */
async function getFCAccessLevel(characterId) {
  try {
    const Database = require('../../src/database');
    const db = await Database.getInstance();

    const result = await db.query(
      `SELECT access_level
       FROM fleet_commanders
       WHERE (main_character_id = $1 OR bb_corp_alt_id = $1)
       AND LOWER(status) = 'active'
       LIMIT 1`,
      [characterId]
    );

    if (result.rows.length > 0) {
      return result.rows[0].access_level;
    }
    return null;
  } catch (error) {
    console.error('Error fetching FC access level:', error);
    return null;
  }
}

/**
 * Get roles for a character
 *
 * Determines which roles a character has based on their ID.
 * All authenticated users have 'user' role.
 * Characters in ADMIN_CHARACTER_IDS also get 'admin' role.
 * Characters in fleet_commanders table get their access_level as a role.
 *
 * @param {number} characterId - EVE character ID
 * @returns {Promise<string[]>} Array of role strings
 *
 * @example
 * // .env: ADMIN_CHARACTER_IDS=12345
 * await getRoles(12345) // Returns: ['user', 'admin']
 * await getRoles(99999) // Returns: ['user', 'FC'] (if FC in database)
 */
async function getRoles(characterId) {
  const roles = [ROLES.USER];

  // Check ENV-based admin role
  if (isAdmin(characterId)) {
    roles.push(ROLES.ADMIN);
  }

  // Check database for FC access level
  const accessLevel = await getFCAccessLevel(characterId);
  if (accessLevel) {
    roles.push(accessLevel);
  }

  return roles;
}

/**
 * Check if character has a specific role
 *
 * Verifies that a character has the specified role.
 * Useful for authorization checks in API endpoints.
 *
 * @param {number} characterId - EVE character ID
 * @param {string} role - Role to check (use ROLES enum)
 * @returns {Promise<boolean>} True if character has the role
 *
 * @example
 * await hasRole(12345, ROLES.ADMIN) // Returns: true if admin, false otherwise
 * await hasRole(12345, ROLES.USER)  // Returns: true (all authenticated users)
 */
async function hasRole(characterId, role) {
  const characterRoles = await getRoles(characterId);
  return characterRoles.includes(role);
}

module.exports = {
  ROLES,
  isAdmin,
  getRoles,
  hasRole
};
