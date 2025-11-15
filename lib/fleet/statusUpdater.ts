/**
 * Fleet Status Updater Utility
 * Shared function to update fleet statuses based on time
 */

import pool from '@/lib/db';

export interface FleetStatusUpdateResult {
  success: boolean;
  updated: number;
  started: number;
  completed: number;
}

/**
 * Update fleet statuses based on current time
 * - scheduled → in_progress when fleet time arrives
 * - in_progress → completed when duration elapses
 */
export async function updateFleetStatuses(): Promise<FleetStatusUpdateResult> {
  const client = await pool.connect();
  let updatedCount = 0;

  try {
    await client.query('BEGIN');

    // Update scheduled → in_progress
    // When current time >= scheduled_at
    const startedResult = await client.query(
      `UPDATE fleets
       SET status = 'in_progress',
           actual_start_time = COALESCE(actual_start_time, scheduled_at),
           updated_at = NOW()
       WHERE status = 'scheduled'
         AND scheduled_at <= NOW()
       RETURNING id`
    );

    const startedCount = startedResult.rowCount || 0;
    updatedCount += startedCount;

    // Update in_progress → completed
    // When current time >= scheduled_at + duration_minutes
    const completedResult = await client.query(
      `UPDATE fleets
       SET status = 'completed',
           actual_end_time = COALESCE(actual_end_time, scheduled_at + (duration_minutes || ' minutes')::interval),
           updated_at = NOW()
       WHERE status = 'in_progress'
         AND scheduled_at + (duration_minutes || ' minutes')::interval <= NOW()
       RETURNING id`
    );

    const completedCount = completedResult.rowCount || 0;
    updatedCount += completedCount;

    await client.query('COMMIT');

    return {
      success: true,
      updated: updatedCount,
      started: startedCount,
      completed: completedCount,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
