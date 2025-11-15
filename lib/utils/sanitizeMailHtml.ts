/**
 * Sanitize EVE Online mail HTML safely
 *
 * EVE mails contain HTML with font tags, colors, and killReport links.
 * This function sanitizes the HTML and converts EVE-specific links to zkillboard links.
 */

import DOMPurify from 'dompurify';

/**
 * Convert EVE killReport links to zkillboard URLs
 * Format: killReport:killmail_id:hash
 */
function convertKillReportLinks(html: string): string {
  // Match killReport: links in href attributes
  return html.replace(
    /killReport:(\d+):([a-f0-9]+)/gi,
    'https://zkillboard.com/kill/$1/'
  );
}

/**
 * Sanitize EVE mail HTML
 * - Removes dangerous tags and attributes
 * - Allows safe formatting tags (font, br, a, etc.)
 * - Converts killReport links to zkillboard links
 * - Prevents XSS attacks
 */
export function sanitizeMailHtml(html: string): string {
  if (!html) return '';

  // Only run on client side
  if (typeof window === 'undefined') {
    return html;
  }

  // Convert killReport links first
  let sanitized = convertKillReportLinks(html);

  // Configure DOMPurify to allow EVE mail formatting
  const config = {
    ALLOWED_TAGS: ['font', 'br', 'a', 'b', 'i', 'u', 'span', 'div', 'p'],
    ALLOWED_ATTR: ['size', 'color', 'href', 'target', 'rel', 'style'],
    ALLOW_DATA_ATTR: false,
  };

  // Sanitize with DOMPurify
  sanitized = DOMPurify.sanitize(sanitized, config);

  // Ensure all links open in new tab with security
  sanitized = sanitized.replace(
    /<a /g,
    '<a target="_blank" rel="noopener noreferrer" '
  );

  return sanitized;
}
