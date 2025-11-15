/**
 * Cron Job: Update Fleet Status
 * Automatically transitions fleet statuses based on scheduled time and duration
 * - scheduled → in_progress when fleet time arrives
 * - in_progress → completed when duration elapses
 */

import { NextRequest, NextResponse } from 'next/server';
import { updateFleetStatuses } from '@/lib/fleet/statusUpdater';

export const dynamic = 'force-dynamic';

// GET - Trigger fleet status update (can be called by cron or manually)
export async function GET(request: NextRequest) {
  try {
    // Optional: Add authorization header check for cron jobs
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // If CRON_SECRET is set, require it for security
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const result = await updateFleetStatuses();

    return NextResponse.json({
      message: 'Fleet statuses updated',
      ...result,
    });
  } catch (error: unknown) {
    console.error('Error updating fleet statuses:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update fleet statuses',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// POST - Also support POST method for cron services that prefer it
export async function POST(request: NextRequest) {
  return GET(request);
}
