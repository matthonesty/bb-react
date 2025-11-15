/**
 * Sanitize EVE Online mail HTML safely
 *
 * EVE mails contain HTML with font tags, colors, and killReport links.
 * This function sanitizes the HTML and converts EVE-specific links to zkillboard links.
 */

import DOMPurify from 'dompurify';

/**
 * Convert EVE killReport links to ESI killmail URLs with zkillboard icon
 * Format: killReport:killmail_id:hash
 * Converts to: ESI link + zkillboard icon link
 */
function convertKillReportLinks(html: string): string {
  // External link SVG icon (same as lucide-react ExternalLink)
  const externalLinkIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle;"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>`;

  // Match full anchor tags with killReport: links
  return html.replace(
    /<a\s+href="killReport:(\d+):([a-f0-9]+)"([^>]*)>(.*?)<\/a>/gi,
    (match, killmailId, hash, attrs, linkText) => {
      const esiUrl = `https://esi.evetech.net/v1/killmails/${killmailId}/${hash}/?datasource=tranquility`;
      const zkbUrl = `https://zkillboard.com/kill/${killmailId}/`;

      // Return ESI link + zkillboard icon (ESI link will get target/rel added later)
      // Using #a855f7 which is the primary purple color
      return `<a href="${esiUrl}"${attrs}>${linkText}</a> <a href="${zkbUrl}" target="_blank" rel="noopener noreferrer" style="margin-left: 6px; color: #a855f7; text-decoration: none; display: inline-flex; align-items: center;" title="View on zKillboard">${externalLinkIcon}</a>`;
    }
  );
}

/**
 * Sanitize EVE mail HTML
 * - Removes dangerous tags and attributes
 * - Allows safe formatting tags (font, br, a, etc.)
 * - Converts killReport links to ESI killmail API links
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

  // Configure DOMPurify to allow EVE mail formatting and SVG icons
  const config = {
    ALLOWED_TAGS: ['font', 'br', 'a', 'b', 'i', 'u', 'span', 'div', 'p', 'svg', 'path', 'polyline', 'line'],
    ALLOWED_ATTR: [
      'size', 'color', 'href', 'target', 'rel', 'style', 'title',
      // SVG attributes
      'xmlns', 'width', 'height', 'viewBox', 'fill', 'stroke', 'stroke-width',
      'stroke-linecap', 'stroke-linejoin', 'd', 'points', 'x1', 'y1', 'x2', 'y2'
    ],
    ALLOW_DATA_ATTR: false,
  };

  // Sanitize with DOMPurify
  sanitized = DOMPurify.sanitize(sanitized, config);

  // Ensure all links (except zkillboard icons which already have it) open in new tab with security
  sanitized = sanitized.replace(
    /<a href="https:\/\/esi\.evetech\.net/g,
    '<a target="_blank" rel="noopener noreferrer" href="https://esi.evetech.net'
  );

  return sanitized;
}
