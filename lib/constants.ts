/**
 * Application constants and configuration
 */

// Import ROLES for consistent role references (from roleConstants to avoid importing database code)
import { ROLES } from '@/lib/auth/roleConstants';

export interface NavItem {
  label: string;
  href: string;
  roles?: string[];
}

export const NAV_ITEMS: NavItem[] = [
  {
    label: 'SRP',
    href: '/srp',
    roles: [ROLES.ADMIN, ROLES.COUNCIL, ROLES.ACCOUNTANT, ROLES.OBOMBERCARE, ROLES.FC, ROLES.ELECTION_OFFICER],
  },
  {
    label: 'Bans',
    href: '/bans',
    roles: [ROLES.ADMIN, ROLES.COUNCIL, ROLES.ACCOUNTANT, ROLES.OBOMBERCARE, ROLES.FC, ROLES.ELECTION_OFFICER],
  },
  {
    label: 'FCs',
    href: '/fcs',
    roles: [ROLES.ADMIN, ROLES.COUNCIL, ROLES.ACCOUNTANT, ROLES.OBOMBERCARE, ROLES.FC, ROLES.ELECTION_OFFICER],
  },
  {
    label: 'SRP Config',
    href: '/srp-config',
    roles: [ROLES.ADMIN, ROLES.COUNCIL],
  },
  {
    label: 'Mail',
    href: '/mail',
    roles: [ROLES.ADMIN, ROLES.COUNCIL, ROLES.ACCOUNTANT, ROLES.OBOMBERCARE, ROLES.FC, ROLES.ELECTION_OFFICER],
  },
  {
    label: 'Wallet',
    href: '/wallet',
    roles: [ROLES.ADMIN, ROLES.COUNCIL, ROLES.ACCOUNTANT, ROLES.OBOMBERCARE, ROLES.FC, ROLES.ELECTION_OFFICER],
  },
];

export const DEFAULT_PAGE_SIZE = 50;

export const SRP_STATUSES = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'denied', label: 'Denied' },
  { value: 'paid', label: 'Paid' },
] as const;
