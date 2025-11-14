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
 */

import pool from '@/lib/db';
import { ROLES, isAuthorizedRole as checkAuthorizedRole } from './roleConstants';

/**
 * Get list of admin character IDs from environment
 *
 * Checks both ADMIN_CHARACTER_ID (singular) and ADMIN_CHARACTER_IDS (plural).
 * Supports both formats for flexibility.
 *
 * @returns Array of admin character IDs
 */
function getAdminCharacterIds(): number[] {
  const adminIds: number[] = [];

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
 * @param characterId - EVE character ID to check
 * @returns True if character is an admin
 */
export function isAdmin(characterId: number | string): boolean {
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
 * @param characterId - EVE character ID
 * @returns Access level (Council, Accountant, OBomberCare, FC) or null
 */
async function getFCAccessLevel(characterId: number): Promise<string | null> {
  try {
    const result = await pool.query(
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
    console.error('[ROLES] Error fetching FC access level:', error);
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
 * @param characterId - EVE character ID
 * @returns Array of role strings
 */
export async function getRoles(characterId: number): Promise<string[]> {
  const roles: string[] = [ROLES.USER];

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
 * @param characterId - EVE character ID
 * @param role - Role to check (use ROLES enum)
 * @returns True if character has the role
 */
export async function hasRole(characterId: number, role: string): Promise<boolean> {
  const characterRoles = await getRoles(characterId);
  return characterRoles.includes(role);
}

/**
 * Check if user has any authorized role (admin or FC access)
 *
 * @param characterId - EVE character ID
 * @returns True if user has authorized access
 */
export async function hasAuthorizedAccess(characterId: number): Promise<boolean> {
  const roles = await getRoles(characterId);
  return roles.some(role => checkAuthorizedRole(role));
}

// Re-export for convenience
export { ROLES, checkAuthorizedRole as isAuthorizedRole };
