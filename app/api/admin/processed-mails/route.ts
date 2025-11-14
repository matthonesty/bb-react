/**
 * @fileoverview Admin API for Processed Mails
 *
 * Allows admins to view and manage processed mails from the mailer system.
 * Requires admin authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';

const Database = require('@/src/database') as {
  getInstance: () => Promise<any>;
};

/**
 * GET /api/admin/processed-mails
 *
 * List processed mails with filters
 * Query params:
 * - status: filter by status (optional)
 * - limit: number of results (default 100)
 * - offset: pagination offset (default 0)
 * - mail_id: get single mail with full details (optional)
 */
export async function GET(request: NextRequest) {
  // Check authentication and admin role
  const session = await getServerSession();

  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const isAdmin = session.roles?.some(role =>
    ['admin', 'Council', 'Accountant', 'FC'].includes(role)
  );

  if (!isAdmin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  try {
    const db = await Database.getInstance();
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');
    const mail_id = searchParams.get('mail_id');

    // Get single mail with full details
    if (mail_id) {
      const result = await db.query(
        'SELECT * FROM processed_mails WHERE mail_id = $1',
        [mail_id]
      );

      if (result.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Mail not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        mail: result.rows[0]
      });
    }

    // List view - only essential columns
    let query = `
      SELECT
        mail_id,
        from_character_id,
        sender_name,
        subject,
        mail_timestamp,
        processed_at,
        status,
        srp_request_id,
        error_message
      FROM processed_mails
      WHERE 1=1
    `;
    const params: any[] = [];

    if (status) {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }

    query += ` ORDER BY processed_at DESC`;

    // Add pagination
    params.push(limit);
    query += ` LIMIT $${params.length}`;

    params.push(offset);
    query += ` OFFSET $${params.length}`;

    const result = await db.query(query, params);

    // Get total count for pagination
    let countQuery = `SELECT COUNT(*) FROM processed_mails WHERE 1=1`;
    const countParams: any[] = [];
    if (status) {
      countParams.push(status);
      countQuery += ` AND status = $${countParams.length}`;
    }
    const countResult = await db.query(countQuery, countParams);

    return NextResponse.json({
      success: true,
      mails: result.rows,
      count: result.rows.length,
      total: parseInt(countResult.rows[0].count),
      limit,
      offset
    });
  } catch (error: any) {
    console.error('[ADMIN] Processed mails error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/processed-mails
 *
 * Delete a processed mail (allows reprocessing on next cron run)
 * Query params:
 * - mail_id: required
 */
export async function DELETE(request: NextRequest) {
  // Check authentication and admin role
  const session = await getServerSession();

  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // FC and Accountant are view-only, cannot delete
  const isAdmin = session.roles?.some(role =>
    ['admin', 'Council'].includes(role)
  );

  if (!isAdmin) {
    return NextResponse.json({ error: 'Admin or Council access required' }, { status: 403 });
  }

  try {
    const db = await Database.getInstance();
    const searchParams = request.nextUrl.searchParams;
    const mail_id = searchParams.get('mail_id');

    if (!mail_id) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameter: mail_id' },
        { status: 400 }
      );
    }

    const result = await db.query(
      'DELETE FROM processed_mails WHERE mail_id = $1 RETURNING *',
      [mail_id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Processed mail not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Processed mail deleted successfully'
    });
  } catch (error: any) {
    console.error('[ADMIN] Delete processed mail error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
