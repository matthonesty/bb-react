/**
 * @fileoverview Admin Wallet History Endpoint
 *
 * Displays wallet journal history from the database (wallet_journal table).
 * Shows enriched data with names already resolved.
 * Requires admin authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';
import pool from '@/lib/db';

/**
 * GET /api/admin/wallet
 *
 * Get wallet journal entries from database
 * Query params:
 * - page: optional page number (default: 1)
 * - limit: optional entries per page (default: 100, max: 500)
 * - ref_type: optional filter by transaction type
 * - division: wallet division (1-7, default: 4)
 */
export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const session = await getServerSession();

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required',
        },
        { status: 401 }
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500);
    const offset = (page - 1) * limit;
    const refTypeFilter = searchParams.get('ref_type') || null;
    const division = parseInt(searchParams.get('division') || '4');

    // Check division access - only Accountant, Council, and Admin can access divisions other than 4
    if (division !== 4) {
      const canAccessAllDivisions = session.roles?.some((role) =>
        ['admin', 'Council', 'Accountant'].includes(role)
      );

      if (!canAccessAllDivisions) {
        return NextResponse.json(
          {
            success: false,
            error: 'Accountant, Council, or Admin access required for this division',
          },
          { status: 403 }
        );
      }
    }

    // Build query
    let query = `
      SELECT
        id,
        division,
        date,
        ref_type,
        amount,
        balance,
        first_party_id,
        first_party_name,
        second_party_id,
        second_party_name,
        context_id,
        context_id_name,
        reason,
        description,
        tax,
        tax_receiver_id,
        tax_receiver_name
      FROM wallet_journal
      WHERE division = $1
    `;

    const params: any[] = [division];

    if (refTypeFilter) {
      query += ` AND ref_type = $2`;
      params.push(refTypeFilter);
    }

    query += ` ORDER BY date DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    // Get entries
    const result = await pool.query(query, params);

    // Get total count for pagination
    let countQuery = `SELECT COUNT(*) FROM wallet_journal WHERE division = $1`;
    const countParams: any[] = [division];
    if (refTypeFilter) {
      countQuery += ` AND ref_type = $2`;
      countParams.push(refTypeFilter);
    }
    const countResult = await pool.query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      success: true,
      journal: result.rows,
      count: result.rows.length,
      pagination: {
        page,
        limit,
        total_entries: totalCount,
        total_pages: totalPages,
        has_next: page < totalPages,
        has_prev: page > 1,
      },
    });
  } catch (error: any) {
    console.error('[WALLET] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch wallet history',
      },
      { status: 500 }
    );
  }
}
