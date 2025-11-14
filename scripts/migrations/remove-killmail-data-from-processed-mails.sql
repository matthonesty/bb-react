-- Migration: Remove killmail_data and proximity_data from processed_mails table
-- Date: 2025-11-14
-- Reason: Separation of concerns - killmail data belongs only in srp_requests table
--
-- This migration removes redundant killmail-specific data from the processed_mails table.
-- The processed_mails table should only track mail processing status, not killmail details.
-- All killmail and proximity data is properly stored in the srp_requests table.

BEGIN;

-- Drop the killmail_data column (JSONB)
ALTER TABLE processed_mails DROP COLUMN IF EXISTS killmail_data;

-- Drop the proximity_data column (JSONB)
ALTER TABLE processed_mails DROP COLUMN IF EXISTS proximity_data;

-- Update table comment to reflect its purpose
COMMENT ON TABLE processed_mails IS 'Tracks which EVE mails have been processed and their processing status. All killmail-specific data is stored in srp_requests table.';

COMMIT;
