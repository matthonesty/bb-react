/**
 * @fileoverview Mailer EVE SSO Service
 *
 * Separate SSO instance for persistent mailer authentication with extended ESI scopes.
 * Uses different OAuth credentials (EVE_MAILER_ID) from regular user SSO.
 *
 * This is a SERVICE ACCOUNT for automated operations:
 * - Mail operations (reading/sending EVE mail)
 * - Wallet/accounting operations (corporation wallet journal)
 * - Persistent data pulls from ESI
 *
 * This differs from admin authentication:
 * - Admin users: Human users who manage data via portal (no ESI scopes needed)
 * - Mailer account: Service account with persistent refresh token for ESI operations
 */

import { BaseSso } from './BaseSso';

// Mailer service account credentials
const clientId = process.env.MAILER_CLIENT_ID || '';
const secretKey = process.env.MAILER_SECRET_KEY || '';
const callbackUrl = process.env.EVE_CALLBACK_URL || '';

// Validate required credentials
if (!clientId) {
  console.error('[MAILER SSO] MAILER_CLIENT_ID not configured - mailer operations will fail');
}

if (!secretKey) {
  console.error('[MAILER SSO] MAILER_SECRET_KEY not configured - mailer operations will fail');
}

// Export singleton instance
export default new BaseSso({
  clientId,
  secretKey,
  callbackUrl,
  label: 'Mailer SSO'
});
