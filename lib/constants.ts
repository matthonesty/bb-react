/**
 * Application constants and configuration
 */

export interface NavItem {
  label: string;
  href: string;
  roles?: string[];
}

export const NAV_ITEMS: NavItem[] = [
  {
    label: 'SRP',
    href: '/srp',
  },
  {
    label: 'Processed Mails',
    href: '/mail',
    roles: ['admin', 'Council', 'Accountant', 'FC'],
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
