/**
 * @fileoverview Mailer Service Account ESI Scopes
 *
 * Defines the specific ESI scopes required for the mailer service account.
 * The mailer account is a persistent service account that handles:
 * - Mail operations (reading/sending EVE mail)
 * - Wallet/accounting operations (corporation wallet journal)
 *
 * These scopes are requested when authorizing the mailer service account
 * and remain valid via refresh token for persistent data pulls.
 */

import { PUBLIC_DATA, CHARACTER_SCOPES, CORPORATION_SCOPES } from './scopes';

/**
 * Scopes required for mailer service account
 *
 * Includes:
 * - publicData: Basic character information
 * - Mail read: Read incoming SRP request mails
 * - Mail send: Send confirmation/rejection mails
 * - Corporation wallets: Read wallet journal for payment verification
 */
export const MAILER_SCOPES = [
  PUBLIC_DATA,
  CHARACTER_SCOPES.MAIL_SEND,
  CHARACTER_SCOPES.MAIL_READ,
  CORPORATION_SCOPES.WALLETS,
] as const;
