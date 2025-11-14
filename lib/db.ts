/**
 * Database connection pool for PostgreSQL
 * Simple, straightforward pool management without over-engineering
 */

import { Pool, QueryResult } from 'pg';

// Create connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Required for managed PostgreSQL services
  },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Handle pool errors
pool.on('error', (err) => {
  console.error('[DB] Unexpected pool error:', err);
});

/**
 * Initialize database tables
 * Called once during application startup
 */
export async function initializeTables(): Promise<void> {
  try {
    // Create contract tracking table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS contract_tracking (
        contract_id BIGINT PRIMARY KEY,
        ship_type VARCHAR(50) NOT NULL DEFAULT 'capital',
        processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_contract_tracking_ship_type
      ON contract_tracking(ship_type, processed_at)
    `);

    // Create tokens table for mailer service account
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin_tokens (
        key VARCHAR(50) PRIMARY KEY,
        token TEXT NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Create processed mails tracking table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS processed_mails (
        mail_id BIGINT PRIMARY KEY,
        processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        srp_request_id INTEGER,
        error_message TEXT,
        proximity_data JSONB
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_processed_mails_processed_at
      ON processed_mails(processed_at DESC)
    `);

    // Create SRP requests table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS srp_requests (
        id SERIAL PRIMARY KEY,
        character_id BIGINT NOT NULL,
        character_name VARCHAR(255) NOT NULL,
        corporation_id BIGINT,
        corporation_name VARCHAR(255),
        killmail_id BIGINT NOT NULL UNIQUE,
        killmail_hash VARCHAR(255) NOT NULL,
        killmail_time TIMESTAMP WITH TIME ZONE NOT NULL,
        ship_type_id INTEGER NOT NULL,
        ship_name VARCHAR(255),
        is_polarized BOOLEAN DEFAULT false,
        fc_name VARCHAR(255),
        fleet_description TEXT,
        solar_system_id INTEGER,
        solar_system_name VARCHAR(255),
        hunter_donations BIGINT DEFAULT 0,
        base_payout_amount BIGINT NOT NULL,
        final_payout_amount BIGINT NOT NULL,
        payout_adjusted BOOLEAN DEFAULT false,
        adjustment_reason TEXT,
        status VARCHAR(50) DEFAULT 'pending' NOT NULL,
        requires_fc_approval BOOLEAN DEFAULT false,
        denial_reason TEXT,
        processed_by_character_id BIGINT,
        processed_by_character_name VARCHAR(255),
        processed_at TIMESTAMP WITH TIME ZONE,
        payment_journal_id BIGINT,
        payment_amount BIGINT,
        paid_at TIMESTAMP WITH TIME ZONE,
        mail_id BIGINT,
        mail_subject VARCHAR(1000),
        mail_body TEXT,
        validation_warnings TEXT[],
        admin_notes TEXT,
        submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Create indexes for SRP requests
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_srp_requests_character_id ON srp_requests(character_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_srp_requests_status ON srp_requests(status)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_srp_requests_killmail_id ON srp_requests(killmail_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_srp_requests_submitted_at ON srp_requests(submitted_at DESC)`);

    // Create pending mail sends queue
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pending_mail_sends (
        id SERIAL PRIMARY KEY,
        mail_type VARCHAR(50) NOT NULL,
        recipient_character_id BIGINT NOT NULL,
        payload JSONB NOT NULL,
        retry_after TIMESTAMP WITH TIME ZONE NOT NULL,
        attempts INTEGER DEFAULT 0,
        last_error TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_pending_mail_sends_retry_after
      ON pending_mail_sends(retry_after)
    `);

    // Create wallet journal table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS wallet_journal (
        id BIGINT PRIMARY KEY,
        amount NUMERIC NOT NULL,
        balance NUMERIC NOT NULL,
        context_id BIGINT,
        context_id_type VARCHAR(50),
        context_id_name VARCHAR(255),
        date TIMESTAMP WITH TIME ZONE NOT NULL,
        description TEXT NOT NULL,
        first_party_id BIGINT,
        first_party_name VARCHAR(255),
        reason TEXT,
        ref_type VARCHAR(100) NOT NULL,
        second_party_id BIGINT,
        second_party_name VARCHAR(255),
        tax NUMERIC,
        tax_receiver_id BIGINT,
        tax_receiver_name VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_wallet_journal_date ON wallet_journal(date DESC)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_wallet_journal_ref_type ON wallet_journal(ref_type)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_wallet_journal_context_id ON wallet_journal(context_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_wallet_journal_reason ON wallet_journal(reason) WHERE reason IS NOT NULL`);

    // Create fleet commanders table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS fleet_commanders (
        id SERIAL PRIMARY KEY,
        status VARCHAR(50) NOT NULL DEFAULT 'active',
        rank VARCHAR(100) NOT NULL,
        access_level VARCHAR(50),
        main_character_id BIGINT NOT NULL,
        main_character_name VARCHAR(255) NOT NULL,
        bb_corp_alt_id BIGINT,
        bb_corp_alt_name VARCHAR(255),
        additional_alts JSONB DEFAULT '[]'::jsonb,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_fleet_commanders_status ON fleet_commanders(status)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_fleet_commanders_rank ON fleet_commanders(rank)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_fleet_commanders_main_character ON fleet_commanders(main_character_id)`);

    console.log('[DB] Tables initialized successfully');
  } catch (error) {
    console.error('[DB] Failed to initialize tables:', error);
    throw error;
  }
}

export default pool;
