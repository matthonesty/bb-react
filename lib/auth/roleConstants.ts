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
  ADMIN: 'admin', // ENV-controlled only
  COUNCIL: 'Council', // Database-managed via fleet_commanders
  ACCOUNTANT: 'Accountant', // Database-managed via fleet_commanders
  OBOMBERCARE: 'OBomberCare', // Database-managed via fleet_commanders
  FC: 'FC', // Database-managed via fleet_commanders
  ELECTION_OFFICER: 'Election Officer', // Database-managed via fleet_commanders (manual SQL only)
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
    ROLES.ELECTION_OFFICER,
  ];
  return authorizedRoles.includes(role);
}

/**
 * Check if user roles can view private resources
 * Private resources require FC+ access (FC, admin, council, etc.)
 *
 * @param roles - Array of user roles
 * @returns True if user has FC+ access
 */
export function canViewPrivateResources(roles: string[]): boolean {
  return roles.some((role) => isAuthorizedRole(role));
}

/**
 * Check if user roles can edit resources
 * Only admin and election officer can edit resources
 *
 * @param roles - Array of user roles
 * @returns True if user can edit resources
 */
export function canEditResources(roles: string[]): boolean {
  const editRoles: string[] = [ROLES.ADMIN, ROLES.ELECTION_OFFICER];
  return roles.some((role) => editRoles.includes(role));
}
