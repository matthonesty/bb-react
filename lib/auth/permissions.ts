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
 * @see {@link ./roles.ts} for role definitions
 */

import { ROLES } from './roles';

export interface AuthObject {
  character_id: number;
  character_name: string;
  roles: string[];
}

/**
 * Role groups for common permission checks
 */
export const ROLE_GROUPS = {
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
  READ_ONLY: [ROLES.FC, ROLES.ACCOUNTANT],
};

/**
 * Check if user has any of the specified roles
 *
 * @param auth - Authentication object from requireAuth middleware
 * @param roles - Array of role strings to check
 * @returns True if user has at least one of the roles
 *
 * @example
 * if (hasAnyRole(auth, [ROLES.ADMIN, ROLES.COUNCIL])) {
 *   // User is admin or council
 * }
 */
export function hasAnyRole(auth: AuthObject | null, roles: string[]): boolean {
  if (!auth || !auth.roles || !Array.isArray(auth.roles)) {
    return false;
  }
  return auth.roles.some((role) => roles.includes(role));
}

/**
 * Check if user has all of the specified roles
 *
 * @param auth - Authentication object from requireAuth middleware
 * @param roles - Array of role strings to check
 * @returns True if user has all of the roles
 *
 * @example
 * if (hasAllRoles(auth, [ROLES.ADMIN, ROLES.COUNCIL])) {
 *   // User has both admin and council roles
 * }
 */
export function hasAllRoles(auth: AuthObject | null, roles: string[]): boolean {
  if (!auth || !auth.roles || !Array.isArray(auth.roles)) {
    return false;
  }
  return roles.every((role) => auth.roles.includes(role));
}

/**
 * Check if user has a specific role
 *
 * @param auth - Authentication object from requireAuth middleware
 * @param role - Role string to check
 * @returns True if user has the role
 *
 * @example
 * if (hasRole(auth, ROLES.ADMIN)) {
 *   // User is admin
 * }
 */
export function hasRole(auth: AuthObject | null, role: string): boolean {
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
 * @param auth - Authentication object from requireAuth middleware
 * @returns True if user is FC-only
 *
 * @example
 * if (isFCOnly(auth)) {
 *   // User can only read, cannot modify
 * }
 */
export function isFCOnly(auth: AuthObject | null): boolean {
  if (!auth || !auth.roles || !Array.isArray(auth.roles)) {
    return false;
  }
  return (
    auth.roles.includes(ROLES.FC) &&
    !auth.roles.includes(ROLES.ADMIN) &&
    !auth.roles.includes(ROLES.COUNCIL) &&
    !auth.roles.includes(ROLES.ACCOUNTANT) &&
    !auth.roles.includes(ROLES.OBOMBERCARE)
  );
}

/**
 * Check if user is Accountant-only (has Accountant role but none of the higher roles)
 *
 * Used to determine read-only access in processed mails.
 *
 * @param auth - Authentication object from requireAuth middleware
 * @returns True if user is Accountant-only
 */
export function isAccountantOnly(auth: AuthObject | null): boolean {
  if (!auth || !auth.roles || !Array.isArray(auth.roles)) {
    return false;
  }
  return (
    auth.roles.includes(ROLES.ACCOUNTANT) &&
    !auth.roles.includes(ROLES.ADMIN) &&
    !auth.roles.includes(ROLES.COUNCIL) &&
    !auth.roles.includes(ROLES.OBOMBERCARE)
  );
}

/**
 * Check if user has read-only access (FC or Accountant without higher roles)
 *
 * @param auth - Authentication object from requireAuth middleware
 * @returns True if user has read-only access
 *
 * @example
 * if (isReadOnly(auth)) {
 *   return NextResponse.json({ error: 'Read-only access' }, { status: 403 });
 * }
 */
export function isReadOnly(auth: AuthObject | null): boolean {
  return isFCOnly(auth) || isAccountantOnly(auth);
}

/**
 * Resource-specific permission checks
 */
export const Permissions = {
  /**
   * Check if user can access the system at all
   */
  canAccessSystem(auth: AuthObject | null): boolean {
    return hasAnyRole(auth, ROLE_GROUPS.AUTHORIZED);
  },

  /**
   * Check if user can manage SRP requests (approve/deny/pay)
   */
  canManageSRP(auth: AuthObject | null): boolean {
    return hasAnyRole(auth, ROLE_GROUPS.CAN_MODIFY);
  },

  /**
   * Check if user can view SRP requests
   */
  canViewSRP(auth: AuthObject | null): boolean {
    return hasAnyRole(auth, ROLE_GROUPS.AUTHORIZED);
  },

  /**
   * Check if user can manage fleet commanders
   */
  canManageFCs(auth: AuthObject | null): boolean {
    return hasAnyRole(auth, ROLE_GROUPS.CAN_MANAGE_FCS);
  },

  /**
   * Check if user can edit/delete Council members
   */
  canManageCouncil(auth: AuthObject | null): boolean {
    return hasRole(auth, ROLES.ADMIN);
  },

  /**
   * Check if user can manage ban list
   */
  canManageBans(auth: AuthObject | null): boolean {
    return hasAnyRole(auth, ROLE_GROUPS.CAN_MANAGE_BANS);
  },

  /**
   * Check if user can manage processed mails
   */
  canManageMails(auth: AuthObject | null): boolean {
    return hasAnyRole(auth, [ROLES.ADMIN, ROLES.COUNCIL, ROLES.OBOMBERCARE]);
  },

  /**
   * Check if user can view processed mails
   */
  canViewMails(auth: AuthObject | null): boolean {
    return hasAnyRole(auth, ROLE_GROUPS.AUTHORIZED);
  },

  /**
   * Check if user can access all wallet divisions
   */
  canAccessAllDivisions(auth: AuthObject | null): boolean {
    return hasAnyRole(auth, ROLE_GROUPS.CAN_ACCESS_ALL_DIVISIONS);
  },

  /**
   * Check if user can access division 4 (public division)
   */
  canAccessDivision4(auth: AuthObject | null): boolean {
    return hasAnyRole(auth, ROLE_GROUPS.AUTHORIZED);
  },

  /**
   * Check if user can view wallet history
   */
  canViewWallet(auth: AuthObject | null): boolean {
    return hasAnyRole(auth, ROLE_GROUPS.AUTHORIZED);
  },

  /**
   * Check if user can access system status page
   */
  canViewSystemStatus(auth: AuthObject | null): boolean {
    return hasRole(auth, ROLES.ADMIN);
  },

  /**
   * Check if user can access ESI status
   */
  canViewESIStatus(auth: AuthObject | null): boolean {
    return hasRole(auth, ROLES.ADMIN);
  },

  /**
   * Check if user can send EVE mail
   */
  canSendMail(auth: AuthObject | null): boolean {
    return hasRole(auth, ROLES.ADMIN);
  },

  /**
   * Check if user can access wallet endpoint
   */
  canAccessWallet(auth: AuthObject | null): boolean {
    return hasRole(auth, ROLES.ADMIN);
  },

  /**
   * Check if user can manage ship types
   */
  canManageShipTypes(auth: AuthObject | null): boolean {
    return hasAnyRole(auth, ROLE_GROUPS.CAN_MANAGE_FCS);
  },

  /**
   * Check if user can manage fleet composition (fleet types and doctrines)
   */
  canManageFleetComposition(auth: AuthObject | null): boolean {
    return hasAnyRole(auth, ROLE_GROUPS.CAN_MANAGE_FCS);
  },

  /**
   * Check if user can view fleet composition
   */
  canViewFleetComposition(auth: AuthObject | null): boolean {
    return hasAnyRole(auth, ROLE_GROUPS.AUTHORIZED);
  },

  /**
   * Check if user can manage fleets (create, edit, delete)
   */
  canManageFleets(auth: AuthObject | null): boolean {
    return hasAnyRole(auth, ROLE_GROUPS.CAN_MANAGE_FCS);
  },

  /**
   * Check if user can view fleets
   */
  canViewFleets(auth: AuthObject | null): boolean {
    return hasAnyRole(auth, ROLE_GROUPS.AUTHORIZED);
  },
};
