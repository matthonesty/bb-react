/**
 * @fileoverview EVE ESI Mail Service
 *
 * Sends EVE in-game mail via ESI API.
 * Used for O'Bomber-care SRP confirmations and rejections.
 *
 * ESI Endpoint: POST /characters/{character_id}/mail
 * Required Scope: esi-mail.send_mail.v1
 * Rate Limit: 4 mails per minute per character
 *
 * @see {@link https://esi.evetech.net/ui/#/Mail/post_characters_character_id_mail}
 */

const { ESI_BASE_URL, esiGet, esiPost } = require('./helpers');
const { sleep } = require('../utils/async');

/**
 * Mailer service account character ID (sender of mails)
 * This is the character that performs ESI mail operations
 * Should match EVE_MAILER_CHARACTER_ID used for OAuth validation
 * @constant {number}
 */
const MAILER_CHARACTER_ID = parseInt(process.env.EVE_MAILER_CHARACTER_ID) || null;

/**
 * Send EVE mail
 *
 * @param {string} accessToken - Character access token (with mail send scope)
 * @param {number} senderCharacterId - Character ID sending the mail (must match access token)
 * @param {Object} mailData - Mail content and recipients
 * @param {string} mailData.subject - Mail subject (<= 1000 chars)
 * @param {string} mailData.body - Mail body (<= 10000 chars, supports HTML)
 * @param {Array<Object>} mailData.recipients - Array of recipients
 * @param {number} mailData.recipients[].recipient_id - Character/corp/alliance ID
 * @param {string} mailData.recipients[].recipient_type - Type: 'character', 'corporation', 'alliance', 'mailing_list'
 * @returns {Promise<number>} Mail ID of sent mail
 *
 * @example
 * const mailId = await sendMail(accessToken, 2123814259, {
 *   subject: "SRP Request Received",
 *   body: "Your SRP request has been received!",
 *   recipients: [{ recipient_id: 123456, recipient_type: 'character' }]
 * });
 */
async function sendMail(accessToken, senderCharacterId, { subject, body, recipients }) {
  const url = `${ESI_BASE_URL}/characters/${senderCharacterId}/mail`;

  const payload = {
    approved_cost: 0,
    body: body,
    recipients: recipients,
    subject: subject
  };

  return await esiPost(url, payload, accessToken); // Returns mail ID
}

/**
 * Send SRP request confirmation mail
 *
 * Sent when an SRP request is received and processed.
 *
 * @param {string} accessToken - Character access token (with mail send scope)
 * @param {number} senderCharacterId - Character ID sending the mail (must match access token)
 * @param {number} recipientCharacterId - Recipient character ID
 * @param {string} recipientCharacterName - Recipient character name
 * @param {string} shipName - Ship type lost
 * @param {Date} lossDate - Date/time of loss
 * @param {number} payoutAmount - Expected payout amount in ISK
 * @param {string} killmailUrl - Zkillboard URL for the loss
 * @returns {Promise<number>} Mail ID
 */
async function sendSRPConfirmationMail(accessToken, senderCharacterId, recipientCharacterId, recipientCharacterName, shipName, lossDate, payoutAmount, killmailUrl) {
  const subject = "O'Bomber-care - SRP Request Received";

  // Format payout amount with commas
  const formattedPayout = payoutAmount.toLocaleString('en-US');

  // Format loss date
  const lossDateStr = new Date(lossDate).toISOString().split('T')[0];
  const lossTimeStr = new Date(lossDate).toISOString().split('T')[1].split('.')[0];

  const body = `<b>SRP Request Received</b>

Greetings ${recipientCharacterName},

Your O'Bomber-care SRP request has been received and is now pending review.

<b>Request Details:</b>
• Pilot: ${recipientCharacterName}
• Ship: ${shipName}
• Loss Date: ${lossDateStr} ${lossTimeStr}
• Expected Payout: ${formattedPayout} ISK
• Killmail: <url=${killmailUrl}>${killmailUrl}</url>

Your request will be reviewed by leadership and processed accordingly. If approved, ISK will be sent directly to your character.

Fly safe.

- Bombers Bar Leadership

---
<b>O'Bomber-care</b> is Bombers Bar's ship replacement program. Questions? Contact leadership on the Bombers Bar Discord <url=https://discord.gg/yqQFDqRXvr>https://discord.gg/yqQFDqRXvr</url>`.trim();

  return await sendMail(accessToken, senderCharacterId, {
    subject,
    body,
    recipients: [
      {
        recipient_id: recipientCharacterId,
        recipient_type: 'character'
      }
    ]
  });
}

/**
 * Send SRP request rejection mail
 *
 * Sent when an SRP request is rejected (e.g., wrong pilot submitting)
 *
 * @param {string} accessToken - Character access token (with mail send scope)
 * @param {number} mailSenderCharacterId - Character ID sending the mail (must match access token)
 * @param {number} rejectedCharacterId - Character who sent the request (recipient of rejection)
 * @param {string} rejectedCharacterName - Name of sender who got rejected
 * @param {string} victimCharacterName - Name of actual victim in killmail
 * @param {string} killmailUrl - Zkillboard URL
 * @returns {Promise<number>} Mail ID
 */
async function sendSRPRejectionMail(accessToken, mailSenderCharacterId, rejectedCharacterId, rejectedCharacterName, victimCharacterName, killmailUrl) {
  const subject = "O'Bomber-care - SRP Request Rejected (Pilot Mismatch)";

  const body = `<b>SRP Request Rejected</b>

Greetings ${rejectedCharacterName},

Your O'Bomber-care SRP request has been automatically rejected.

<b>Reason:</b>
The pilot in the killmail (${victimCharacterName}) does not match your character (${rejectedCharacterName}).

<b>What to do:</b>
If this is your loss on an alt character, please have <b>${victimCharacterName}</b> submit the SRP request directly by sending a mail with the killmail link.

If you believe this is an error, please contact leadership on Discord.

<b>Killmail:</b> <url=${killmailUrl}>${killmailUrl}</url>

Fly safe.

- Bombers Bar Leadership

---
<b>O'Bomber-care</b> is Bombers Bar's ship replacement program. Questions? Contact leadership on the Bombers Bar Discord <url=https://discord.gg/yqQFDqRXvr>https://discord.gg/yqQFDqRXvr</url>`.trim();

  return await sendMail(accessToken, mailSenderCharacterId, {
    subject,
    body,
    recipients: [
      {
        recipient_id: rejectedCharacterId,
        recipient_type: 'character'
      }
    ]
  });
}

/**
 * Send unapproved ship type rejection mail
 *
 * Sent when an SRP request is for a ship type not covered by O'Bomber-care
 *
 * @param {string} accessToken - Character access token (with mail send scope)
 * @param {number} mailSenderCharacterId - Character ID sending the mail (must match access token)
 * @param {number} rejectedCharacterId - Character who sent the request (recipient of rejection)
 * @param {string} rejectedCharacterName - Name of sender who got rejected
 * @param {string} shipName - Ship type that was lost
 * @param {string} killmailUrl - Zkillboard URL
 * @param {Object} approvedShipsMap - Pre-loaded approved ships map from getAllApprovedShips()
 * @returns {Promise<number>} Mail ID
 */
async function sendUnapprovedShipMail(accessToken, mailSenderCharacterId, rejectedCharacterId, rejectedCharacterName, shipName, killmailUrl, approvedShipsMap) {
  const subject = "O'Bomber-care - SRP Request Rejected (Ship Not Covered)";

  // Import getShipsByGroup helper
  const { getShipsByGroup } = require('../srp/shipTypes');

  // Build dynamic ship list from database
  const shipsByGroup = getShipsByGroup(approvedShipsMap);

  let shipList = '';
  for (const [groupName, ships] of Object.entries(shipsByGroup)) {
    const shipNames = ships.map(s => s.name).join(', ');

    // Add notes if any ship in the group has them (e.g., "Hunters/Links Only")
    const shipWithNotes = ships.find(s => s.notes);
    const notesSuffix = shipWithNotes ? ` - <b>*${shipWithNotes.notes}</b>` : '';

    shipList += `• ${groupName} (${shipNames}${notesSuffix})\n`;
  }

  const body = `<b>SRP Request - Ship Not Covered</b>

Greetings ${rejectedCharacterName},

Your O'Bomber-care SRP request has been automatically rejected.

<b>Reason:</b>
The ship type (${shipName}) is not covered under the O'Bomber-care program.

<b>Covered Ship Types:</b>
${shipList}

If you believe this is an error or have questions about coverage, please contact leadership on the Bombers Bar Discord.

<b>Killmail:</b> <url=${killmailUrl}>${killmailUrl}</url>

Fly safe.

- Bombers Bar Leadership

---
<b>O'Bomber-care</b> is Bombers Bar's ship replacement program. Questions? Contact leadership on the Bombers Bar Discord <url=https://discord.gg/yqQFDqRXvr>https://discord.gg/yqQFDqRXvr</url>`.trim();

  return await sendMail(accessToken, mailSenderCharacterId, {
    subject,
    body,
    recipients: [
      {
        recipient_id: rejectedCharacterId,
        recipient_type: 'character'
      }
    ]
  });
}

/**
 * Send mails with rate limiting
 *
 * EVE ESI rate limit: 4 mails per minute (15 seconds between mails)
 * This function processes mails sequentially with delays.
 *
 * @param {string} accessToken - Admin character access token
 * @param {Array<Object>} mailBatch - Array of mail objects
 * @param {Function} mailBatch[].sendFunction - Function to send the mail (returns Promise)
 * @param {number} [delayMs=15000] - Delay between mails in milliseconds (default: 15s for 4/minute)
 * @returns {Promise<Array>} Results array with success/error status
 */
async function sendMailsWithRateLimit(accessToken, mailBatch, delayMs = 15000) {
  const results = [];

  for (let i = 0; i < mailBatch.length; i++) {
    const mailJob = mailBatch[i];

    try {
      const result = await mailJob.sendFunction();
      results.push({
        index: i,
        status: 'success',
        result: result,
        ...mailJob.metadata
      });

      console.log(`[MAIL RATE LIMIT] Sent mail ${i + 1}/${mailBatch.length}`);

      // Delay between mails (except after last mail)
      if (i < mailBatch.length - 1) {
        console.log(`[MAIL RATE LIMIT] Waiting ${delayMs}ms before next mail...`);
        await sleep(delayMs);
      }
    } catch (error) {
      results.push({
        index: i,
        status: 'error',
        error: error.message,
        ...mailJob.metadata
      });

      console.error(`[MAIL RATE LIMIT] Error sending mail ${i + 1}/${mailBatch.length}:`, error.message);

      // Still delay even on error to maintain rate limit
      if (i < mailBatch.length - 1) {
        await sleep(delayMs);
      }
    }
  }

  return results;
}

/**
 * Get mail headers for a character
 *
 * Retrieves the list of mail headers (metadata) for a character.
 * Does not include mail body - use getMailContent() to get full mail.
 *
 * @param {string} accessToken - Character access token (with mail read scope)
 * @param {number} characterId - Character ID to get mail for
 * @param {Object} [options] - Optional parameters
 * @param {number} [options.lastMailId] - Return only mails newer than this ID
 * @param {Array<string>} [options.labels] - Filter by label IDs
 * @returns {Promise<Array>} Array of mail headers
 *
 * @example
 * const mailHeaders = await getMailHeaders(accessToken, 90504880);
 * // Returns: [{ mail_id, subject, from, timestamp, is_read, recipients, labels }, ...]
 */
async function getMailHeaders(accessToken, characterId, options = {}) {
  const url = `${ESI_BASE_URL}/characters/${characterId}/mail`;
  const params = {};

  if (options.lastMailId) {
    params.last_mail_id = options.lastMailId;
  }

  if (options.labels && options.labels.length > 0) {
    params.labels = options.labels.join(',');
  }

  return await esiGet(url, accessToken, params);
}

/**
 * Get full mail content
 *
 * Retrieves the complete mail including body content.
 *
 * @param {string} accessToken - Character access token (with mail read scope)
 * @param {number} characterId - Character ID that owns the mail
 * @param {number} mailId - Mail ID to retrieve
 * @returns {Promise<Object>} Mail object with full content
 *
 * @example
 * const mail = await getMailContent(accessToken, 90504880, 123456);
 * // Returns: { mail_id, subject, from, timestamp, body, recipients, labels, is_read }
 */
async function getMailContent(accessToken, characterId, mailId) {
  const url = `${ESI_BASE_URL}/characters/${characterId}/mail/${mailId}`;
  return await esiGet(url, accessToken);
}

/**
 * Get mail labels for a character
 *
 * Retrieves custom mail labels/folders for a character.
 *
 * @param {string} accessToken - Character access token (with mail read scope)
 * @param {number} characterId - Character ID to get labels for
 * @returns {Promise<Object>} Labels object with labels array and total_unread_count
 *
 * @example
 * const labelsData = await getMailLabels(accessToken, 90504880);
 * // Returns: { labels: [{ label_id, name, unread_count, color }], total_unread_count }
 */
async function getMailLabels(accessToken, characterId) {
  const url = `${ESI_BASE_URL}/characters/${characterId}/mail/labels`;
  return await esiGet(url, accessToken);
}

module.exports = {
  MAILER_CHARACTER_ID,
  sendMail,
  sendSRPConfirmationMail,
  sendSRPRejectionMail,
  sendUnapprovedShipMail,
  sendMailsWithRateLimit,
  getMailHeaders,
  getMailContent,
  getMailLabels
};
