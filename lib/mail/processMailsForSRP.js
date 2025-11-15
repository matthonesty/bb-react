/**
 * @fileoverview Shared Mail Processing Logic
 *
 * Centralized SRP mail processing used by both:
 * - Automated cron job (api/cron/process-mail.js)
 * - Manual admin button (api/admin/mail.js)
 *
 * Handles validation, rejection, and SRP creation with queue support.
 */

import { getMailContent } from '../esi.js';
import { validateSRPRequest } from '../srp/validator.js';
import { getAllApprovedShips } from '../srp/shipTypes.js';
import { resolveNames } from '../esi.js';
import { queueMailSend } from '../pendingMailQueue';
import { getProximityData, loadFleetCommandersMap } from '../killmail/parser.js';
import { isBanned } from '../banlist/checker.js';

/**
 * Collect all IDs from a killmail that need name resolution
 *
 * @param {Object} killmailData - Raw killmail data
 * @returns {Array<number>} Array of IDs to resolve
 */
function collectIdsFromKillmail(killmailData) {
  const ids = [];

  if (killmailData.victim_character_id) ids.push(killmailData.victim_character_id);
  if (killmailData.victim_corporation_id) ids.push(killmailData.victim_corporation_id);
  if (killmailData.victim_alliance_id) ids.push(killmailData.victim_alliance_id);
  if (killmailData.victim_ship_type_id) ids.push(killmailData.victim_ship_type_id);
  if (killmailData.solar_system_id) ids.push(killmailData.solar_system_id);

  // Item type IDs
  if (killmailData.items && Array.isArray(killmailData.items)) {
    killmailData.items.forEach((item) => {
      if (item.item_type_id) {
        ids.push(item.item_type_id);
      }
    });
  }

  return ids;
}

/**
 * Enrich killmail data with resolved names from a name map
 *
 * @param {Object} killmailData - Raw killmail data
 * @param {Object} nameMap - Map of ID -> name
 * @returns {Object} Enriched killmail data with name fields
 */
function enrichKillmailWithNameMap(killmailData, nameMap) {
  const enrichedData = { ...killmailData };

  if (enrichedData.victim_character_id) {
    enrichedData.victim_character_name = nameMap[enrichedData.victim_character_id] || 'Unknown';
  }
  if (enrichedData.victim_corporation_id) {
    enrichedData.victim_corporation_name = nameMap[enrichedData.victim_corporation_id] || 'Unknown';
  }
  if (enrichedData.victim_alliance_id) {
    enrichedData.victim_alliance_name = nameMap[enrichedData.victim_alliance_id] || null;
  }
  if (enrichedData.victim_ship_type_id) {
    enrichedData.victim_ship_name = nameMap[enrichedData.victim_ship_type_id] || 'Unknown';
  }
  if (enrichedData.solar_system_id) {
    enrichedData.solar_system_name = nameMap[enrichedData.solar_system_id] || null;
  }

  // Enrich items with type names
  if (enrichedData.items && Array.isArray(enrichedData.items)) {
    enrichedData.items = enrichedData.items.map((item) => ({
      ...item,
      item_type_name: item.item_type_id
        ? nameMap[item.item_type_id] || `Type ${item.item_type_id}`
        : null,
    }));
  }

  return enrichedData;
}

/**
 * Process mails for SRP requests
 *
 * @param {Object} params - Processing parameters
 * @param {string} params.accessToken - EVE SSO access token
 * @param {number} params.characterId - Admin character ID
 * @param {Array} params.mailHeaders - Mail headers to process
 * @param {Object} params.db - Database instance
 * @returns {Object} Processing results
 */
async function processMailsForSRP({ accessToken, characterId, mailHeaders, db }) {
  const results = {
    processed: 0,
    created: 0,
    skipped: 0,
    errors: [],
  };

  try {
    // Get list of already processed mail IDs
    const processedResult = await db.query('SELECT mail_id FROM processed_mails');
    // Ensure mail_id is consistently a number for comparison (ESI returns numbers)
    const processedMailIds = new Set(processedResult.rows.map((r) => Number(r.mail_id)));

    // CRITICAL: Filter out admin's sent mails immediately - do NOT process, do NOT save, do NOTHING
    // This prevents the admin from ever mailing themselves under any circumstances
    const unprocessedMails = mailHeaders.filter(
      (m) => !processedMailIds.has(Number(m.mail_id)) && m.from !== characterId
    );

    console.log(
      `[MAIL PROCESSING] ${unprocessedMails.length} unprocessed mails to check (excluding admin's sent mails)`
    );

    // Load approved ships once at start of processing cycle
    const approvedShips = await getAllApprovedShips();
    console.log(
      `[MAIL PROCESSING] Loaded ${Object.keys(approvedShips).length} approved ship types from database`
    );

    // Load Fleet Commanders into memory for proximity enrichment
    const fcMap = await loadFleetCommandersMap(db);

    // =====================================================================
    // PHASE 1: Validate all mails and collect validated data
    // =====================================================================
    const validatedMails = [];
    const bannedMails = [];
    const notSrpMails = [];
    const multipleKillmailMails = []; // Mails with multiple killmail links
    const errorMails = [];
    const allIdsToResolve = [];
    const allSenderIds = new Set(); // Collect all sender IDs to resolve in one batch

    for (const mailHeader of unprocessedMails) {
      results.processed++;
      // Collect sender ID for bulk resolution later
      allSenderIds.add(mailHeader.from);

      try {
        // Check if sender is banned (BB scope)
        const bannedEntry = await isBanned(mailHeader.from, 'bb');
        if (bannedEntry) {
          bannedMails.push({
            mailHeader,
            bannedEntry,
          });
          results.skipped++;
          console.log(
            `[MAIL PROCESSING] Mail ${mailHeader.mail_id}: Sender is banned - will record after processing`
          );
          continue;
        }

        // Get full mail content
        const mailContent = await getMailContent(accessToken, characterId, mailHeader.mail_id);
        const mailBody = mailContent.body || '';

        // Check if mail contains zkillboard link or EVE in-game kill report link
        const zkbPattern = /zkillboard\.com\/kill\/(\d+)/gi;
        const killReportPattern = /killReport:(\d+):([a-f0-9]{40})/gi;

        // Count killmail links
        const zkbMatches = mailBody.match(zkbPattern) || [];
        const killReportMatches = mailBody.match(killReportPattern) || [];
        const totalKillmailLinks = zkbMatches.length + killReportMatches.length;

        if (totalKillmailLinks === 0) {
          // No killmail link - collect for batch insert
          notSrpMails.push({
            mailHeader,
            mailBody,
          });
          results.skipped++;
          continue;
        }

        // Reject if more than one killmail link
        if (totalKillmailLinks > 1) {
          const rejectionReason = `Multiple killmail links detected (${totalKillmailLinks} links found). Please submit one SRP request per killmail.`;

          // Queue rejection email (name will be resolved in batch later)
          await queueMailSend({
            mailType: 'multiple_killmails_rejection',
            recipientCharacterId: mailHeader.from,
            payload: {
              senderCharacterId: characterId,
              recipientCharacterId: mailHeader.from,
              totalKillmailLinks,
            },
            retryAfter: new Date(), // Send ASAP (cron will rate limit)
          });

          // Collect for batch insert after name resolution
          multipleKillmailMails.push({
            mailHeader,
            mailBody,
            rejectionReason,
          });

          results.skipped++;
          console.log(
            `[MAIL PROCESSING] Mail ${mailHeader.mail_id}: Rejected - multiple killmail links detected`
          );
          continue;
        }

        // Validate SRP request
        let validation;
        try {
          validation = await validateSRPRequest(mailBody, approvedShips);
        } catch (error) {
          // Validation failed - collect for batch insert
          errorMails.push({
            mailHeader,
            mailBody,
            error: error.message,
          });
          results.errors.push({
            mail_id: mailHeader.mail_id,
            subject: mailHeader.subject,
            error: `Validation failed: ${error.message}`,
          });
          continue;
        }

        // Store validated mail for Phase 2
        validatedMails.push({
          mailHeader,
          mailBody,
          validation,
        });

        // Collect IDs from killmail data
        if (validation.killmail_data) {
          const killmailIds = collectIdsFromKillmail(validation.killmail_data);
          allIdsToResolve.push(...killmailIds);
        }
      } catch (error) {
        // Unexpected error during validation phase
        console.error(
          `[MAIL PROCESSING] Error validating mail ${mailHeader.mail_id}:`,
          error.message
        );
        results.errors.push({
          mail_id: mailHeader.mail_id,
          subject: mailHeader.subject,
          error: error.message,
        });
      }
    }

    // =====================================================================
    // PHASE 2: Bulk resolve ALL IDs (senders + killmail data) in ONE ESI call
    // =====================================================================
    let nameMap = {};
    try {
      const uniqueIds = [...new Set([...allIdsToResolve, ...Array.from(allSenderIds)])];
      console.log(
        `[MAIL PROCESSING] Bulk resolving ${uniqueIds.length} unique IDs (${allSenderIds.size} senders + ${allIdsToResolve.length} killmail IDs)`
      );

      const resolvedNames = await resolveNames(uniqueIds);
      resolvedNames.forEach((item) => {
        nameMap[item.id] = item.name;
      });

      console.log(`[MAIL PROCESSING] Successfully resolved ${resolvedNames.length} names`);
    } catch (error) {
      console.warn('[MAIL PROCESSING] Failed to bulk resolve names:', error.message);
      // Continue with empty nameMap - individual handlers will use fallbacks
    }

    // =====================================================================
    // PHASE 3: Batch insert non-SRP mails (banned, not_srp, multiple_killmails, errors)
    // =====================================================================
    for (const { mailHeader, bannedEntry } of bannedMails) {
      const senderName = nameMap[mailHeader.from] || 'Unknown';
      await db.query(
        'INSERT INTO processed_mails (mail_id, from_character_id, sender_name, subject, mail_timestamp, mail_body, status, error_message) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (mail_id) DO NOTHING',
        [
          mailHeader.mail_id,
          mailHeader.from,
          senderName,
          mailHeader.subject,
          mailHeader.timestamp,
          '',
          'banned',
          `Sender is banned: ${bannedEntry.reason || 'No reason provided'}`,
        ]
      );
    }

    for (const { mailHeader, mailBody, rejectionReason } of multipleKillmailMails) {
      const senderName = nameMap[mailHeader.from] || 'Unknown';
      await createAutoRejectedSRPRequest(
        db,
        mailHeader,
        mailBody,
        null, // No validation data for multiple killmail rejections
        `Auto-rejected: ${rejectionReason}`,
        'rejected',
        senderName,
        null // No proximity data
      );
    }

    for (const { mailHeader, mailBody } of notSrpMails) {
      const senderName = nameMap[mailHeader.from] || 'Unknown';
      await db.query(
        'INSERT INTO processed_mails (mail_id, from_character_id, sender_name, subject, mail_timestamp, mail_body, status, error_message) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (mail_id) DO NOTHING',
        [
          mailHeader.mail_id,
          mailHeader.from,
          senderName,
          mailHeader.subject,
          mailHeader.timestamp,
          mailBody,
          'not_srp',
          'No killmail link found',
        ]
      );
    }

    for (const { mailHeader, mailBody, error } of errorMails) {
      const senderName = nameMap[mailHeader.from] || 'Unknown';
      await db.query(
        'INSERT INTO processed_mails (mail_id, from_character_id, sender_name, subject, mail_timestamp, mail_body, status, error_message) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (mail_id) DO NOTHING',
        [
          mailHeader.mail_id,
          mailHeader.from,
          senderName,
          mailHeader.subject,
          mailHeader.timestamp,
          mailBody,
          'error',
          `Validation error: ${error}`,
        ]
      );
    }

    // =====================================================================
    // PHASE 4: Process validated mails with enriched data
    // =====================================================================
    for (const { mailHeader, mailBody, validation } of validatedMails) {
      const senderName = nameMap[mailHeader.from] || 'Unknown';

      try {
        // Enrich killmail data with resolved names
        if (validation.killmail_data) {
          validation.killmail_data = enrichKillmailWithNameMap(validation.killmail_data, nameMap);
        }

        // Fetch proximity data for this killmail (enriched with FC info)
        let proximityData = null;
        if (validation.killmail_data && validation.killmail_data.killmail_id) {
          proximityData = await getProximityData(validation.killmail_data.killmail_id, fcMap);
        }

        if (!validation.valid) {
          // Invalid SRP request - check if it's an unapproved ship
          const errorMsg = validation.errors.join('; ');
          const isUnapprovedShip = errorMsg.includes("not approved for O'Bomber-care");

          if (isUnapprovedShip) {
            await handleUnapprovedShip(
              accessToken,
              characterId,
              mailHeader,
              mailBody,
              validation,
              nameMap,
              db,
              results,
              proximityData,
              senderName
            );
            continue;
          }

          // Other validation errors
          await db.query(
            'INSERT INTO processed_mails (mail_id, from_character_id, sender_name, subject, mail_timestamp, mail_body, status, error_message) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (mail_id) DO NOTHING',
            [
              mailHeader.mail_id,
              mailHeader.from,
              senderName,
              mailHeader.subject,
              mailHeader.timestamp,
              mailBody,
              'invalid',
              `Invalid SRP: ${errorMsg}`,
            ]
          );
          results.errors.push({
            mail_id: mailHeader.mail_id,
            subject: mailHeader.subject,
            error: errorMsg,
          });
          continue;
        }

        // Check if killmail is older than 30 days
        const killmailTime = new Date(validation.killmail_data.killmail_time);
        const daysSinceKill = (new Date() - killmailTime) / (1000 * 60 * 60 * 24);

        if (daysSinceKill > 30) {
          await handleTooOldKillmail(
            accessToken,
            characterId,
            mailHeader,
            mailBody,
            validation,
            daysSinceKill,
            nameMap,
            db,
            results,
            proximityData,
            senderName
          );
          continue;
        }

        // Check if sender matches victim in killmail
        if (mailHeader.from !== validation.killmail_data.victim_character_id) {
          await handleSenderMismatch(
            accessToken,
            characterId,
            mailHeader,
            mailBody,
            validation,
            nameMap,
            db,
            results,
            proximityData,
            senderName
          );
          continue;
        }

        // Get names from enriched killmail data (already resolved in bulk)
        const characterName = validation.killmail_data.victim_character_name || 'Unknown';
        const shipName = validation.killmail_data.victim_ship_name || validation.ship_info.name;
        const systemName = validation.killmail_data.solar_system_name || null;

        // Check if killmail already exists
        const existingCheck = await db.query(
          'SELECT id, status, paid_at, final_payout_amount FROM srp_requests WHERE killmail_id = $1',
          [validation.killmail_data.killmail_id]
        );

        if (existingCheck.rows.length > 0) {
          // Killmail already exists - send appropriate rejection based on status
          const existingRequest = existingCheck.rows[0];
          const senderCharacterId = mailHeader.from;

          const zkbUrlMatch = mailBody.match(/(https?:\/\/zkillboard\.com\/kill\/\d+\/?)/i);
          const killmailUrl = zkbUrlMatch
            ? zkbUrlMatch[0]
            : `https://zkillboard.com/kill/${validation.killmail_data.killmail_id}/`;

          await db.query(
            'INSERT INTO processed_mails (mail_id, from_character_id, sender_name, subject, mail_timestamp, mail_body, status, srp_request_id, error_message) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (mail_id) DO UPDATE SET srp_request_id = $8',
            [
              mailHeader.mail_id,
              mailHeader.from,
              senderName,
              mailHeader.subject,
              mailHeader.timestamp,
              mailBody,
              'duplicate',
              existingRequest.id,
              'Duplicate killmail',
            ]
          );

          // Determine if already paid or still processing
          const isPaid = existingRequest.paid_at !== null;

          // Queue appropriate duplicate rejection mail
          await queueMailSend({
            mailType: isPaid ? 'duplicate_paid_rejection' : 'duplicate_pending_rejection',
            recipientCharacterId: senderCharacterId,
            payload: {
              senderCharacterId: characterId,
              recipientCharacterId: senderCharacterId,
              recipientName: senderName,
              killmailUrl,
              srpRequestId: existingRequest.id,
              paidAmount: existingRequest.final_payout_amount,
              paidDate: existingRequest.paid_at,
            },
            retryAfter: new Date(),
          });
          console.log(
            `[MAIL PROCESSING] Duplicate ${isPaid ? 'paid' : 'pending'} rejection mail queued for ${senderName}`
          );

          results.skipped++;
          console.log(
            `[MAIL PROCESSING] Mail ${mailHeader.mail_id}: Duplicate killmail ${validation.killmail_data.killmail_id} - ${isPaid ? 'already paid' : 'pending'}`
          );
          continue;
        }

        // Get corporation and alliance names from enriched data
        const corporationName = validation.killmail_data.victim_corporation_name || null;
        const allianceName = validation.killmail_data.victim_alliance_name || null;
        const allianceId = validation.killmail_data.victim_alliance_id || null;

        // Create SRP request
        const insertResult = await db.query(
          `INSERT INTO srp_requests (
            character_id, character_name, corporation_id, corporation_name, alliance_id, alliance_name,
            killmail_id, killmail_hash, killmail_time,
            ship_type_id, ship_name, is_polarized,
            solar_system_id, solar_system_name,
            base_payout_amount, final_payout_amount,
            status, requires_fc_approval,
            mail_id, mail_subject, mail_body, validation_warnings,
            proximity_data
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23
          ) RETURNING *`,
          [
            validation.killmail_data.victim_character_id,
            characterName,
            validation.killmail_data.victim_corporation_id,
            corporationName,
            allianceId,
            allianceName,
            validation.killmail_data.killmail_id,
            validation.killmail_data.hash || '',
            validation.killmail_data.killmail_time,
            validation.killmail_data.victim_ship_type_id,
            shipName,
            validation.is_polarized || false,
            validation.killmail_data.solar_system_id,
            systemName,
            validation.payout_amount,
            validation.payout_amount,
            'pending',
            validation.requires_fc_approval,
            mailHeader.mail_id,
            mailHeader.subject,
            mailBody,
            validation.warnings,
            proximityData ? JSON.stringify(proximityData) : null,
          ]
        );

        // Mark mail as processed
        await db.query(
          'INSERT INTO processed_mails (mail_id, from_character_id, sender_name, subject, mail_timestamp, mail_body, status, srp_request_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (mail_id) DO UPDATE SET srp_request_id = $8, status = $7',
          [
            mailHeader.mail_id,
            mailHeader.from,
            senderName,
            mailHeader.subject,
            mailHeader.timestamp,
            mailBody,
            'srp_created',
            insertResult.rows[0].id,
          ]
        );

        results.created++;
        console.log(
          `[MAIL PROCESSING] Mail ${mailHeader.mail_id}: SRP request created - ${shipName} - ${validation.payout_amount} ISK`
        );

        // Send confirmation mail to the person who submitted (not necessarily victim)
        await sendConfirmationMail(
          accessToken,
          characterId,
          mailHeader,
          mailBody,
          validation,
          characterName,
          shipName,
          nameMap
        );
      } catch (error) {
        // Unexpected error processing this mail
        console.error(
          `[MAIL PROCESSING] Error processing mail ${mailHeader.mail_id}:`,
          error.message
        );
        results.errors.push({
          mail_id: mailHeader.mail_id,
          subject: mailHeader.subject,
          error: error.message,
        });

        // Mark as processed with error to avoid retry loops
        try {
          await db.query(
            'INSERT INTO processed_mails (mail_id, from_character_id, sender_name, subject, mail_timestamp, status, error_message) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (mail_id) DO NOTHING',
            [
              mailHeader.mail_id,
              mailHeader.from,
              senderName,
              mailHeader.subject,
              mailHeader.timestamp,
              'error',
              `Processing error: ${error.message}`,
            ]
          );
        } catch (dbError) {
          console.error(
            `[MAIL PROCESSING] Failed to mark mail ${mailHeader.mail_id} as processed:`,
            dbError.message
          );
        }
      }
    }

    console.log('[MAIL PROCESSING] Processing complete:', JSON.stringify(results, null, 2));
  } catch (error) {
    console.error('[MAIL PROCESSING] Fatal error:', error);
    results.errors.push({ error: error.message });
  }

  return results;
}

/**
 * Helper function to create an auto-rejected SRP request in both tables
 */
async function createAutoRejectedSRPRequest(
  db,
  mailHeader,
  mailBody,
  validation,
  rejectionReason,
  rejectionType,
  senderName,
  proximityData
) {
  const killmailData = validation?.killmail_data || {};

  // Insert into srp_requests first
  const srpResult = await db.query(
    `INSERT INTO srp_requests (
      character_id, character_name, corporation_id, corporation_name, alliance_id, alliance_name,
      killmail_id, killmail_hash, killmail_time,
      ship_type_id, ship_name, is_polarized,
      solar_system_id, solar_system_name,
      hunter_donations,
      base_payout_amount, final_payout_amount,
      payout_adjusted,
      status,
      denial_reason,
      requires_fc_approval,
      mail_id, mail_subject, mail_body,
      admin_notes,
      proximity_data,
      submitted_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27
    ) RETURNING id`,
    [
      mailHeader.from,
      senderName,
      killmailData.victim_corporation_id || null,
      killmailData.victim_corporation_name || null,
      killmailData.victim_alliance_id || null,
      killmailData.victim_alliance_name || null,
      killmailData.killmail_id || null,
      killmailData.hash || '',
      killmailData.killmail_time || mailHeader.timestamp,
      killmailData.victim_ship_type_id || null,
      killmailData.victim_ship_name || 'Unknown Ship',
      false, // is_polarized
      killmailData.solar_system_id || null,
      killmailData.solar_system_name || null,
      0, // hunter_donations
      0, // base_payout_amount
      0, // final_payout_amount
      false, // payout_adjusted
      'denied', // status
      rejectionReason,
      false, // requires_fc_approval
      mailHeader.mail_id,
      mailHeader.subject,
      mailBody,
      '[AUTO-REJECTION]',
      proximityData ? JSON.stringify(proximityData) : null,
      mailHeader.timestamp, // submitted_at
    ]
  );

  const srpRequestId = srpResult.rows[0].id;

  // Insert into processed_mails with link to srp_request
  await db.query(
    'INSERT INTO processed_mails (mail_id, from_character_id, sender_name, subject, mail_timestamp, mail_body, status, error_message, srp_request_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (mail_id) DO NOTHING',
    [
      mailHeader.mail_id,
      mailHeader.from,
      senderName,
      mailHeader.subject,
      mailHeader.timestamp,
      mailBody,
      rejectionType,
      rejectionReason,
      srpRequestId,
    ]
  );

  return srpRequestId;
}

/**
 * Handle unapproved ship rejection
 */
async function handleUnapprovedShip(
  accessToken,
  characterId,
  mailHeader,
  mailBody,
  validation,
  nameMap,
  db,
  results,
  proximityData,
  senderName
) {
  const senderCharacterId = mailHeader.from;

  // Get names from enriched data
  const shipName = validation.killmail_data.victim_ship_name || 'Unknown';

  const zkbUrlMatch = mailBody.match(/(https?:\/\/zkillboard\.com\/kill\/\d+\/?)/i);
  const killmailUrl = zkbUrlMatch
    ? zkbUrlMatch[0]
    : `https://zkillboard.com/kill/${validation.killmail_data.killmail_id}/`;

  const rejectionReason = `Auto-Rejected: Ship type not approved for O'Bomber-care`;

  // Create auto-rejected SRP request in both tables
  await createAutoRejectedSRPRequest(
    db,
    mailHeader,
    mailBody,
    validation,
    rejectionReason,
    'rejected_ship',
    senderName,
    proximityData
  );

  // Queue rejection mail for rate-limited sending by cron job
  await queueMailSend({
    mailType: 'unapproved_ship',
    recipientCharacterId: senderCharacterId,
    payload: {
      mailSenderCharacterId: characterId,
      rejectedCharacterId: senderCharacterId,
      rejectedCharacterName: senderName,
      shipName,
      killmailUrl,
      // Note: Ships map NOT stored in payload - loaded fresh in sendQueuedMails()
    },
    retryAfter: new Date(), // Send ASAP (cron will rate limit)
  });
  console.log(
    `[MAIL PROCESSING] Unapproved ship rejection mail queued for ${senderName} - ${shipName} not covered`
  );

  results.skipped++;
}

/**
 * Handle too-old killmail rejection
 */
async function handleTooOldKillmail(
  accessToken,
  characterId,
  mailHeader,
  mailBody,
  validation,
  daysSinceKill,
  nameMap,
  db,
  results,
  proximityData,
  senderName
) {
  const senderCharacterId = mailHeader.from;

  const zkbUrlMatch = mailBody.match(/(https?:\/\/zkillboard\.com\/kill\/\d+\/?)/i);
  const killmailUrl = zkbUrlMatch
    ? zkbUrlMatch[0]
    : `https://zkillboard.com/kill/${validation.killmail_data.killmail_id}/`;
  const killmailTime = new Date(validation.killmail_data.killmail_time);
  const formattedKillDate = killmailTime.toISOString().split('T')[0];

  const rejectionReason = `Auto-Rejected: Killmail older than 30 days (${Math.floor(daysSinceKill)} days old)`;

  // Create auto-rejected SRP request in both tables
  await createAutoRejectedSRPRequest(
    db,
    mailHeader,
    mailBody,
    validation,
    rejectionReason,
    'rejected_too_old',
    senderName,
    proximityData
  );

  // Queue rejection mail for rate-limited sending by cron job
  await queueMailSend({
    mailType: 'too_old_rejection',
    recipientCharacterId: senderCharacterId,
    payload: {
      senderCharacterId: characterId,
      recipientCharacterId: senderCharacterId,
      recipientName: senderName,
      daysSinceKill: Math.floor(daysSinceKill),
      killDate: formattedKillDate,
      killmailUrl,
    },
    retryAfter: new Date(), // Send ASAP (cron will rate limit)
  });
  console.log(
    `[MAIL PROCESSING] Too-old rejection mail queued for ${senderName} - ${Math.floor(daysSinceKill)} days old`
  );

  results.skipped++;
}

/**
 * Handle sender/victim mismatch rejection
 */
async function handleSenderMismatch(
  accessToken,
  characterId,
  mailHeader,
  mailBody,
  validation,
  nameMap,
  db,
  results,
  proximityData,
  senderName
) {
  const senderCharacterId = mailHeader.from;

  // Get names from enriched data
  const victimName = validation.killmail_data.victim_character_name || 'Unknown';

  const zkbUrlMatch = mailBody.match(/(https?:\/\/zkillboard\.com\/kill\/\d+\/?)/i);
  const killmailUrl = zkbUrlMatch
    ? zkbUrlMatch[0]
    : `https://zkillboard.com/kill/${validation.killmail_data.killmail_id}/`;

  const rejectionReason = `Auto-Rejected: Mail sender does not match killmail victim`;

  // Create auto-rejected SRP request in both tables
  await createAutoRejectedSRPRequest(
    db,
    mailHeader,
    mailBody,
    validation,
    rejectionReason,
    'rejected_pilot',
    senderName,
    proximityData
  );

  // Queue rejection mail for rate-limited sending by cron job
  await queueMailSend({
    mailType: 'rejection',
    recipientCharacterId: senderCharacterId,
    payload: {
      mailSenderCharacterId: characterId,
      rejectedCharacterId: senderCharacterId,
      rejectedCharacterName: senderName,
      victimCharacterName: victimName,
      killmailUrl,
    },
    retryAfter: new Date(), // Send ASAP (cron will rate limit)
  });
  console.log(`[MAIL PROCESSING] Rejection mail queued for ${senderName} - victim mismatch`);

  results.skipped++;
}

/**
 * Send confirmation mail to submitter
 */
async function sendConfirmationMail(
  accessToken,
  characterId,
  mailHeader,
  mailBody,
  validation,
  characterName,
  shipName,
  nameMap
) {
  const mailSenderCharacterId = mailHeader.from;

  // Get sender name from nameMap (default to victim name if same person)
  let mailSenderName = characterName;
  if (mailSenderCharacterId !== validation.killmail_data.victim_character_id) {
    mailSenderName = nameMap[mailSenderCharacterId] || characterName;
  }

  const zkbUrlMatch = mailBody.match(/(https?:\/\/zkillboard\.com\/kill\/\d+\/?)/i);
  const killmailUrl = zkbUrlMatch
    ? zkbUrlMatch[0]
    : `https://zkillboard.com/kill/${validation.killmail_data.killmail_id}/`;

  // Queue confirmation mail for rate-limited sending by cron job
  await queueMailSend({
    mailType: 'confirmation',
    recipientCharacterId: mailSenderCharacterId,
    payload: {
      senderCharacterId: characterId,
      recipientCharacterId: mailSenderCharacterId,
      recipientCharacterName: mailSenderName,
      shipName,
      lossDate: validation.killmail_data.killmail_time,
      payoutAmount: validation.payout_amount,
      killmailUrl,
    },
    retryAfter: new Date(), // Send ASAP (cron will rate limit)
  });
  console.log(
    `[MAIL PROCESSING] Confirmation mail queued for ${mailSenderName} (${mailSenderCharacterId}) for ${characterName}'s loss`
  );
}

export { processMailsForSRP };
