/**
 * @fileoverview Wallet Reconciliation Service
 *
 * Fetches corporation wallet journal entries and reconciles SRP payments.
 * Matches journal entries with pending SRP requests to mark them as paid.
 *
 * SRP Payment Format:
 * - ref_type: "corporation_account_withdrawal"
 * - context_id: recipient character_id
 * - reason: SRP request ID (e.g., "123")
 * - amount: negative value (ISK withdrawn)
 */

const { getWalletJournal, getCharacterCorporation } = require('../esi/corporationWallet');
const { getMailerAccessToken } = require('../mailerToken');
const { resolveNames } = require('../esi/universe');
const { MAILER_CHARACTER_ID } = require('../esi/mail');

/**
 * Fetch and save wallet journal entries to database for a specific division
 *
 * Fetches new journal entries from ESI and saves them to wallet_journal table.
 * Uses the highest existing journal ID to only fetch newer entries.
 *
 * EFFICIENCY: Uses bulk name resolution to convert all IDs to names in ONE ESI call.
 * Collects all character/corp/alliance IDs from journal entries, then resolves them
 * in a single bulk request before saving enriched data.
 *
 * @param {Object} db - Database instance
 * @param {string} accessToken - ESI access token with wallet scope
 * @param {number} corporationId - Corporation ID
 * @param {number} division - Wallet division (1-7)
 * @returns {Promise<Object>} { saved: number, skipped: number }
 */
async function fetchAndSaveJournalEntries(db, accessToken, corporationId, division = 1) {
  try {
    // Get the most recent journal entry ID we have for this division
    const lastEntryResult = await db.query(
      'SELECT MAX(id) as last_id FROM wallet_journal WHERE division = $1',
      [division]
    );
    const lastId = lastEntryResult.rows[0]?.last_id;

    console.log(`[WALLET Division ${division}] Fetching journal entries${lastId ? ` newer than ${lastId}` : ' (initial fetch)'}`);

    // Fetch journal entries from ESI (goes back 30 days max)
    // ESI returns entries newest-first
    let allEntries = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      console.log(`[WALLET Division ${division}] Fetching journal page ${page}...`);

      let entries;
      try {
        entries = await getWalletJournal(accessToken, corporationId, division, page);
      } catch (error) {
        // ESI returns 404 "Requested page does not exist!" when we've reached the last page
        if (error.message && error.message.includes('Requested page does not exist')) {
          console.log(`[WALLET Division ${division}] Reached end of journal pagination at page ${page}`);
          hasMore = false;
          break;
        }
        // Other errors should propagate
        throw error;
      }

      if (!entries || entries.length === 0) {
        hasMore = false;
        break;
      }

      // Stop if we've reached entries we already have
      if (lastId && entries.some(entry => entry.id <= lastId)) {
        // Only add entries newer than what we have
        const newEntries = entries.filter(entry => entry.id > lastId);
        allEntries.push(...newEntries);
        hasMore = false;
        break;
      }

      allEntries.push(...entries);
      page++;

      // Safety limit: max 10 pages (5000 entries)
      if (page > 10) {
        console.warn(`[WALLET Division ${division}] Reached page limit (10 pages), stopping fetch`);
        hasMore = false;
      }
    }

    console.log(`[WALLET Division ${division}] Fetched ${allEntries.length} new journal entries from ESI`);

    // Collect all IDs from journal entries for bulk name resolution
    const idsToResolve = new Set();

    for (const entry of allEntries) {
      if (entry.first_party_id) idsToResolve.add(entry.first_party_id);
      if (entry.second_party_id) idsToResolve.add(entry.second_party_id);
      if (entry.tax_receiver_id) idsToResolve.add(entry.tax_receiver_id);

      // Only resolve context_id if it's a character/corp/alliance
      if (entry.context_id && entry.context_id_type) {
        const validTypes = ['character_id', 'corporation_id', 'alliance_id'];
        if (validTypes.includes(entry.context_id_type)) {
          idsToResolve.add(entry.context_id);
        }
      }
    }

    // Bulk resolve all IDs to names in ONE ESI call
    let nameMap = {};
    if (idsToResolve.size > 0) {
      try {
        console.log(`[WALLET] Bulk resolving ${idsToResolve.size} unique IDs`);
        const resolvedNames = await resolveNames([...idsToResolve]);
        resolvedNames.forEach(item => {
          nameMap[item.id] = item.name;
        });
        console.log(`[WALLET] Successfully resolved ${resolvedNames.length} names`);
      } catch (error) {
        console.warn('[WALLET] Failed to bulk resolve names:', error.message);
        // Continue with empty nameMap - will save IDs without names
      }
    }

    // Save enriched entries to database using chunked batch inserts
    // PostgreSQL parameter limit is typically 65535
    // With 17 columns per row, we chunk at 500 rows (8500 params) to stay safe
    const CHUNK_SIZE = 500;
    let totalSaved = 0;
    let totalSkipped = 0;

    if (allEntries.length === 0) {
      console.log(`[WALLET] No entries to save`);
      return { saved: 0, skipped: 0 };
    }

    const chunks = [];
    for (let i = 0; i < allEntries.length; i += CHUNK_SIZE) {
      chunks.push(allEntries.slice(i, i + CHUNK_SIZE));
    }

    console.log(`[WALLET] Batch inserting ${allEntries.length} entries in ${chunks.length} chunk(s)...`);

    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
      const chunk = chunks[chunkIndex];
      const values = [];
      const valueStrings = [];
      let paramIndex = 1;

      for (const entry of chunk) {
        const rowValues = [
          entry.id,
          division,
          entry.amount,
          entry.balance,
          entry.context_id || null,
          entry.context_id_type || null,
          entry.context_id ? nameMap[entry.context_id] || null : null,
          entry.date,
          entry.description,
          entry.first_party_id || null,
          entry.first_party_id ? nameMap[entry.first_party_id] || null : null,
          entry.reason || null,
          entry.ref_type,
          entry.second_party_id || null,
          entry.second_party_id ? nameMap[entry.second_party_id] || null : null,
          entry.tax || null,
          entry.tax_receiver_id || null,
          entry.tax_receiver_id ? nameMap[entry.tax_receiver_id] || null : null
        ];

        values.push(...rowValues);
        const placeholders = rowValues.map((_, i) => `$${paramIndex + i}`).join(', ');
        valueStrings.push(`(${placeholders})`);
        paramIndex += rowValues.length;
      }

      const query = `
        INSERT INTO wallet_journal (
          id, division, amount, balance, context_id, context_id_type, context_id_name, date, description,
          first_party_id, first_party_name, reason, ref_type, second_party_id, second_party_name,
          tax, tax_receiver_id, tax_receiver_name
        ) VALUES ${valueStrings.join(', ')}
        ON CONFLICT (id, division) DO NOTHING
      `;

      try {
        const result = await db.query(query, values);
        const saved = result.rowCount || 0;
        const skipped = chunk.length - saved;
        totalSaved += saved;
        totalSkipped += skipped;

        if (chunks.length > 1) {
          console.log(`[WALLET Division ${division}] Chunk ${chunkIndex + 1}/${chunks.length}: saved ${saved}, skipped ${skipped}`);
        }
      } catch (error) {
        console.error(`[WALLET Division ${division}] Failed to insert chunk ${chunkIndex + 1}/${chunks.length}:`, error.message);
        throw error;
      }
    }

    console.log(`[WALLET Division ${division}] Total: saved ${totalSaved} entries, skipped ${totalSkipped} duplicates`);
    return { saved: totalSaved, skipped: totalSkipped };
  } catch (error) {
    console.error('[WALLET] Error fetching journal entries:', error.message);
    throw error;
  }
}

/**
 * Reconcile SRP payments with wallet journal entries
 *
 * Finds "corporation_account_withdrawal" journal entries where:
 * - reason matches an SRP request ID
 * - context_id matches the SRP request's character_id
 * - amount matches the final_payout_amount (negative value)
 *
 * Updates matching SRP requests to "paid" status.
 *
 * @param {Object} db - Database instance
 * @returns {Promise<Object>} { reconciled: number, errors: number }
 */
async function reconcileSRPPayments(db) {
  try {
    console.log('[WALLET] Starting SRP payment reconciliation');

    // Get approved SRP requests that need payment
    const pendingRequests = await db.query(
      `SELECT id, character_id, final_payout_amount, killmail_id
       FROM srp_requests
       WHERE status = 'approved' AND payment_journal_id IS NULL`
    );

    console.log(`[WALLET] Found ${pendingRequests.rows.length} approved SRP requests awaiting payment`);

    let reconciled = 0;
    let errors = 0;

    for (const srpRequest of pendingRequests.rows) {
      try {
        // Look for matching journal entry
        // - ref_type: corporation_account_withdrawal
        // - reason: SRP request ID OR killmail ID (as string)
        // - second_party_id: recipient character_id (NOT context_id, which is the person who made the transfer)
        // - amount: negative (money going out), absolute value matches payout
        const journalMatch = await db.query(
          `SELECT * FROM wallet_journal
           WHERE ref_type = 'corporation_account_withdrawal'
           AND (reason = $1 OR reason = $2)
           AND second_party_id = $3
           AND ABS(amount) = $4
           ORDER BY date DESC
           LIMIT 1`,
          [
            srpRequest.id.toString(), // SRP ID as string in reason field
            srpRequest.killmail_id.toString(), // Also check killmail ID
            srpRequest.character_id,
            srpRequest.final_payout_amount
          ]
        );

        if (journalMatch.rows.length > 0) {
          const journal = journalMatch.rows[0];

          // Update SRP request as paid
          await db.query(
            `UPDATE srp_requests
             SET status = 'paid',
                 payment_journal_id = $1,
                 payment_amount = $2,
                 paid_at = $3,
                 updated_at = NOW()
             WHERE id = $4`,
            [
              journal.id,
              Math.abs(journal.amount), // Store positive value
              journal.date,
              srpRequest.id
            ]
          );

          console.log(`[WALLET] ✓ Reconciled SRP ${srpRequest.id} (killmail: ${srpRequest.killmail_id}) with journal ${journal.id} (reason: ${journal.reason}, amount: ${Math.abs(journal.amount)})`);
          reconciled++;
        } else {
          console.log(`[WALLET] ✗ No match for SRP ${srpRequest.id} (killmail: ${srpRequest.killmail_id}, character: ${srpRequest.character_id}, amount: ${srpRequest.final_payout_amount})`);
        }
      } catch (error) {
        console.error(`[WALLET] Error reconciling SRP request ${srpRequest.id}:`, error.message);
        errors++;
      }
    }

    console.log(`[WALLET] Reconciliation complete: ${reconciled} payments matched, ${errors} errors`);

    // NOTE: Commented out to prevent race condition with payment confirmation
    // Previously this would move approved requests back to pending before payment could be confirmed
    //
    // // Move unreconciled approved requests back to pending
    // try {
    //   const moveBackResult = await db.query(
    //     `UPDATE srp_requests
    //      SET status = 'pending', updated_at = NOW()
    //      WHERE status = 'approved' AND payment_journal_id IS NULL
    //      RETURNING id`
    //   );
    //
    //   const movedCount = moveBackResult.rows.length;
    //   if (movedCount > 0) {
    //     console.log(`[WALLET] Moved ${movedCount} unreconciled approved request(s) back to pending`);
    //     moveBackResult.rows.forEach(row => {
    //       console.log(`[WALLET] - SRP ${row.id} moved back to pending (not reconciled)`);
    //     });
    //   }
    // } catch (error) {
    //   console.error('[WALLET] Error moving unreconciled requests back to pending:', error.message);
    // }

    return { reconciled, errors };
  } catch (error) {
    console.error('[WALLET] Error during SRP reconciliation:', error.message);
    throw error;
  }
}

/**
 * Main reconciliation process
 *
 * 1. Fetches latest wallet journal entries from ESI for all divisions (1-7)
 * 2. Saves them to database (with bulk name resolution)
 * 3. Reconciles pending SRP payments
 *
 * Automatically determines corporation ID from mailer character's public info.
 * Should be run periodically (e.g., every hour via cron)
 *
 * @param {Object} db - Database instance
 * @returns {Promise<Object>} { journalSaved: number, paymentsReconciled: number, divisions: Object }
 */
async function runWalletReconciliation(db) {
  try {
    console.log('[WALLET] Starting wallet reconciliation process');

    // Get mailer service account token (has wallet read scope)
    const accessToken = await getMailerAccessToken();

    // Get corporation ID from environment variable
    const corporationId = parseInt(process.env.EVE_CORPORATION_ID);
    if (!corporationId) {
      throw new Error('EVE_CORPORATION_ID not configured in environment');
    }
    console.log(`[WALLET] Using corporation ID: ${corporationId}`);

    // Step 1: Fetch and save journal entries for all 7 divisions
    let totalSaved = 0;
    let totalSkipped = 0;
    const divisionResults = {};

    for (let division = 1; division <= 7; division++) {
      try {
        console.log(`[WALLET] Processing division ${division}/7...`);
        const journalResult = await fetchAndSaveJournalEntries(db, accessToken, corporationId, division);
        totalSaved += journalResult.saved;
        totalSkipped += journalResult.skipped;
        divisionResults[`division_${division}`] = {
          saved: journalResult.saved,
          skipped: journalResult.skipped
        };
      } catch (error) {
        console.error(`[WALLET] Failed to fetch division ${division}:`, error.message);
        divisionResults[`division_${division}`] = {
          saved: 0,
          skipped: 0,
          error: error.message
        };
        // Continue with other divisions even if one fails
      }
    }

    console.log(`[WALLET] All divisions processed: ${totalSaved} total entries saved, ${totalSkipped} skipped`);

    // Step 2: Reconcile SRP payments
    const reconcileResult = await reconcileSRPPayments(db);

    console.log('[WALLET] Reconciliation process complete');

    return {
      journalSaved: totalSaved,
      paymentsReconciled: reconcileResult.reconciled,
      divisions: divisionResults
    };
  } catch (error) {
    console.error('[WALLET] Reconciliation process failed:', error.message);
    throw error;
  }
}

module.exports = {
  fetchAndSaveJournalEntries,
  reconcileSRPPayments,
  runWalletReconciliation
};
