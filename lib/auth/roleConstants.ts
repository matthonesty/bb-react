/**
 * @fileoverview Role Constants
 *
 * Pure constants for role definitions - no server dependencies.
 * Safe to import in both server and client code.
 */

/**
 * Available user roles
 */
export const ROLES = {
  USER: 'user',
  ADMIN: 'admin',           // ENV-controlled only
  COUNCIL: 'Council',       // Database-managed via fleet_commanders
  ACCOUNTANT: 'Accountant', // Database-managed via fleet_commanders
  OBOMBERCARE: 'OBomberCare', // Database-managed via fleet_commanders
  FC: 'FC',                 // Database-managed via fleet_commanders
  ELECTION_OFFICER: 'Election Officer' // Database-managed via fleet_commanders (manual SQL only)
} as const;

/**
 * Check if a role is an authorized FC/admin role
 * Centralized helper to avoid hardcoding role lists everywhere
 *
 * @param role - Role to check
 * @returns True if role has authorized access
 */
export function isAuthorizedRole(role: string): boolean {
  const authorizedRoles: string[] = [
    ROLES.ADMIN,
    ROLES.COUNCIL,
    ROLES.ACCOUNTANT,
    ROLES.OBOMBERCARE,
    ROLES.FC,
    ROLES.ELECTION_OFFICER
  ];
  return authorizedRoles.includes(role);
}
