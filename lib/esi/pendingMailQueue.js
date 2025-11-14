/**
 * @fileoverview Pending Mail Queue Manager
 *
 * Manages queuing and retrying of mail sends that hit rate limits.
 * Works within Vercel's 5-minute execution limit by deferring
 * rate-limited mails to the next cron run.
 *
 * Process:
 * 1. When a mail fails with MailStopSpamming, queue it with retry_after time
 * 2. On next cron run, check for queued mails ready to retry
 * 3. Attempt to send queued mails with proper 15-second rate limiting
 * 4. Re-queue if still rate limited, or delete if successful
 */

const pool = require('../db.ts').default;

/**
 * Queue a mail send for later retry
 *
 * @param {Object} params - Mail parameters
 * @param {string} params.mailType - Type of mail ('confirmation', 'rejection', 'unapproved_ship')
 * @param {number} params.recipientCharacterId - Character ID of recipient
 * @param {Object} params.payload - Mail data (subject, body, sender, etc.)
 * @param {Date} params.retryAfter - When to retry sending
 * @returns {Promise<number>} ID of the queued mail
 */
async function queueMailSend({ mailType, recipientCharacterId, payload, retryAfter }) {
  const result = await pool.query(
    `INSERT INTO pending_mail_sends (
      mail_type, recipient_character_id, payload, retry_after
    ) VALUES ($1, $2, $3, $4)
    RETURNING id`,
    [mailType, recipientCharacterId, JSON.stringify(payload), retryAfter]
  );

  const queueId = result.rows[0].id;
  console.log(`[MAIL QUEUE] Queued ${mailType} mail to ${recipientCharacterId} (ID: ${queueId}) - retry after ${retryAfter.toISOString()}`);

  return queueId;
}

/**
 * Get pending mails ready to retry (limited to 15 per batch)
 *
 * @returns {Promise<Array>} Array of pending mail objects (max 15)
 */
async function getPendingMailsReadyToSend() {
  const result = await pool.query(
    `SELECT id, mail_type, recipient_character_id, payload, retry_after, attempts, last_error
     FROM pending_mail_sends
     WHERE retry_after <= NOW()
     ORDER BY retry_after ASC
     LIMIT 15`
  );

  return result.rows.map(row => ({
    ...row,
    payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload,
  }));
}

/**
 * Mark a queued mail as successfully sent and remove from queue
 *
 * @param {number} queueId - ID of the queued mail
 * @returns {Promise<void>}
 */
async function markMailSent(queueId) {
  await pool.query(
    'DELETE FROM pending_mail_sends WHERE id = $1',
    [queueId]
  );

  console.log(`[MAIL QUEUE] Mail ${queueId} sent successfully - removed from queue`);
}

/**
 * Update a queued mail with retry information (when still rate limited)
 *
 * @param {number} queueId - ID of the queued mail
 * @param {Date} newRetryAfter - New retry time
 * @param {string} error - Error message
 * @returns {Promise<void>}
 */
async function updateMailRetry(queueId, newRetryAfter, error) {
  await pool.query(
    `UPDATE pending_mail_sends
     SET attempts = attempts + 1,
         retry_after = $2,
         last_error = $3,
         updated_at = NOW()
     WHERE id = $1`,
    [queueId, newRetryAfter, error]
  );

  console.log(`[MAIL QUEUE] Mail ${queueId} still rate limited - retry after ${newRetryAfter.toISOString()}`);
}

/**
 * Remove a mail from queue (when max attempts reached or permanent error)
 *
 * @param {number} queueId - ID of the queued mail
 * @param {string} reason - Reason for removal
 * @returns {Promise<void>}
 */
async function removeMailFromQueue(queueId, reason) {
  await pool.query(
    'DELETE FROM pending_mail_sends WHERE id = $1',
    [queueId]
  );

  console.log(`[MAIL QUEUE] Mail ${queueId} removed from queue - ${reason}`);
}

/**
 * Get pending mail queue statistics
 *
 * @returns {Promise<Object>} Queue statistics
 */
async function getQueueStats() {
  const result = await pool.query(
    `SELECT
       COUNT(*) as total_queued,
       COUNT(*) FILTER (WHERE retry_after <= NOW()) as ready_to_send,
       COUNT(*) FILTER (WHERE retry_after > NOW()) as waiting
     FROM pending_mail_sends`
  );

  return result.rows[0];
}

module.exports = {
  queueMailSend,
  getPendingMailsReadyToSend,
  markMailSent,
  updateMailRetry,
  removeMailFromQueue,
  getQueueStats,
};
