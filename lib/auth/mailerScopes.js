/**
 * @fileoverview Mailer Scope Configuration
 *
 * Defines ESI scopes required for the mailer service account.
 * This is a SERVICE ACCOUNT, not a human user.
 *
 * The mailer account handles:
 * - Sending EVE mail (SRP confirmations, notifications)
 * - Reading EVE mail (processing SRP requests)
 * - Reading corporation wallet (payment tracking, journal monitoring)
 *
 * These scopes were previously on admin users but are now separated
 * to maintain proper security boundaries:
 * - Admin users = Data administrators (no ESI scopes needed)
 * - Mailer account = Service account with persistent ESI access
 */

const { CHARACTER_SCOPES, CORPORATION_SCOPES } = require('./scopes');

/**
 * Mailer service account scopes
 * Only includes scopes needed for automated operations
 * @constant {string[]}
 */
const MAILER_SCOPES = [
  'publicData',

  // Mail - Required for SRP notifications and processing
  CHARACTER_SCOPES.MAIL_SEND,    // esi-mail.send_mail.v1
  CHARACTER_SCOPES.MAIL_READ,    // esi-mail.read_mail.v1

  // Corporation Wallet - Required for payment tracking
  CORPORATION_SCOPES.WALLETS     // esi-wallet.read_corporation_wallets.v1
];

module.exports = {
  MAILER_SCOPES
};
