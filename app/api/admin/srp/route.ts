/**
 * SRP List Endpoint
 * Returns paginated list of SRP requests with filtering
 */

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { isAuthorizedRole } from '@/lib/auth/roles';
import { verifyAuth } from '@/lib/auth/apiAuth';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has any authorized role
    const hasAuthorizedRole = user.roles?.some((role: string) => isAuthorizedRole(role));

    if (!hasAuthorizedRole) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Authorized role required' },
        { status: 403 }
      );
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '50');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'submitted_at';
    const sortDirection = searchParams.get('sortDirection') || 'desc';

    // Build query - all data comes from srp_requests now
    let query = `SELECT * FROM srp_requests WHERE 1=1`;
    const params: any[] = [];
    let paramCount = 1;

    // Status filter
    if (status && status !== 'all') {
      params.push(status);
      query += ` AND status = $${paramCount++}`;
    }

    // Search filter
    if (search) {
      const searchPattern = `%${search}%`;
      const numericSearch = parseInt(search);

      if (!isNaN(numericSearch)) {
        // If search is numeric, search by ID or killmail_id as well
        params.push(numericSearch, numericSearch, searchPattern, searchPattern, searchPattern);
        query += ` AND (
          id = $${paramCount++}
          OR killmail_id = $${paramCount++}
          OR character_name ILIKE $${paramCount++}
          OR ship_name ILIKE $${paramCount++}
          OR solar_system_name ILIKE $${paramCount++}
        )`;
      } else {
        // Text search only
        params.push(searchPattern, searchPattern, searchPattern);
        query += ` AND (
          character_name ILIKE $${paramCount++}
          OR ship_name ILIKE $${paramCount++}
          OR solar_system_name ILIKE $${paramCount++}
        )`;
      }
    }

    // Count total
    const countResult = await pool.query(`SELECT COUNT(*) FROM (${query}) AS filtered`, params);
    const total = parseInt(countResult.rows[0].count);

    // Add sorting
    const allowedSortColumns = [
      'submitted_at',
      'character_name',
      'ship_name',
      'solar_system_name',
      'final_payout_amount',
      'status',
    ];
    const sortColumn = allowedSortColumns.includes(sortBy) ? sortBy : 'submitted_at';
    const sortDir = sortDirection === 'asc' ? 'ASC' : 'DESC';
    query += ` ORDER BY ${sortColumn} ${sortDir}`;

    // Add pagination
    const offset = (page - 1) * pageSize;
    params.push(pageSize, offset);
    query += ` LIMIT $${paramCount++} OFFSET $${paramCount++}`;

    // Execute query
    const result = await pool.query(query, params);

    // Add is_auto_rejection flag based on admin_notes
    const dataWithFlags = result.rows.map((row: any) => ({
      ...row,
      is_auto_rejection: row.admin_notes?.includes('[AUTO-REJECTION]') || false,
    }));

    return NextResponse.json({
      data: dataWithFlags,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error('SRP list error:', error);
    return NextResponse.json({ error: 'Failed to fetch SRP requests' }, { status: 500 });
  }
}

// Keep mock data as fallback for testing without database
export async function GET_MOCK() {
  const mockData = {
    data: [
      {
        id: 1,
        character_id: 90504880,
        character_name: 'Test Pilot Alpha',
        corporation_id: 1000001,
        corporation_name: 'Bombers Bar',
        alliance_id: 2000001,
        alliance_name: 'The Imperium',
        killmail_id: 123456789,
        killmail_time: new Date(Date.now() - 3600000).toISOString(),
        ship_type_id: 12011,
        ship_name: 'Manticore',
        ship_group: 'Stealth Bomber',
        solar_system_id: 30000142,
        solar_system_name: 'Jita',
        region_name: 'The Forge',
        status: 'Pending' as const,
        payout_amount: null,
        base_price: 85000000,
        adjusted_price: 85000000,
        is_polarized: false,
        reject_reason: null,
        notes: 'Lost in fleet op, followed FC commands',
        submitted_at: new Date(Date.now() - 7200000).toISOString(),
        processed_at: null,
        paid_at: null,
        processed_by: null,
        processor_name: null,
        payment_method: null,
        killmail_data: {},
        fleet_id: 1,
        fleet_name: 'Bombing Run - 2024-11-14',
      },
      {
        id: 2,
        character_id: 90504881,
        character_name: 'Test Pilot Bravo',
        corporation_id: 1000001,
        corporation_name: 'Bombers Bar',
        alliance_id: 2000001,
        alliance_name: 'The Imperium',
        killmail_id: 123456790,
        killmail_time: new Date(Date.now() - 86400000).toISOString(),
        ship_type_id: 12032,
        ship_name: 'Hound',
        ship_group: 'Stealth Bomber',
        solar_system_id: 30002187,
        solar_system_name: 'Delve',
        region_name: 'Delve',
        status: 'Approved' as const,
        payout_amount: 90000000,
        base_price: 90000000,
        adjusted_price: 90000000,
        is_polarized: false,
        reject_reason: null,
        notes: null,
        submitted_at: new Date(Date.now() - 172800000).toISOString(),
        processed_at: new Date(Date.now() - 86400000).toISOString(),
        paid_at: null,
        processed_by: 90504880,
        processor_name: 'Admin User',
        payment_method: null,
        killmail_data: {},
        fleet_id: 1,
        fleet_name: 'Bombing Run - 2024-11-13',
      },
      {
        id: 3,
        character_id: 90504882,
        character_name: 'Test Pilot Charlie',
        corporation_id: 1000001,
        corporation_name: 'Bombers Bar',
        alliance_id: null,
        alliance_name: null,
        killmail_id: 123456791,
        killmail_time: new Date(Date.now() - 259200000).toISOString(),
        ship_type_id: 12034,
        ship_name: 'Nemesis',
        ship_group: 'Stealth Bomber',
        solar_system_id: 30045349,
        solar_system_name: 'Tribute',
        region_name: 'Tribute',
        status: 'Paid' as const,
        payout_amount: 80000000,
        base_price: 80000000,
        adjusted_price: 80000000,
        is_polarized: false,
        reject_reason: null,
        notes: null,
        submitted_at: new Date(Date.now() - 345600000).toISOString(),
        processed_at: new Date(Date.now() - 259200000).toISOString(),
        paid_at: new Date(Date.now() - 172800000).toISOString(),
        processed_by: 90504880,
        processor_name: 'Admin User',
        payment_method: 'Contract' as const,
        killmail_data: {},
        fleet_id: 2,
        fleet_name: 'Bombing Run - 2024-11-11',
      },
      {
        id: 4,
        character_id: 90504883,
        character_name: 'Test Pilot Delta',
        corporation_id: 1000002,
        corporation_name: 'Another Corp',
        alliance_id: null,
        alliance_name: null,
        killmail_id: 123456792,
        killmail_time: new Date(Date.now() - 432000000).toISOString(),
        ship_type_id: 12011,
        ship_name: 'Manticore',
        ship_group: 'Stealth Bomber',
        solar_system_id: 30000142,
        solar_system_name: 'Jita',
        region_name: 'The Forge',
        status: 'Rejected' as const,
        payout_amount: null,
        base_price: 85000000,
        adjusted_price: 85000000,
        is_polarized: true,
        reject_reason: 'Did not follow FC commands - broke bomber hole',
        notes: null,
        submitted_at: new Date(Date.now() - 518400000).toISOString(),
        processed_at: new Date(Date.now() - 432000000).toISOString(),
        paid_at: null,
        processed_by: 90504880,
        processor_name: 'Admin User',
        payment_method: null,
        killmail_data: {},
        fleet_id: null,
        fleet_name: null,
      },
      {
        id: 5,
        character_id: 90504884,
        character_name: 'Test Pilot Echo',
        corporation_id: 1000001,
        corporation_name: 'Bombers Bar',
        alliance_id: 2000001,
        alliance_name: 'The Imperium',
        killmail_id: 123456793,
        killmail_time: new Date(Date.now() - 1800000).toISOString(),
        ship_type_id: 12038,
        ship_name: 'Purifier',
        ship_group: 'Stealth Bomber',
        solar_system_id: 30004759,
        solar_system_name: 'Amarr',
        region_name: 'Domain',
        status: 'Pending' as const,
        payout_amount: null,
        base_price: 75000000,
        adjusted_price: 75000000,
        is_polarized: true,
        reject_reason: null,
        notes: 'Polarized fit - requesting reduced payout',
        submitted_at: new Date(Date.now() - 3600000).toISOString(),
        processed_at: null,
        paid_at: null,
        processed_by: null,
        processor_name: null,
        payment_method: null,
        killmail_data: {},
        fleet_id: 1,
        fleet_name: 'Bombing Run - 2024-11-14',
      },
    ],
    pagination: {
      page: 1,
      pageSize: 50,
      total: 5,
      totalPages: 1,
    },
  };

  return NextResponse.json(mockData);
}
