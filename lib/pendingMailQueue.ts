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

import pool from './db';

export interface QueueMailParams {
  mailType: string;
  recipientCharacterId: number;
  payload: Record<string, any>;
  retryAfter: Date;
}

export interface PendingMail {
  id: number;
  mail_type: string;
  recipient_character_id: number;
  payload: Record<string, any>;
  retry_after: Date;
  attempts: number;
  last_error: string | null;
}

export interface QueueStats {
  total_queued: number;
  ready_to_send: number;
  waiting: number;
}

/**
 * Queue a mail send for later retry
 *
 * @param params - Mail parameters
 * @returns ID of the queued mail
 */
export async function queueMailSend({
  mailType,
  recipientCharacterId,
  payload,
  retryAfter,
}: QueueMailParams): Promise<number> {
  const result = await pool.query(
    `INSERT INTO pending_mail_sends (
      mail_type, recipient_character_id, payload, retry_after
    ) VALUES ($1, $2, $3, $4)
    RETURNING id`,
    [mailType, recipientCharacterId, JSON.stringify(payload), retryAfter]
  );

  const queueId = result.rows[0].id;
  console.log(
    `[MAIL QUEUE] Queued ${mailType} mail to ${recipientCharacterId} (ID: ${queueId}) - retry after ${retryAfter.toISOString()}`
  );

  return queueId;
}

/**
 * Get pending mails ready to retry (limited to 15 per batch)
 *
 * @returns Array of pending mail objects (max 15)
 */
export async function getPendingMailsReadyToSend(): Promise<PendingMail[]> {
  const result = await pool.query(
    `SELECT id, mail_type, recipient_character_id, payload, retry_after, attempts, last_error
     FROM pending_mail_sends
     WHERE retry_after <= NOW()
     ORDER BY retry_after ASC
     LIMIT 15`
  );

  return result.rows.map((row) => ({
    ...row,
    payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload,
  }));
}

/**
 * Mark a queued mail as successfully sent and remove from queue
 *
 * @param queueId - ID of the queued mail
 */
export async function markMailSent(queueId: number): Promise<void> {
  await pool.query('DELETE FROM pending_mail_sends WHERE id = $1', [queueId]);

  console.log(`[MAIL QUEUE] Mail ${queueId} sent successfully - removed from queue`);
}

/**
 * Update a queued mail with retry information (when still rate limited)
 *
 * @param queueId - ID of the queued mail
 * @param newRetryAfter - New retry time
 * @param error - Error message
 */
export async function updateMailRetry(
  queueId: number,
  newRetryAfter: Date,
  error: string
): Promise<void> {
  await pool.query(
    `UPDATE pending_mail_sends
     SET attempts = attempts + 1,
         retry_after = $2,
         last_error = $3,
         updated_at = NOW()
     WHERE id = $1`,
    [queueId, newRetryAfter, error]
  );

  console.log(
    `[MAIL QUEUE] Mail ${queueId} still rate limited - retry after ${newRetryAfter.toISOString()}`
  );
}

/**
 * Remove a mail from queue (when max attempts reached or permanent error)
 *
 * @param queueId - ID of the queued mail
 * @param reason - Reason for removal
 */
export async function removeMailFromQueue(queueId: number, reason: string): Promise<void> {
  await pool.query('DELETE FROM pending_mail_sends WHERE id = $1', [queueId]);

  console.log(`[MAIL QUEUE] Mail ${queueId} removed from queue - ${reason}`);
}

/**
 * Get pending mail queue statistics
 *
 * @returns Queue statistics
 */
export async function getQueueStats(): Promise<QueueStats> {
  const result = await pool.query(
    `SELECT
       COUNT(*) as total_queued,
       COUNT(*) FILTER (WHERE retry_after <= NOW()) as ready_to_send,
       COUNT(*) FILTER (WHERE retry_after > NOW()) as waiting
     FROM pending_mail_sends`
  );

  return result.rows[0];
}
