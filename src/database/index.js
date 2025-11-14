const { Pool } = require('pg');
const logger = require('../utils/logger');

class Database {
  constructor() {
    this.pool = null;
    this.isConnected = false;
    this.isInitializing = false;
    this.initializationPromise = null;
    this.logger = logger;
  }

  async initialize() {
    // Prevent double initialization from multiple bots
    if (this.isConnected) {
      this.logger.info('Database already initialized, skipping');
      return true;
    }

    // If already initializing, wait for that to complete
    if (this.isInitializing && this.initializationPromise) {
      this.logger.info('Database initialization in progress, waiting...');
      return await this.initializationPromise;
    }

    this.isInitializing = true;

    // Store the initialization promise so other callers can wait for it
    this.initializationPromise = this._performInitialization();

    try {
      const result = await this.initializationPromise;
      return result;
    } finally {
      this.isInitializing = false;
      this.initializationPromise = null;
    }
  }

  async _performInitialization() {
    try {
      const poolConfig = {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
        query_timeout: 30000,
      };

      this.pool = new Pool(poolConfig);

      // Add error handler for pool to catch connection errors
      this.pool.on('error', (err, client) => {
        this.logger.error('Unexpected database pool error:', err);

        // Mark pool as disconnected to trigger reconnection on next query
        this.isConnected = false;

        // Optional: Emit event for monitoring/alerting
        // Note: Can be used by monitoring systems to track pool health
      });

      // Test connection
      await this.testConnection();
      this.isConnected = true;
      
      // Initialize tables
      await this.initializeTables();

      this.logger.info('Database initialized successfully');
      return true;
    } catch (error) {
      this.logger.warn('Database initialization failed (running without database):', error.message);
      this.isConnected = false;
      return false;
    }
  }

  async testConnection() {
    if (!this.pool) throw new Error('Database not initialized');
    
    const client = await this.pool.connect();
    try {
      await client.query('SELECT NOW()');
    } finally {
      client.release();
    }
  }


  async query(text, params, options = {}) {
    // Auto-initialize if not connected
    if (!this.pool || !this.isConnected) {
      this.logger.warn('Database not connected, attempting auto-initialization...');
      const initialized = await this.initialize();
      if (!initialized) {
        throw new Error('Database not available and auto-initialization failed');
      }
    }

    let client;
    try {
      client = await this.pool.connect();

      // Set custom statement_timeout if provided
      if (options.timeout) {
        await client.query(`SET statement_timeout = ${options.timeout}`);
      }

      const result = await client.query(text, params);

      // Reset to default timeout if custom timeout was set
      if (options.timeout) {
        await client.query(`SET statement_timeout = '30000'`);
      }

      client.release(); // Release on success
      return result;
    } catch (error) {
      // Log timeout errors specifically
      if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
        this.logger.warn('Database query timeout - discarding connection from pool');
      }

      // Release with error flag to discard bad connections from pool
      if (client) {
        client.release(true);
      }
      throw error;
    }
  }

  async initializeTables() {
    try {
      // Create simple contract tracking table
      await this.query(`
        CREATE TABLE IF NOT EXISTS contract_tracking (
          contract_id BIGINT PRIMARY KEY,
          ship_type VARCHAR(50) NOT NULL DEFAULT 'capital',
          processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);
      
      // Create index for faster lookups
      await this.query(`
        CREATE INDEX IF NOT EXISTS idx_contract_tracking_ship_type
        ON contract_tracking(ship_type, processed_at)
      `);

      // Create tokens table for storing service account refresh tokens
      // Used by mailer service account for persistent ESI operations
      await this.query(`
        CREATE TABLE IF NOT EXISTS admin_tokens (
          key VARCHAR(50) PRIMARY KEY,
          token TEXT NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);

      // Create processed mails tracking table
      await this.query(`
        CREATE TABLE IF NOT EXISTS processed_mails (
          mail_id BIGINT PRIMARY KEY,
          processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          srp_request_id INTEGER,
          error_message TEXT,
          proximity_data JSONB
        )
      `);

      // Create index for processed mails
      await this.query(`
        CREATE INDEX IF NOT EXISTS idx_processed_mails_processed_at
        ON processed_mails(processed_at DESC)
      `);

      // Create SRP requests table
      await this.query(`
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
      await this.query(`
        CREATE INDEX IF NOT EXISTS idx_srp_requests_character_id ON srp_requests(character_id)
      `);
      await this.query(`
        CREATE INDEX IF NOT EXISTS idx_srp_requests_status ON srp_requests(status)
      `);
      await this.query(`
        CREATE INDEX IF NOT EXISTS idx_srp_requests_killmail_id ON srp_requests(killmail_id)
      `);
      await this.query(`
        CREATE INDEX IF NOT EXISTS idx_srp_requests_submitted_at ON srp_requests(submitted_at DESC)
      `);

      // Create pending mail sends queue for rate-limited mails
      await this.query(`
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

      // Create index for pending mail sends (for efficient retry lookups)
      await this.query(`
        CREATE INDEX IF NOT EXISTS idx_pending_mail_sends_retry_after
        ON pending_mail_sends(retry_after)
      `);

      // Create wallet journal table for financial tracking and SRP reconciliation
      await this.query(`
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

      // Create indexes for wallet journal (for efficient SRP reconciliation and auditing)
      await this.query(`
        CREATE INDEX IF NOT EXISTS idx_wallet_journal_date ON wallet_journal(date DESC)
      `);
      await this.query(`
        CREATE INDEX IF NOT EXISTS idx_wallet_journal_ref_type ON wallet_journal(ref_type)
      `);
      await this.query(`
        CREATE INDEX IF NOT EXISTS idx_wallet_journal_context_id ON wallet_journal(context_id)
      `);
      await this.query(`
        CREATE INDEX IF NOT EXISTS idx_wallet_journal_reason ON wallet_journal(reason) WHERE reason IS NOT NULL
      `);

      // Create fleet commanders table
      await this.query(`
        CREATE TABLE IF NOT EXISTS fleet_commanders (
          id SERIAL PRIMARY KEY,
          status VARCHAR(50) NOT NULL DEFAULT 'active',
          rank VARCHAR(100) NOT NULL,
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

      // Create indexes for fleet commanders
      await this.query(`
        CREATE INDEX IF NOT EXISTS idx_fleet_commanders_status ON fleet_commanders(status)
      `);
      await this.query(`
        CREATE INDEX IF NOT EXISTS idx_fleet_commanders_rank ON fleet_commanders(rank)
      `);
      await this.query(`
        CREATE INDEX IF NOT EXISTS idx_fleet_commanders_main_character ON fleet_commanders(main_character_id)
      `);

      this.logger.info('Database tables initialized');
    } catch (error) {
      this.logger.warn('Could not initialize database tables:', error.message);
      throw error;
    }
  }

  async isContractProcessed(contractId, shipType = 'capital') {
    try {
      if (!this.isConnected) return false;
      
      const result = await this.query(
        'SELECT 1 FROM contract_tracking WHERE contract_id = $1 AND ship_type = $2',
        [contractId, shipType]
      );
      return result.rows.length > 0;
    } catch (error) {
      this.logger.warn('Could not check if contract was processed:', error.message);
      return false;
    }
  }

  async markContractProcessed(contractId, shipType = 'capital') {
    try {
      if (!this.isConnected) return;

      await this.query(
        'INSERT INTO contract_tracking (contract_id, ship_type) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [contractId, shipType]
      );
    } catch (error) {
      this.logger.warn('Could not mark contract as processed:', error.message);
    }
  }

  async getProcessedContractCount(shipType = null, daysBack = 1) {
    try {
      if (!this.isConnected) return 0;

      let query = `SELECT COUNT(*) as count FROM contract_tracking WHERE processed_at > NOW() - INTERVAL $1`;
      let params = [`${daysBack} days`];

      if (shipType) {
        query += ' AND ship_type = $2';
        params.push(shipType);
      }

      const result = await this.query(query, params);
      return parseInt(result.rows[0].count) || 0;
    } catch (error) {
      this.logger.warn('Could not get processed contract count:', error.message);
      return 0;
    }
  }

  async getLastContractTime(shipType = 'capital') {
    try {
      if (!this.isConnected) return null;

      const result = await this.query(
        'SELECT MAX(processed_at) as last_time FROM contract_tracking WHERE ship_type = $1',
        [shipType]
      );
      return result.rows[0].last_time;
    } catch (error) {
      this.logger.warn('Could not get last contract time:', error.message);
      return null;
    }
  }



  getStatus() {
    return {
      isConnected: this.isConnected,
      hasPool: !!this.pool,
      totalCount: this.pool?.totalCount || 0,
      idleCount: this.pool?.idleCount || 0,
      waitingCount: this.pool?.waitingCount || 0
    };
  }

  async close() {
    if (this.pool) {
      await this.pool.end();
      this.isConnected = false;
      this.logger.info('Database connection closed');
    }
  }
}

// Singleton instance
let instance = null;

class DatabaseManager {
  static async getInstance() {
    if (!instance) {
      instance = new Database();
      await instance.initialize();
    }
    return instance;
  }
}

// Export both the singleton instance and the getInstance method
const database = new Database();
database.getInstance = DatabaseManager.getInstance;

module.exports = database;