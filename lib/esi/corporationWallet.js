/**
 * @fileoverview EVE ESI Corporation Wallet Service
 *
 * Fetches corporation wallet journal entries and transactions from EVE ESI API.
 * Used for financial tracking and management.
 *
 * ESI Endpoints:
 * - GET /corporations/{corporation_id}/wallets/{division}/journal
 * - GET /corporations/{corporation_id}/wallets/{division}/transactions
 *
 * Required Scope: esi-wallet.read_corporation_wallets.v1
 * Required Role: Accountant or Junior_Accountant
 * Cache: 1 hour
 *
 * @see {@link https://esi.evetech.net/ui/#/Wallet/get_corporations_corporation_id_wallets_division_journal}
 * @see {@link https://esi.evetech.net/ui/#/Wallet/get_corporations_corporation_id_wallets_division_transactions}
 */

import { ESI_BASE_URL, esiGet } from './helpers.js';

/**
 * Get corporation ID from character's public info
 *
 * @param {number} characterId - Character ID
 * @returns {Promise<number>} Corporation ID
 */
async function getCharacterCorporation(characterId) {
  const url = `${ESI_BASE_URL}/characters/${characterId}`;
  const data = await esiGet(url);
  return data.corporation_id;
}

/**
 * Wallet division to check (1 = Master Wallet)
 * @constant {number}
 */
const WALLET_DIVISION = 1;

/**
 * Fetch corporation wallet journal entries
 *
 * Returns list of wallet journal entries (ISK movements).
 * Journal entries are in reverse chronological order (newest first).
 *
 * @param {string} accessToken - Character access token (with corp wallet scope)
 * @param {number} corporationId - Corporation ID
 * @param {number} [division] - Wallet division (defaults to WALLET_DIVISION = 1)
 * @param {number} [page] - Page number for pagination (default: 1)
 * @returns {Promise<Object[]>} Array of journal entries
 * @property {number} amount - ISK amount (positive = credit, negative = debit)
 * @property {number} balance - Wallet balance after transaction
 * @property {number} context_id - Context identifier (varies by ref_type)
 * @property {string} date - Transaction date (ISO 8601)
 * @property {string} description - Transaction description
 * @property {number} first_party_id - Character/corp that initiated
 * @property {number} id - Unique journal entry ID
 * @property {string} ref_type - Transaction type (player_donation, bounty_prizes, etc.)
 * @property {number} second_party_id - Character/corp that received
 *
 * @example
 * const journal = await getWalletJournal(accessToken, corporationId);
 * // Returns: [{ id: 123, amount: 300000000, ref_type: "player_donation", ... }]
 */
async function getWalletJournal(accessToken, corporationId, division = WALLET_DIVISION, page = null) {
  const url = `${ESI_BASE_URL}/corporations/${corporationId}/wallets/${division}/journal`;

  const params = {};
  if (page && page > 1) {
    params.page = page;
  }

  return await esiGet(url, accessToken, params);
}

/**
 * Fetch corporation wallet transactions
 *
 * Returns list of wallet transactions (market purchases/sales).
 * Transactions are in reverse chronological order (newest first).
 *
 * @param {string} accessToken - Character access token (with corp wallet scope)
 * @param {number} corporationId - Corporation ID
 * @param {number} [division] - Wallet division (defaults to WALLET_DIVISION = 1)
 * @param {number} [fromId] - Only show transactions before this ID (for pagination)
 * @returns {Promise<Object[]>} Array of transaction entries
 * @property {number} client_id - Character/corp that transaction was with
 * @property {string} date - Transaction date (ISO 8601)
 * @property {boolean} is_buy - True if corp bought, false if corp sold
 * @property {number} journal_ref_id - Corresponding journal entry ID (-1 if none)
 * @property {number} location_id - Station/structure where transaction occurred
 * @property {number} quantity - Number of items transacted
 * @property {number} transaction_id - Unique transaction ID
 * @property {number} type_id - EVE item type ID
 * @property {number} unit_price - ISK per unit
 *
 * @example
 * const transactions = await getWalletTransactions(accessToken, corporationId);
 * // Returns: [{ transaction_id: 123, type_id: 34, quantity: 10, unit_price: 1000000, ... }]
 */
async function getWalletTransactions(accessToken, corporationId, division = WALLET_DIVISION, fromId = null) {
  const url = `${ESI_BASE_URL}/corporations/${corporationId}/wallets/${division}/transactions`;

  const params = {};

  if (fromId) {
    params.from_id = fromId;
  }

  return await esiGet(url, accessToken, params);
}

export {
  WALLET_DIVISION,
  getCharacterCorporation,
  getWalletJournal,
  getWalletTransactions
};
