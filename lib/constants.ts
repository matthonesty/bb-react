/**
 * Application constants and configuration
 */

// Import ROLES for consistent role references (from roleConstants to avoid importing database code)
import { ROLES } from '@/lib/auth/roleConstants';

export interface NavItem {
  label: string;
  href?: string;
  roles?: string[];
  children?: NavItem[];
}

export const NAV_ITEMS: NavItem[] = [
  {
    label: 'SRP',
    roles: [ROLES.ADMIN, ROLES.COUNCIL, ROLES.ACCOUNTANT, ROLES.OBOMBERCARE, ROLES.FC, ROLES.ELECTION_OFFICER],
    children: [
      {
        label: 'SRP Management',
        href: '/srp',
        roles: [ROLES.ADMIN, ROLES.COUNCIL, ROLES.ACCOUNTANT, ROLES.OBOMBERCARE, ROLES.FC, ROLES.ELECTION_OFFICER],
      },
      {
        label: 'SRP Mail',
        href: '/mail',
        roles: [ROLES.ADMIN, ROLES.COUNCIL, ROLES.ACCOUNTANT, ROLES.OBOMBERCARE, ROLES.FC, ROLES.ELECTION_OFFICER],
      },
      {
        label: 'SRP Config',
        href: '/srp-config',
        roles: [ROLES.ADMIN, ROLES.COUNCIL],
      },
    ],
  },
  {
    label: 'Administration',
    roles: [ROLES.ADMIN, ROLES.COUNCIL, ROLES.ACCOUNTANT, ROLES.OBOMBERCARE, ROLES.FC, ROLES.ELECTION_OFFICER],
    children: [
      {
        label: 'Fleet Commanders',
        href: '/fcs',
        roles: [ROLES.ADMIN, ROLES.COUNCIL, ROLES.ACCOUNTANT, ROLES.OBOMBERCARE, ROLES.FC, ROLES.ELECTION_OFFICER],
      },
      {
        label: 'Ban Management',
        href: '/bans',
        roles: [ROLES.ADMIN, ROLES.COUNCIL, ROLES.ACCOUNTANT, ROLES.OBOMBERCARE, ROLES.FC, ROLES.ELECTION_OFFICER],
      },
    ],
  },
  {
    label: 'Finances',
    roles: [ROLES.ADMIN, ROLES.COUNCIL, ROLES.ACCOUNTANT, ROLES.OBOMBERCARE, ROLES.FC, ROLES.ELECTION_OFFICER],
    children: [
      {
        label: 'Corporate Wallet',
        href: '/wallet',
        roles: [ROLES.ADMIN, ROLES.COUNCIL, ROLES.ACCOUNTANT, ROLES.OBOMBERCARE, ROLES.FC, ROLES.ELECTION_OFFICER],
      },
    ],
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
