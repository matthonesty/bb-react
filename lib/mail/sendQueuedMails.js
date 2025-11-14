/**
 * @fileoverview Shared Queue Processing Logic
 *
 * Handles sending queued mails with rate limiting.
 * Used by both admin manual processing and cron job.
 */

import { sendSRPConfirmationMail, sendSRPRejectionMail, sendUnapprovedShipMail, sendMail, sendMailsWithRateLimit } from '../esi/mail.js';
import { parseMailStopSpammingError } from '../esi/helpers.js';
import { getPendingMailsReadyToSend, markMailSent, updateMailRetry } from '../esi/pendingMailQueue.js';
import { getAllApprovedShips } from '../srp/shipTypes.js';
import { resolveNames } from '../esi/universe.js';

/**
 * Process and send queued mails with rate limiting (max 15 per run)
 *
 * @param {string} accessToken - ESI access token
 * @returns {Promise<Object>} Results of queue processing
 */
async function sendQueuedMails(accessToken) {
  const queuedMails = await getPendingMailsReadyToSend();
  console.log(`[MAIL QUEUE] Found ${queuedMails.length} queued mail(s) ready to send (max 15 per batch)`);

  if (queuedMails.length === 0) {
    return { sent: 0, failed: 0, retrying: 0 };
  }

  // Load approved ships once at start for unapproved_ship mail templates
  const approvedShips = await getAllApprovedShips();
  console.log(`[MAIL QUEUE] Loaded ${Object.keys(approvedShips).length} approved ship types for mail templates`);

  // Build batch of mail send functions
  const mailBatch = queuedMails.map(queuedMail => {
    const payload = queuedMail.payload;

    return {
      queueId: queuedMail.id,
      mailType: queuedMail.mail_type,
      recipientId: queuedMail.recipient_character_id,
      attempts: queuedMail.attempts,
      sendFunction: async () => {
        console.log(`[MAIL QUEUE] Sending ${queuedMail.mail_type} mail to ${queuedMail.recipient_character_id} (attempt ${queuedMail.attempts + 1})`);

        if (queuedMail.mail_type === 'confirmation') {
          return await sendSRPConfirmationMail(
            accessToken,
            payload.senderCharacterId,
            payload.recipientCharacterId,
            payload.recipientCharacterName,
            payload.shipName,
            payload.lossDate,
            payload.payoutAmount,
            payload.killmailUrl
          );
        } else if (queuedMail.mail_type === 'rejection') {
          return await sendSRPRejectionMail(
            accessToken,
            payload.mailSenderCharacterId,
            payload.rejectedCharacterId,
            payload.rejectedCharacterName,
            payload.victimCharacterName,
            payload.killmailUrl
          );
        } else if (queuedMail.mail_type === 'unapproved_ship') {
          return await sendUnapprovedShipMail(
            accessToken,
            payload.mailSenderCharacterId,
            payload.rejectedCharacterId,
            payload.rejectedCharacterName,
            payload.shipName,
            payload.killmailUrl,
            approvedShips // Pass ships map for dynamic template
          );
        } else if (queuedMail.mail_type === 'too_old_rejection') {
          return await sendMail(accessToken, payload.senderCharacterId, {
            subject: "O'Bomber-care - SRP Request Rejected (Too Old)",
            body: `<b>SRP Request Rejected - Killmail Too Old</b>

Greetings ${payload.recipientName},

Your O'Bomber-care SRP request has been automatically rejected.

<b>Reason:</b>
The killmail is ${payload.daysSinceKill} days old. O'Bomber-care only covers losses within the last 30 days.

<b>Killmail Details:</b>
• Kill Date: ${payload.killDate}
• Days Since Loss: ${payload.daysSinceKill} days
• Killmail: <url=${payload.killmailUrl}>${payload.killmailUrl}</url>

Please submit SRP requests within 30 days of your loss.

Fly safe.

- Bombers Bar Leadership

---
<b>O'Bomber-care</b> is Bombers Bar's ship replacement program. Questions? Contact leadership on the Bombers Bar Discord <url=https://discord.gg/yqQFDqRXvr>https://discord.gg/yqQFDqRXvr</url>`.trim(),
            recipients: [
              {
                recipient_id: payload.recipientCharacterId,
                recipient_type: 'character'
              }
            ]
          });
        } else if (queuedMail.mail_type === 'duplicate_pending_rejection') {
          return await sendMail(accessToken, payload.senderCharacterId, {
            subject: "O'Bomber-care - SRP Request Already Submitted",
            body: `<b>SRP Request Already Exists</b>

Greetings ${payload.recipientName},

Your O'Bomber-care SRP request has been automatically rejected.

<b>Reason:</b>
This killmail has already been submitted and is being processed (Request #${payload.srpRequestId}).

<b>Killmail:</b>
<url=${payload.killmailUrl}>${payload.killmailUrl}</url>

Please do not submit the same killmail multiple times. If you have questions about the status of your SRP request, please contact Bombers Bar leadership.

Fly safe.

- Bombers Bar Leadership

---
<b>O'Bomber-care</b> is Bombers Bar's ship replacement program. Questions? Contact leadership on the Bombers Bar Discord <url=https://discord.gg/yqQFDqRXvr>https://discord.gg/yqQFDqRXvr</url>`.trim(),
            recipients: [
              {
                recipient_id: payload.recipientCharacterId,
                recipient_type: 'character'
              }
            ]
          });
        } else if (queuedMail.mail_type === 'duplicate_paid_rejection') {
          const paidDate = payload.paidDate ? new Date(payload.paidDate).toISOString().split('T')[0] : 'Unknown';
          const formattedAmount = payload.paidAmount ? payload.paidAmount.toLocaleString() : 'Unknown';

          return await sendMail(accessToken, payload.senderCharacterId, {
            subject: "O'Bomber-care - SRP Request Rejected (Already Paid)",
            body: `<b>SRP Request Already Paid</b>

Greetings ${payload.recipientName},

Your O'Bomber-care SRP request has been automatically rejected.

<b>Reason:</b>
This killmail has already been paid out (Request #${payload.srpRequestId}).

<b>Payment Details:</b>
• Amount Paid: ${formattedAmount} ISK
• Payment Date: ${paidDate}
• Killmail: <url=${payload.killmailUrl}>${payload.killmailUrl}</url>

You cannot receive SRP payment twice for the same loss. If you believe this is an error, please contact Bombers Bar leadership.

Fly safe.

- Bombers Bar Leadership

---
<b>O'Bomber-care</b> is Bombers Bar's ship replacement program. Questions? Contact leadership on the Bombers Bar Discord <url=https://discord.gg/yqQFDqRXvr>https://discord.gg/yqQFDqRXvr</url>`.trim(),
            recipients: [
              {
                recipient_id: payload.recipientCharacterId,
                recipient_type: 'character'
              }
            ]
          });
        } else if (queuedMail.mail_type === 'multiple_killmails_rejection') {
          // Resolve recipient name
          const recipientName = await resolveNames([payload.recipientCharacterId])
            .then(names => names[0]?.name || 'Pilot')
            .catch(() => 'Pilot');

          // Support both old and new payload structures
          const senderCharId = payload.senderCharacterId || payload.mailSenderCharacterId;

          return await sendMail(accessToken, senderCharId, {
            subject: "O'Bomber-care - SRP Request Rejected (Multiple Killmails)",
            body: `<b>SRP Request Rejected - Multiple Killmail Links</b>

Greetings ${recipientName},

Your O'Bomber-care SRP request has been automatically rejected.

<b>Reason:</b>
Your mail contained ${payload.totalKillmailLinks} killmail links. O'Bomber-care requires one mail per killmail for proper tracking and payment.

<b>What to do:</b>
Please submit separate SRP requests for each loss. Each mail should contain only one killmail link.

Fly safe.

- Bombers Bar Leadership

---
<b>O'Bomber-care</b> is Bombers Bar's ship replacement program. Questions? Contact leadership on the Bombers Bar Discord <url=https://discord.gg/yqQFDqRXvr>https://discord.gg/yqQFDqRXvr</url>`.trim(),
            recipients: [
              {
                recipient_id: payload.recipientCharacterId,
                recipient_type: 'character'
              }
            ]
          });
        } else if (queuedMail.mail_type === 'manual_denial') {
          return await sendMail(accessToken, payload.senderCharacterId, {
            subject: "O'Bomber-care - SRP Request Denied",
            body: `<b>SRP Request Denied</b>

Greetings ${payload.recipientName},

Your O'Bomber-care SRP request has been denied by an administrator.

<b>Reason:</b>
${payload.denialReason}

<b>Killmail:</b>
<url=${payload.killmailUrl}>${payload.killmailUrl}</url>

If you believe this was in error or have questions, please contact Bombers Bar leadership on Discord.

Fly safe.

- Bombers Bar Leadership

---
<b>O'Bomber-care</b> is Bombers Bar's ship replacement program. Questions? Contact leadership on the Bombers Bar Discord <url=https://discord.gg/yqQFDqRXvr>https://discord.gg/yqQFDqRXvr</url>`.trim(),
            recipients: [
              {
                recipient_id: payload.recipientCharacterId,
                recipient_type: 'character'
              }
            ]
          });
        } else if (queuedMail.mail_type === 'manual_approval') {
          const formattedAmount = payload.payoutAmount ? payload.payoutAmount.toLocaleString() : 'Unknown';

          return await sendMail(accessToken, payload.senderCharacterId, {
            subject: "O'Bomber-care - SRP Approved & Paid!",
            body: `<b>SRP Request Approved & Paid</b>

Greetings ${payload.recipientName},

Great news! Your O'Bomber-care SRP request has been approved and paid.

<b>Payout Amount:</b>
${formattedAmount} ISK

<b>Ship Loss:</b>
${payload.shipName}

<b>Killmail:</b>
<url=${payload.killmailUrl}>${payload.killmailUrl}</url>

The ISK has been transferred to your account. Check your wallet!

Fly safe.

- Bombers Bar Leadership

---
<b>O'Bomber-care</b> is Bombers Bar's ship replacement program. Questions? Contact leadership on the Bombers Bar Discord <url=https://discord.gg/yqQFDqRXvr>https://discord.gg/yqQFDqRXvr</url>`.trim(),
            recipients: [
              {
                recipient_id: payload.recipientCharacterId,
                recipient_type: 'character'
              }
            ]
          });
        }
      }
    };
  });

  // Send with rate limiting (15 seconds between each)
  console.log(`[MAIL QUEUE] Sending ${mailBatch.length} queued mail(s) with rate limiting (15s delays)...`);
  const results = await sendMailsWithRateLimit(accessToken, mailBatch);

  // Track results
  const queueResults = {
    sent: 0,
    failed: 0,
    retrying: 0
  };

  // Process results
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const mailJob = mailBatch[i];

    if (result.status === 'success') {
      // Success! Remove from queue
      await markMailSent(mailJob.queueId);
      queueResults.sent++;
      console.log(`[MAIL QUEUE] Successfully sent queued mail ${mailJob.queueId} (${mailJob.mailType})`);
    } else {
      // Failed - check error type
      const errorMessage = result.error || 'Unknown error';
      const spamError = parseMailStopSpammingError(result.error);

      if (spamError) {
        // Still rate limited - update retry time
        await updateMailRetry(mailJob.queueId, spamError.retryAfterDate, errorMessage);
        queueResults.retrying++;
        console.log(`[MAIL QUEUE] Mail ${mailJob.queueId} still rate limited - retry in ${spamError.retryAfterMinutes} minutes`);
      } else {
        // Different error - retry on next run
        await updateMailRetry(mailJob.queueId, new Date(), errorMessage);
        queueResults.failed++;
        console.log(`[MAIL QUEUE] Mail ${mailJob.queueId} failed - will retry on next run: ${errorMessage}`);
      }
    }
  }

  return queueResults;
}

export {
  sendQueuedMails
};
