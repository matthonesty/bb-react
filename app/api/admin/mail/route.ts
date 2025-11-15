/**
 * @fileoverview Admin Mail Management Endpoint
 *
 * Allows admins to read EVE in-game mail and manually trigger mail processing.
 * Requires admin authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';
import { getMailerAccessToken } from '@/lib/mailerToken';
import { getMailHeaders, getMailContent, getMailLabels, MAILER_CHARACTER_ID, checkESIHealth } from '@/lib/esi.js';
import { processMailsForSRP } from '@/lib/mail/processMailsForSRP';
import { sendQueuedMails } from '@/lib/mail/sendQueuedMails';
import { ROLES } from '@/lib/auth/roles';

import pool from '@/lib/db';

/**
 * GET /api/admin/mail
 *
 * Get mail headers for admin character or process mails
 * Query params:
 * - mailId: optional mail ID to get specific mail content
 * - labels: optional, if true, returns labels instead of mail
 * - processMails: if true, processes mails for SRP
 */
export async function GET(request: NextRequest) {
  // Check authentication and admin role
  const session = await getServerSession();

  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const isAdmin = session.roles?.some(role =>
    [ROLES.ADMIN, ROLES.COUNCIL, ROLES.ACCOUNTANT].includes(role as any)
  );

  if (!isAdmin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  try {
    // Get mailer service account access token
    let accessToken;
    try {
      accessToken = await getMailerAccessToken();
    } catch (error: any) {
      return NextResponse.json({
        error: 'No mailer token available',
        hint: 'Admin must authorize mailer service account via /api/auth/mailer-login first',
        details: error.message
      }, { status: 500 });
    }

    // Use mailer service account character ID
    const characterId = MAILER_CHARACTER_ID;

    if (!characterId) {
      return NextResponse.json({
        error: 'Mailer character ID not configured',
        hint: 'Set MAILER_CHARACTER_ID environment variable'
      }, { status: 500 });
    }

    const searchParams = request.nextUrl.searchParams;
    const mailId = searchParams.get('mailId');
    const labels = searchParams.get('labels');
    const processMails = searchParams.get('processMails');

    // Get specific mail content if mailId provided
    if (mailId) {
      const parsedMailId = parseInt(mailId, 10);
      if (isNaN(parsedMailId)) {
        return NextResponse.json(
          { success: false, error: 'Invalid mail ID' },
          { status: 400 }
        );
      }

      const mail = await getMailContent(accessToken, characterId, parsedMailId);

      return NextResponse.json({
        success: true,
        mail: mail
      });
    }

    // Get labels if requested
    if (labels === 'true') {
      const labelsData = await getMailLabels(accessToken, characterId);

      return NextResponse.json({
        success: true,
        labels: labelsData
      });
    }

    // Get mail headers (list)
    const options: any = {};
    const lastMailId = searchParams.get('lastMailId');
    if (lastMailId) {
      const parsedLastMailId = parseInt(lastMailId, 10);
      if (!isNaN(parsedLastMailId)) {
        options.lastMailId = parsedLastMailId;
      }
    }

    const mailHeaders = await getMailHeaders(accessToken, characterId, options);

    // Sort by timestamp descending (newest first)
    mailHeaders.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Auto-process mails for SRP if requested
    let processingResults = null;
    let queueResults = null;
    if (processMails === 'true') {
      // Check ESI health before processing
      console.log('[ADMIN MAIL] Checking ESI health status...');
      const health = await checkESIHealth() as {
        healthy: boolean;
        issues: string[];
        warnings: string[];
      };

      if (!health.healthy) {
        console.error('[ADMIN MAIL] ESI unhealthy, cannot process mails:', health.issues.join(', '));
        return NextResponse.json({
          success: false,
          error: 'ESI is currently unhealthy',
          esi_status: 'UNHEALTHY',
          issues: health.issues,
          warnings: health.warnings,
          hint: 'Wait for ESI to recover before processing mails'
        }, { status: 503 });
      }

      if (health.warnings.length > 0) {
        console.warn('[ADMIN MAIL] ESI degraded but proceeding:', health.warnings.join(', '));
      }


      // Step 1: Process incoming mails (queues rejection/confirmation mails)
      processingResults = await processMailsForSRP({
        accessToken,
        characterId,
        mailHeaders,
        db: pool
      });

      // Step 2: Send queued mails with rate limiting
      queueResults = await sendQueuedMails(accessToken);
    }

    return NextResponse.json({
      success: true,
      mailHeaders: mailHeaders,
      count: mailHeaders.length,
      processingResults: processingResults,
      queueResults: queueResults
    });
  } catch (error: any) {
    console.error('[ADMIN] Mail read error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
