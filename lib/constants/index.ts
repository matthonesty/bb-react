import type { UserRole, SRPStatus, FCRank } from '@/types';
import { ROLES } from '@/lib/auth/roleConstants';

// Import ROLES for consistent role references (from roleConstants to avoid importing database code)

/**
 * Application constants and configuration
 */

export const APP_NAME = 'Bombers Bar';
export const APP_SHORT_NAME = 'BB';

// User Roles with permissions
export const USER_ROLES: UserRole[] = [
  ROLES.ADMIN,
  ROLES.COUNCIL,
  ROLES.ACCOUNTANT,
  ROLES.OBOMBERCARE,
  ROLES.FC,
  ROLES.ELECTION_OFFICER,
  ROLES.USER,
];

// Admin roles that have elevated permissions
export const ADMIN_ROLES: UserRole[] = [ROLES.ADMIN, ROLES.COUNCIL];

// Roles that can manage SRP
export const SRP_MANAGER_ROLES: UserRole[] = [ROLES.ADMIN, ROLES.COUNCIL, ROLES.ACCOUNTANT];

// Roles that can manage fleets
export const FLEET_MANAGER_ROLES: UserRole[] = [
  ROLES.ADMIN,
  ROLES.COUNCIL,
  ROLES.OBOMBERCARE,
];

// SRP Status options
export const SRP_STATUSES: SRPStatus[] = [
  'pending',
  'approved',
  'paid',
  'denied',
];

// FC Ranks in order of seniority (top down: Senior FC, FC, Junior FC, Support)
export const FC_RANKS: FCRank[] = ['SFC', 'FC', 'JFC', 'Support'];

// Pagination defaults
export const DEFAULT_PAGE_SIZE = 50;
export const PAGE_SIZE_OPTIONS = [25, 50, 100, 200];

// EVE Online URLs
export const EVE_SSO_URL = 'https://login.eveonline.com';
export const EVE_ESI_URL = 'https://esi.evetech.net/latest';
export const ZKILLBOARD_URL = 'https://zkillboard.com';
export const EVE_WHO_URL = 'https://evewho.com';
export const DOTLAN_URL = 'https://evemaps.dotlan.net';

// Navigation items (role-based)
export interface NavItem {
  label: string;
  href: string;
  roles?: UserRole[]; // If undefined, visible to all authenticated users
  icon?: string;
}

export const NAV_ITEMS: NavItem[] = [
  {
    label: 'SRP',
    href: '/srp',
    icon: 'Shield',
  },
  {
    label: 'Fleet Management',
    href: '/fleet-management',
    roles: FLEET_MANAGER_ROLES,
    icon: 'Users',
  },
  {
    label: 'FC Management',
    href: '/fc-management',
    roles: ADMIN_ROLES,
    icon: 'UserCheck',
  },
  {
    label: 'Wallet',
    href: '/wallet',
    roles: [ROLES.ADMIN, ROLES.COUNCIL, ROLES.ACCOUNTANT],
    icon: 'Wallet',
  },
  {
    label: 'Ship Types',
    href: '/ship-types',
    roles: ADMIN_ROLES,
    icon: 'Rocket',
  },
  {
    label: 'Ban Management',
    href: '/ban-management',
    roles: ADMIN_ROLES,
    icon: 'Ban',
  },
  {
    label: 'Bombing Intel',
    href: '/bombing-intel',
    icon: 'Target',
  },
  {
    label: 'System',
    href: '/system',
    roles: [ROLES.ADMIN],
    icon: 'Settings',
  },
];

// Payment methods
export const PAYMENT_METHODS = ['Contract', 'Direct'] as const;

// Date format strings
export const DATE_FORMAT = 'MMM d, yyyy';
export const DATETIME_FORMAT = 'MMM d, yyyy HH:mm';
export const TIME_FORMAT = 'HH:mm';

// API endpoints (relative to base URL)
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/auth/login',
    LOGOUT: '/api/auth/logout',
    VERIFY: '/api/auth/verify',
    CALLBACK: '/api/auth/callback',
  },
  SRP: {
    LIST: '/api/admin/srp',
    SUBMIT: '/api/srp/submit',
    MY_REQUESTS: '/api/srp/my-requests',
  },
  FLEET: {
    LIST: '/api/admin/fleets',
    CREATE: '/api/admin/fleets',
  },
  WALLET: {
    JOURNAL: '/api/admin/wallet',
  },
} as const;

// Table column widths (for consistency)
export const COLUMN_WIDTHS = {
  xs: 'w-16',
  sm: 'w-24',
  md: 'w-32',
  lg: 'w-48',
  xl: 'w-64',
} as const;
