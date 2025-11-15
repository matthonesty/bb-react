import { format, formatDistanceToNow, parseISO } from 'date-fns';

/**
 * Format a number as ISK (EVE Online currency)
 * @param amount - The amount to format
 * @param decimals - Number of decimal places (default: 2)
 */
export function formatISK(amount: number | null | undefined, decimals = 2): string {
  if (amount === null || amount === undefined) {
    return '0.00 ISK';
  }
  return `${amount.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })} ISK`;
}

/**
 * Format a large number with K/M/B suffixes
 * @param num - The number to format
 */
export function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) {
    return '0';
  }

  if (num >= 1_000_000_000) {
    return `${(num / 1_000_000_000).toFixed(2)}B`;
  }
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(2)}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(2)}K`;
  }
  return num.toLocaleString('en-US');
}

/**
 * Format a date string to a readable format
 * @param date - ISO date string or Date object
 * @param formatString - Date format string (default: 'MMM d, yyyy HH:mm')
 */
export function formatDate(
  date: string | Date | null | undefined,
  formatString = 'MMM d, yyyy HH:mm'
): string {
  if (!date) {
    return '-';
  }

  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return format(dateObj, formatString);
  } catch (error) {
    console.error('Error formatting date:', error);
    return '-';
  }
}

/**
 * Format a date as relative time (e.g., "2 hours ago")
 * @param date - ISO date string or Date object
 */
export function formatRelativeTime(date: string | Date | null | undefined): string {
  if (!date) {
    return '-';
  }

  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return formatDistanceToNow(dateObj, { addSuffix: true });
  } catch (error) {
    console.error('Error formatting relative time:', error);
    return '-';
  }
}

/**
 * Escape HTML to prevent XSS
 * @param text - Text to escape
 */
export function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Truncate text to a maximum length
 * @param text - Text to truncate
 * @param maxLength - Maximum length
 * @param suffix - Suffix to add if truncated (default: '...')
 */
export function truncate(
  text: string | null | undefined,
  maxLength: number,
  suffix = '...'
): string {
  if (!text) {
    return '';
  }
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * Get status badge color class
 * @param status - SRP status
 */
export function getStatusColor(status: string): string {
  const statusColors: Record<string, string> = {
    Pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    Approved: 'bg-green-100 text-green-800 border-green-300',
    Rejected: 'bg-red-100 text-red-800 border-red-300',
    Paid: 'bg-blue-100 text-blue-800 border-blue-300',
    Ineligible: 'bg-gray-100 text-gray-800 border-gray-300',
  };

  return statusColors[status] || 'bg-gray-100 text-gray-800 border-gray-300';
}

/**
 * Format FC rank with appropriate styling
 * @param rank - FC rank
 */
export function getFCRankColor(rank: string): string {
  const rankColors: Record<string, string> = {
    'Lead FC': 'bg-purple-100 text-purple-800 border-purple-300',
    'Senior FC': 'bg-blue-100 text-blue-800 border-blue-300',
    FC: 'bg-green-100 text-green-800 border-green-300',
    Trainee: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  };

  return rankColors[rank] || 'bg-gray-100 text-gray-800 border-gray-300';
}

/**
 * Parse killmail ID from zkillboard URL
 * @param url - zkillboard URL
 */
export function parseKillmailId(url: string): number | null {
  const match = url.match(/\/kill\/(\d+)\/?/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Generate zkillboard URL from killmail ID
 * @param killmailId - Killmail ID
 */
export function getZkillboardUrl(killmailId: number): string {
  return `https://zkillboard.com/kill/${killmailId}/`;
}

/**
 * Generate EVE Who URL for character
 * @param characterId - Character ID
 */
export function getEveWhoUrl(characterId: number): string {
  return `https://evewho.com/character/${characterId}`;
}

/**
 * Generate dotlan map URL for system
 * @param systemName - Solar system name
 */
export function getDotlanUrl(systemName: string): string {
  return `https://evemaps.dotlan.net/system/${systemName.replace(' ', '_')}`;
}
