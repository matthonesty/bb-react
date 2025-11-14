/**
 * @fileoverview Role Constants
 *
 * Pure constants for role definitions - no server dependencies.
 * Safe to import in both server and client code.
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
 * Check if a role is an authorized FC/admin role
 * Centralized helper to avoid hardcoding role lists everywhere
 *
 * @param {string} role - Role to check
 * @returns {boolean} True if role has authorized access
 */
function isAuthorizedRole(role) {
  const authorizedRoles = [
    ROLES.ADMIN,
    ROLES.COUNCIL,
    ROLES.ACCOUNTANT,
    ROLES.OBOMBERCARE,
    ROLES.FC,
    ROLES.ELECTION_OFFICER
  ];
  return authorizedRoles.includes(role);
}

module.exports = {
  ROLES,
  isAuthorizedRole
};
