/**
 * @fileoverview Automated SRP Mail Processing Cron Job
 *
 * Periodically checks for new EVE mails and auto-creates SRP requests.
 * Runs on a schedule (e.g., every 5 minutes) to process incoming mails.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getMailerAccessToken } from '@/lib/mailerToken';
import { getMailHeaders, MAILER_CHARACTER_ID, checkESIHealth } from '@/lib/esi';
import { getQueueStats } from '@/lib/pendingMailQueue';
import { processMailsForSRP } from '@/lib/mail/processMailsForSRP';
import { sendQueuedMails } from '@/lib/mail/sendQueuedMails';
import { runWalletReconciliation } from '@/lib/wallet/reconciliation';

import pool from '@/lib/db';

/**
 * Post cron results to Discord webhook
 */
async function postToDiscord(results: any) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

  if (!webhookUrl) {
    console.warn('[DISCORD] DISCORD_WEBHOOK_URL not configured, skipping Discord notification');
    return;
  }

  // Check if there's anything worth reporting
  const hasActivity =
    results.processed > 0 ||
    results.created > 0 ||
    (results.errors && results.errors.length > 0) ||
    results.reconciliationError ||
    !results.success ||
    (results.journalEntriesSaved && results.journalEntriesSaved > 0) ||
    (results.paymentsReconciled && results.paymentsReconciled > 0);

  if (!hasActivity) {
    console.log('[DISCORD] No activity to report, skipping Discord notification');
    return;
  }

  try {
    const timestamp = new Date().toISOString();
    const durationSeconds = (results.duration_ms / 1000).toFixed(2);

    // Determine status color
    let color = 3066993; // Green
    if (!results.success || results.errors.length > 0) {
      color = 15158332; // Red
    } else if (results.reconciliationError) {
      color = 15105570; // Orange
    }

    // Build fields
    const fields = [];

    // ESI Health Status
    if (results.esiHealth) {
      const warningText =
        results.esiHealth.warnings && results.esiHealth.warnings.length > 0
          ? `\n${results.esiHealth.warnings.join('\n')}`
          : '';

      fields.push({
        name: 'ESI Status',
        value: `${results.esiHealth.status}${warningText}`,
        inline: true,
      });
    }

    fields.push(
      {
        name: 'Mail Processing',
        value: `Processed: ${results.processed}\nCreated: ${results.created}\nSkipped: ${results.skipped}`,
        inline: true,
      },
      {
        name: 'Wallet Reconciliation',
        value: results.reconciliationError
          ? `Error: ${results.reconciliationError}`
          : `Journal Entries: ${results.journalEntriesSaved || 0}\nPayments Reconciled: ${results.paymentsReconciled || 0}`,
        inline: true,
      },
      {
        name: 'Performance',
        value: `Duration: ${durationSeconds}s`,
        inline: false,
      }
    );

    // Add errors if any
    if (results.errors && results.errors.length > 0) {
      const errorMessages = results.errors
        .slice(0, 3)
        .map((err: any) => `Mail ${err.mail_id} (${err.subject}): ${err.error}`)
        .join('\n');
      const moreErrors =
        results.errors.length > 3 ? `\n... and ${results.errors.length - 3} more` : '';

      fields.push({
        name: 'Errors',
        value: errorMessages + moreErrors,
        inline: false,
      });
    }

    const embed = {
      title: results.success ? 'Cron Job Complete' : 'Cron Job Failed',
      description: `**O'Bomber-care** automated processing completed`,
      color: color,
      fields: fields,
      timestamp: timestamp,
      footer: {
        text: 'Bombers Bar SRP System',
      },
    };

    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] }),
    });

    console.log('[DISCORD] Posted cron results to Discord');
  } catch (error: any) {
    console.error('[DISCORD] Failed to post to Discord:', error.message);
  }
}

/**
 * GET /api/cron/process-mail - Process new EVE mails for SRP requests
 *
 * This endpoint should be called periodically by a cron job (e.g., Vercel Cron).
 * Security: Check for authorization header or run on internal schedule only.
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const results = {
    success: true,
    processed: 0,
    created: 0,
    skipped: 0,
    errors: [] as any[],
    duration_ms: 0,
    esiHealth: null as any,
    journalEntriesSaved: 0,
    paymentsReconciled: 0,
    reconciliationError: null as string | null,
  };

  try {
    console.log('[MAIL CRON] Starting automated mail processing...');

    // Validate mailer character ID is configured
    if (!MAILER_CHARACTER_ID) {
      console.error('[MAIL CRON] MAILER_CHARACTER_ID not configured');
      return NextResponse.json(
        {
          success: false,
          error: 'Mailer character ID not configured',
          hint: 'Set MAILER_CHARACTER_ID environment variable',
        },
        { status: 500 }
      );
    }

    // Step 0: Check ESI health before processing
    console.log('[MAIL CRON] Checking ESI health status...');
    const health = (await checkESIHealth()) as {
      healthy: boolean;
      issues: string[];
      warnings: string[];
    };

    if (!health.healthy) {
      console.error(
        '[MAIL CRON] ESI unhealthy, skipping mail processing:',
        health.issues.join(', ')
      );

      const skipResults = {
        ...results,
        duration_ms: Date.now() - startTime,
        message: 'Skipped - ESI Unhealthy',
        errors: health.issues,
        esiHealth: {
          status: 'UNHEALTHY',
          warnings: health.warnings,
        },
      };

      await postToDiscord(skipResults);

      return NextResponse.json({
        success: true,
        message: 'Mail processing skipped due to ESI health issues',
        esi_status: 'UNHEALTHY',
        issues: health.issues,
        warnings: health.warnings,
      });
    }

    if (health.warnings.length > 0) {
      console.warn('[MAIL CRON] ESI degraded but proceeding:', health.warnings.join(', '));
    }

    // Store ESI health in results for Discord notification
    results.esiHealth = {
      status: health.healthy ? (health.warnings.length > 0 ? 'DEGRADED' : 'OK') : 'UNHEALTHY',
      warnings: health.warnings,
    };

    // Get mailer service account access token
    let accessToken;
    try {
      accessToken = await getMailerAccessToken();
      console.log('[MAIL CRON] Mailer access token obtained');
    } catch (error: any) {
      console.error('[MAIL CRON] Failed to get mailer access token:', error.message);

      const tokenErrorResults = {
        ...results,
        success: false,
        errors: [`Failed to get mailer token: ${error.message}`],
        duration_ms: Date.now() - startTime,
      };

      await postToDiscord(tokenErrorResults);

      return NextResponse.json(
        {
          success: false,
          error:
            'No mailer token available. Admin must authorize mailer service account via /api/auth/mailer-login first.',
          details: error.message,
        },
        { status: 500 }
      );
    }

    // Step 1: Process queued mails from previous runs (that hit rate limits)
    console.log('[MAIL CRON] Checking for queued mails to retry...');
    const queueStats = await getQueueStats();
    console.log(`[MAIL CRON] Queue stats:`, queueStats);

    await sendQueuedMails(accessToken);

    // Step 2: Reconcile SRP payments from wallet journal
    console.log('[MAIL CRON] Running wallet reconciliation...');
    try {
      const reconciliationResults = (await runWalletReconciliation(pool)) as {
        journalSaved: number;
        paymentsReconciled: number;
      };
      console.log(`[MAIL CRON] Reconciliation complete:`, reconciliationResults);
      results.journalEntriesSaved = reconciliationResults.journalSaved;
      results.paymentsReconciled = reconciliationResults.paymentsReconciled;
    } catch (error: any) {
      console.error('[MAIL CRON] Wallet reconciliation failed (non-fatal):', error.message);
      results.reconciliationError = error.message;
    }

    // Step 3: Fetch recent mail headers (last 30 days)
    console.log('[MAIL CRON] Fetching mail headers...');
    const mailHeaders = await getMailHeaders(accessToken, MAILER_CHARACTER_ID, {});
    console.log(`[MAIL CRON] Found ${mailHeaders.length} total mails`);

    // Process mails using shared module
    const processingResults = (await processMailsForSRP({
      accessToken,
      characterId: MAILER_CHARACTER_ID,
      mailHeaders,
      db: pool,
    })) as {
      processed: number;
      created: number;
      skipped: number;
      errors: any[];
    };

    // Update results with processing outcomes
    results.processed = processingResults.processed;
    results.created = processingResults.created;
    results.skipped = processingResults.skipped;
    results.errors = processingResults.errors;

    results.duration_ms = Date.now() - startTime;

    console.log('[MAIL CRON] Processing complete:', JSON.stringify(results, null, 2));

    // Post results to Discord
    await postToDiscord(results);

    return NextResponse.json({
      success: true,
      message: 'Mail processing complete',
      results: results,
    });
  } catch (error: any) {
    results.duration_ms = Date.now() - startTime;
    results.success = false;
    results.errors.push(`Fatal error: ${error.message}`);

    console.error('[MAIL CRON] Fatal error:', error);

    // Post error results to Discord
    await postToDiscord(results);

    return NextResponse.json(
      {
        success: false,
        error: error.message,
        results: results,
      },
      { status: 500 }
    );
  }
}
