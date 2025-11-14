/**
 * @fileoverview Centralized Permission System
 *
 * Provides reusable permission checking functions to eliminate code duplication
 * and ensure consistent authorization logic across all endpoints.
 *
 * Permission Hierarchy:
 * - Admin: Full system access (ENV-controlled)
 * - Council: Management access (database-managed)
 * - Accountant: Financial access (database-managed)
 * - OBomberCare: SRP management access (database-managed)
 * - FC: Read-only access (database-managed)
 * - User: Authenticated but no special access
 *
 * @see {@link ./roles.js} for role definitions
 */

const { ROLES } = require('./roles');

/**
 * Role groups for common permission checks
 */
const ROLE_GROUPS = {
  /** All roles that have any authorized access to the system */
  AUTHORIZED: [ROLES.ADMIN, ROLES.COUNCIL, ROLES.ACCOUNTANT, ROLES.OBOMBERCARE, ROLES.FC],

  /** Roles that can modify data (not read-only) */
  CAN_MODIFY: [ROLES.ADMIN, ROLES.COUNCIL, ROLES.ACCOUNTANT, ROLES.OBOMBERCARE],

  /** Roles that can manage FCs */
  CAN_MANAGE_FCS: [ROLES.ADMIN, ROLES.COUNCIL],

  /** Roles that can manage bans */
  CAN_MANAGE_BANS: [ROLES.ADMIN, ROLES.COUNCIL],

  /** Roles that can access all wallet divisions */
  CAN_ACCESS_ALL_DIVISIONS: [ROLES.ADMIN, ROLES.COUNCIL, ROLES.ACCOUNTANT],

  /** Read-only roles */
  READ_ONLY: [ROLES.FC, ROLES.ACCOUNTANT]
};

/**
 * Check if user has any of the specified roles
 *
 * @param {Object} auth - Authentication object from requireAuth middleware
 * @param {string[]} roles - Array of role strings to check
 * @returns {boolean} True if user has at least one of the roles
 *
 * @example
 * if (hasAnyRole(auth, [ROLES.ADMIN, ROLES.COUNCIL])) {
 *   // User is admin or council
 * }
 */
function hasAnyRole(auth, roles) {
  if (!auth || !auth.roles || !Array.isArray(auth.roles)) {
    return false;
  }
  return auth.roles.some(role => roles.includes(role));
}

/**
 * Check if user has all of the specified roles
 *
 * @param {Object} auth - Authentication object from requireAuth middleware
 * @param {string[]} roles - Array of role strings to check
 * @returns {boolean} True if user has all of the roles
 *
 * @example
 * if (hasAllRoles(auth, [ROLES.ADMIN, ROLES.COUNCIL])) {
 *   // User has both admin and council roles
 * }
 */
function hasAllRoles(auth, roles) {
  if (!auth || !auth.roles || !Array.isArray(auth.roles)) {
    return false;
  }
  return roles.every(role => auth.roles.includes(role));
}

/**
 * Check if user has a specific role
 *
 * @param {Object} auth - Authentication object from requireAuth middleware
 * @param {string} role - Role string to check
 * @returns {boolean} True if user has the role
 *
 * @example
 * if (hasRole(auth, ROLES.ADMIN)) {
 *   // User is admin
 * }
 */
function hasRole(auth, role) {
  if (!auth || !auth.roles || !Array.isArray(auth.roles)) {
    return false;
  }
  return auth.roles.includes(role);
}

/**
 * Check if user is FC-only (has FC role but none of the higher roles)
 *
 * Used to determine read-only access in SRP and processed mails.
 *
 * @param {Object} auth - Authentication object from requireAuth middleware
 * @returns {boolean} True if user is FC-only
 *
 * @example
 * if (isFCOnly(auth)) {
 *   // User can only read, cannot modify
 * }
 */
function isFCOnly(auth) {
  if (!auth || !auth.roles || !Array.isArray(auth.roles)) {
    return false;
  }
  return auth.roles.includes(ROLES.FC) &&
         !auth.roles.includes(ROLES.ADMIN) &&
         !auth.roles.includes(ROLES.COUNCIL) &&
         !auth.roles.includes(ROLES.ACCOUNTANT) &&
         !auth.roles.includes(ROLES.OBOMBERCARE);
}

/**
 * Check if user is Accountant-only (has Accountant role but none of the higher roles)
 *
 * Used to determine read-only access in processed mails.
 *
 * @param {Object} auth - Authentication object from requireAuth middleware
 * @returns {boolean} True if user is Accountant-only
 */
function isAccountantOnly(auth) {
  if (!auth || !auth.roles || !Array.isArray(auth.roles)) {
    return false;
  }
  return auth.roles.includes(ROLES.ACCOUNTANT) &&
         !auth.roles.includes(ROLES.ADMIN) &&
         !auth.roles.includes(ROLES.COUNCIL) &&
         !auth.roles.includes(ROLES.OBOMBERCARE);
}

/**
 * Check if user has read-only access (FC or Accountant without higher roles)
 *
 * @param {Object} auth - Authentication object from requireAuth middleware
 * @returns {boolean} True if user has read-only access
 *
 * @example
 * if (isReadOnly(auth)) {
 *   return res.status(403).json({ error: 'Read-only access' });
 * }
 */
function isReadOnly(auth) {
  return isFCOnly(auth) || isAccountantOnly(auth);
}

/**
 * Resource-specific permission checks
 */
const Permissions = {
  /**
   * Check if user can access the system at all
   */
  canAccessSystem(auth) {
    return hasAnyRole(auth, ROLE_GROUPS.AUTHORIZED);
  },

  /**
   * Check if user can manage SRP requests (approve/deny/pay)
   */
  canManageSRP(auth) {
    return hasAnyRole(auth, ROLE_GROUPS.CAN_MODIFY);
  },

  /**
   * Check if user can view SRP requests
   */
  canViewSRP(auth) {
    return hasAnyRole(auth, ROLE_GROUPS.AUTHORIZED);
  },

  /**
   * Check if user can manage fleet commanders
   */
  canManageFCs(auth) {
    return hasAnyRole(auth, ROLE_GROUPS.CAN_MANAGE_FCS);
  },

  /**
   * Check if user can edit/delete Council members
   */
  canManageCouncil(auth) {
    return hasRole(auth, ROLES.ADMIN);
  },

  /**
   * Check if user can manage ban list
   */
  canManageBans(auth) {
    return hasAnyRole(auth, ROLE_GROUPS.CAN_MANAGE_BANS);
  },

  /**
   * Check if user can manage processed mails
   */
  canManageMails(auth) {
    return hasAnyRole(auth, [ROLES.ADMIN, ROLES.COUNCIL, ROLES.OBOMBERCARE]);
  },

  /**
   * Check if user can view processed mails
   */
  canViewMails(auth) {
    return hasAnyRole(auth, ROLE_GROUPS.AUTHORIZED);
  },

  /**
   * Check if user can access all wallet divisions
   */
  canAccessAllDivisions(auth) {
    return hasAnyRole(auth, ROLE_GROUPS.CAN_ACCESS_ALL_DIVISIONS);
  },

  /**
   * Check if user can access division 4 (public division)
   */
  canAccessDivision4(auth) {
    return hasAnyRole(auth, ROLE_GROUPS.AUTHORIZED);
  },

  /**
   * Check if user can view wallet history
   */
  canViewWallet(auth) {
    return hasAnyRole(auth, ROLE_GROUPS.AUTHORIZED);
  },

  /**
   * Check if user can access system status page
   */
  canViewSystemStatus(auth) {
    return hasRole(auth, ROLES.ADMIN);
  },

  /**
   * Check if user can access ESI status
   */
  canViewESIStatus(auth) {
    return hasRole(auth, ROLES.ADMIN);
  },

  /**
   * Check if user can send EVE mail
   */
  canSendMail(auth) {
    return hasRole(auth, ROLES.ADMIN);
  },

  /**
   * Check if user can access wallet endpoint
   */
  canAccessWallet(auth) {
    return hasRole(auth, ROLES.ADMIN);
  },

  /**
   * Check if user can manage ship types
   */
  canManageShipTypes(auth) {
    return hasAnyRole(auth, ROLE_GROUPS.CAN_MANAGE_FCS);
  },

  /**
   * Check if user can manage fleet composition (fleet types and doctrines)
   */
  canManageFleetComposition(auth) {
    return hasAnyRole(auth, ROLE_GROUPS.CAN_MANAGE_FCS);
  },

  /**
   * Check if user can view fleet composition
   */
  canViewFleetComposition(auth) {
    return hasAnyRole(auth, ROLE_GROUPS.AUTHORIZED);
  },

  /**
   * Check if user can manage fleets (create, edit, delete)
   */
  canManageFleets(auth) {
    return hasAnyRole(auth, ROLE_GROUPS.CAN_MANAGE_FCS);
  },

  /**
   * Check if user can view fleets
   */
  canViewFleets(auth) {
    return hasAnyRole(auth, ROLE_GROUPS.AUTHORIZED);
  }
};

module.exports = {
  ROLE_GROUPS,
  hasAnyRole,
  hasAllRoles,
  hasRole,
  isFCOnly,
  isAccountantOnly,
  isReadOnly,
  Permissions
};
