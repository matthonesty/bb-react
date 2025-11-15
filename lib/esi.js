/**
 * @fileoverview EVE ESI API - Single Source of Truth
 *
 * Centralized ESI API client for all EVE Online ESI operations.
 * Includes rate limiting, retry logic, error handling, and all ESI endpoints.
 *
 * Key Features:
 * - Automatic retry with exponential backoff
 * - ESI error limit tracking (X-ESI-Error-Limit-Remain, X-ESI-Error-Limit-Reset)
 * - ESI rate limit tracking (Floating window token system)
 * - Automatic throttling when error budget is low
 * - Network error detection and handling
 * - Configurable timeouts and retry strategies
 * - Request statistics and monitoring
 * - All ESI operations in one place (Universe, Mail, Status, Wallet, Ship Info, Fitting Parser)
 *
 * @module lib/esi
 */

import axios from 'axios';
import { sleep } from './utils/async.js';

// ============================================================================
// CONSTANTS AND CONFIGURATION
// ============================================================================

/**
 * EVE ESI base URL
 * Note: Does not include /latest/ - ESI uses X-Compatibility-Date header for versioning
 * @constant {string}
 */
const ESI_BASE_URL = 'https://esi.evetech.net';

/**
 * Cached compatibility date
 * IMPORTANT: This is manually managed to avoid breaking changes.
 * When a newer date is available, changelog is displayed for developer review.
 * Update this date manually after reviewing breaking changes.
 */
let cachedCompatibilityDate = {
  date: '2025-11-06', // Current compatibility date (update manually after reviewing changelog)
  lastFetched: null,
  cacheDuration: 3600000, // 1 hour - check for updates hourly
};

/**
 * ESI configuration constants
 */
const ESI_CONFIG = {
  // Timeout for ESI requests (30 seconds)
  REQUEST_TIMEOUT: 30000,

  // Retry configuration
  MAX_RETRIES: 3,
  INITIAL_RETRY_DELAY: 1000, // 1 second
  MAX_RETRY_DELAY: 10000, // 10 seconds (does not apply to ESI-specified delays)
  BACKOFF_MULTIPLIER: 2, // Exponential backoff

  // Error limit thresholds
  ERROR_LIMIT_WARNING_THRESHOLD: 20, // Warn when below 20 errors remaining
  ERROR_LIMIT_CRITICAL_THRESHOLD: 5, // Throttle heavily when below 5

  // Throttle delays (ms)
  THROTTLE_DELAY_WARNING: 500, // Delay when in warning zone
  THROTTLE_DELAY_CRITICAL: 2000, // Delay when in critical zone

  // Mail spam protection - max wait time (15 minutes in ms)
  // ESI's MailStopSpamming can require very long waits
  MAX_MAIL_SPAM_DELAY: 15 * 60 * 1000,
};

/**
 * Mailer service account character ID (sender of mails)
 * This is the character that performs ESI mail operations
 * Should match MAILER_CHARACTER_ID used for OAuth validation
 * @constant {number}
 */
const MAILER_CHARACTER_ID = parseInt(process.env.MAILER_CHARACTER_ID) || null;

/**
 * Wallet division to check (1 = Master Wallet)
 * @constant {number}
 */
const WALLET_DIVISION = 1;

/**
 * Dogma attribute mappings for ship specs
 */
const DOGMA_ATTRIBUTES = {
  LOW_SLOTS: 12,
  MID_SLOTS: 13,
  HIGH_SLOTS: 14,
  CARGO_CAPACITY: 38,
  LAUNCHER_HARDPOINTS: 101,
  TURRET_HARDPOINTS: 102,
  RIG_SLOTS: 1137,
  RIG_SLOTS_ALT: 1154, // Alternative rig slots attribute
};

/**
 * Dogma effect IDs for slot types (fitting parser)
 */
const DOGMA_EFFECTS = {
  HIGH_SLOT: 12, // hiPower
  MID_SLOT: 13, // medPower
  LOW_SLOT: 11, // loPower
  RIG_SLOT: 2663, // rigSlot
  SUB_SYSTEM: 3772, // subSystem (for T3 cruisers)
};

/**
 * Critical routes we depend on for mail processing
 * Format: { method, path } to match /meta/status response
 */
const CRITICAL_ROUTES = [
  { method: 'GET', path: '/characters/{character_id}/mail' },
  { method: 'POST', path: '/characters/{character_id}/mail' },
  { method: 'GET', path: '/characters/{character_id}/mail/{mail_id}' },
  { method: 'POST', path: '/universe/names' },
  { method: 'GET', path: '/corporations/{corporation_id}/wallets/{division}/journal' },
];

// ============================================================================
// RATE LIMITING AND ERROR TRACKING STATE
// ============================================================================

/**
 * Global ESI error limit state (legacy system)
 * Tracks the error budget across all requests
 */
const esiErrorState = {
  errorsRemaining: null,
  resetTime: null,
  lastUpdated: null,
};

/**
 * Global ESI rate limit state (new floating window system)
 * Tracks token consumption across all requests
 * Note: ESI uses per-route-group/application/character buckets, but we track global state for monitoring
 */
const esiRateLimitState = {
  tokensRemaining: null,
  tokensLimit: null,
  resetTime: null,
  lastUpdated: null,
  retryAfter: null, // Seconds to wait if rate limited
};

/**
 * Request statistics for monitoring
 */
const requestStats = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  retriedRequests: 0,
  throttledRequests: 0,
  rateLimitedRequests: 0,
  tokensConsumed: 0, // Track total tokens consumed
};

/**
 * Cached status data (for ESI health checks)
 */
let cachedStatus = {
  data: null,
  lastFetched: null,
  cacheDuration: 60000, // 1 minute cache
};

// ============================================================================
// CACHING FOR SHIP INFO AND FITTING PARSER
// ============================================================================

// In-memory cache for ship info (in production, consider Redis)
const shipInfoCache = new Map();
const SHIP_INFO_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Cache for item dogma effects (to reduce ESI calls for fitting parser)
const itemEffectsCache = new Map();
const ITEM_EFFECTS_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// ============================================================================
// RATE LIMITING AND ERROR HANDLING FUNCTIONS
// ============================================================================

/**
 * Update ESI error limit state from response headers (legacy system)
 *
 * @param {Object} headers - Response headers from ESI
 */
function updateErrorLimitState(headers) {
  const errorLimitRemain = headers['x-esi-error-limit-remain'];
  const errorLimitReset = headers['x-esi-error-limit-reset'];

  if (errorLimitRemain !== undefined) {
    esiErrorState.errorsRemaining = parseInt(errorLimitRemain, 10);
    esiErrorState.lastUpdated = Date.now();
  }

  if (errorLimitReset !== undefined) {
    esiErrorState.resetTime = parseInt(errorLimitReset, 10);
  }
}

/**
 * Update ESI rate limit state from response headers (new floating window system)
 *
 * ESI rate limiting uses various header formats. Common patterns:
 * - X-RateLimit-Limit / X-ESI-Rate-Limit
 * - X-RateLimit-Remaining / X-ESI-Rate-Limit-Remain
 * - X-RateLimit-Reset / X-ESI-Rate-Limit-Reset
 * - Retry-After (on 429 responses)
 *
 * @param {Object} headers - Response headers from ESI
 * @param {number} status - HTTP status code
 */
function updateRateLimitState(headers, status) {
  // Check various possible header names (ESI might use different formats)
  const rateLimitRemain =
    headers['x-ratelimit-remaining'] ||
    headers['x-esi-rate-limit-remain'] ||
    headers['x-esi-ratelimit-remaining'];

  const rateLimitLimit =
    headers['x-ratelimit-limit'] ||
    headers['x-esi-rate-limit-limit'] ||
    headers['x-esi-ratelimit-limit'];

  const rateLimitReset =
    headers['x-ratelimit-reset'] ||
    headers['x-esi-rate-limit-reset'] ||
    headers['x-esi-ratelimit-reset'];

  const retryAfter = headers['retry-after'];

  if (rateLimitRemain !== undefined) {
    esiRateLimitState.tokensRemaining = parseInt(rateLimitRemain, 10);
    esiRateLimitState.lastUpdated = Date.now();
  }

  if (rateLimitLimit !== undefined) {
    esiRateLimitState.tokensLimit = parseInt(rateLimitLimit, 10);
  }

  if (rateLimitReset !== undefined) {
    esiRateLimitState.resetTime = parseInt(rateLimitReset, 10);
  }

  if (retryAfter !== undefined && status === 429) {
    esiRateLimitState.retryAfter = parseInt(retryAfter, 10);
  }

  // Track token consumption based on status code
  // 2XX: 2 tokens, 3XX: 1 token, 4XX: 5 tokens, 5XX: 0 tokens
  let tokensUsed = 0;
  if (status >= 200 && status < 300) {
    tokensUsed = 2;
  } else if (status >= 300 && status < 400) {
    tokensUsed = 1;
  } else if (status >= 400 && status < 500) {
    tokensUsed = 5;
  }
  // 5XX uses 0 tokens

  if (tokensUsed > 0) {
    requestStats.tokensConsumed += tokensUsed;
  }
}

/**
 * Check if we should throttle requests based on error budget and rate limits
 * Returns delay in milliseconds (0 if no throttling needed)
 *
 * Checks both legacy error limiting and new rate limiting systems.
 * Returns the maximum delay needed for either system.
 *
 * @returns {number} Delay in milliseconds
 */
function getThrottleDelay() {
  let maxDelay = 0;

  // Check error limit (legacy system)
  if (esiErrorState.errorsRemaining !== null) {
    const remaining = esiErrorState.errorsRemaining;

    if (remaining <= ESI_CONFIG.ERROR_LIMIT_CRITICAL_THRESHOLD) {
      console.warn(`[ESI] CRITICAL: Only ${remaining} errors remaining in error budget`);
      maxDelay = Math.max(maxDelay, ESI_CONFIG.THROTTLE_DELAY_CRITICAL);
    } else if (remaining <= ESI_CONFIG.ERROR_LIMIT_WARNING_THRESHOLD) {
      console.warn(`[ESI] WARNING: Only ${remaining} errors remaining in error budget`);
      maxDelay = Math.max(maxDelay, ESI_CONFIG.THROTTLE_DELAY_WARNING);
    }
  }

  // Check rate limit (new floating window system)
  if (esiRateLimitState.tokensRemaining !== null && esiRateLimitState.tokensLimit !== null) {
    const tokensRemaining = esiRateLimitState.tokensRemaining;
    const tokensLimit = esiRateLimitState.tokensLimit;
    const percentRemaining = (tokensRemaining / tokensLimit) * 100;

    // If we're down to 10% of tokens, throttle heavily
    if (percentRemaining <= 10) {
      console.warn(
        `[ESI] CRITICAL: Only ${tokensRemaining}/${tokensLimit} tokens remaining (${percentRemaining.toFixed(1)}%)`
      );
      maxDelay = Math.max(maxDelay, ESI_CONFIG.THROTTLE_DELAY_CRITICAL);
    }
    // If we're down to 25% of tokens, throttle moderately
    else if (percentRemaining <= 25) {
      console.warn(
        `[ESI] WARNING: Only ${tokensRemaining}/${tokensLimit} tokens remaining (${percentRemaining.toFixed(1)}%)`
      );
      maxDelay = Math.max(maxDelay, ESI_CONFIG.THROTTLE_DELAY_WARNING);
    }
  }

  // If we have a retry-after from a 429, use that
  if (esiRateLimitState.retryAfter !== null && esiRateLimitState.retryAfter > 0) {
    const retryAfterMs = esiRateLimitState.retryAfter * 1000;
    console.warn(`[ESI] Rate limited - must wait ${esiRateLimitState.retryAfter}s before retry`);
    maxDelay = Math.max(maxDelay, retryAfterMs);
    // Clear retry-after after using it
    esiRateLimitState.retryAfter = null;
  }

  return maxDelay;
}

/**
 * Check if error is retryable
 *
 * @param {Error} error - Error from axios
 * @returns {boolean} True if error is retryable
 */
function isRetryableError(error) {
  // Network errors
  const retryableNetworkErrors = [
    'ECONNABORTED',
    'ECONNRESET',
    'ENOTFOUND',
    'ETIMEDOUT',
    'ECONNREFUSED',
    'UND_ERR_SOCKET',
    'UND_ERR_CLOSED',
    'UND_ERR_DESTROYED',
  ];

  if (retryableNetworkErrors.includes(error.code)) {
    return true;
  }

  // Timeout errors
  if (error.name === 'AbortError' || error.name === 'TypeError') {
    return true;
  }

  // HTTP status codes
  if (error.response) {
    const status = error.response.status;

    // 5xx errors are retryable (server errors)
    if (status >= 500 && status < 600) {
      return true;
    }

    // 420 (Error Limited) is retryable after delay
    if (status === 420) {
      return true;
    }

    // 429 (Too Many Requests) is retryable after delay
    if (status === 429) {
      return true;
    }

    // MailStopSpamming is retryable after waiting the specified time
    // This is EVE's mail spam protection
    if (status === 400 && error.response.data?.error) {
      const errorMsg = error.response.data.error;
      if (typeof errorMsg === 'string' && errorMsg.includes('MailStopSpamming')) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Calculate delay for next retry attempt with exponential backoff
 *
 * @param {number} attemptNumber - Current attempt number (1-indexed)
 * @param {Object} [error] - Error from previous attempt
 * @returns {number} Delay in milliseconds
 */
function calculateRetryDelay(attemptNumber, error = null) {
  let baseDelay = ESI_CONFIG.INITIAL_RETRY_DELAY;

  // Check for MailStopSpamming error with remainingTime
  // Format: "MailStopSpamming, details: {"remainingTime": 564217469}"
  if (error?.response?.status === 400 && error?.response?.data?.error) {
    const errorMsg = error.response.data.error;
    if (typeof errorMsg === 'string' && errorMsg.includes('MailStopSpamming')) {
      try {
        // Extract the details JSON from the error message
        const detailsMatch = errorMsg.match(/details:\s*({[^}]+})/);
        if (detailsMatch) {
          const details = JSON.parse(detailsMatch[1]);
          if (details.remainingTime) {
            // remainingTime is already in milliseconds
            let delayMs = parseInt(details.remainingTime, 10);

            // Cap at max mail spam delay (15 minutes) for safety
            if (delayMs > ESI_CONFIG.MAX_MAIL_SPAM_DELAY) {
              console.warn(
                `[ESI] MailStopSpamming delay too long (${(delayMs / 1000).toFixed(1)}s), capping at ${ESI_CONFIG.MAX_MAIL_SPAM_DELAY / 1000}s`
              );
              delayMs = ESI_CONFIG.MAX_MAIL_SPAM_DELAY;
            }

            console.warn(
              `[ESI] MailStopSpamming: waiting ${(delayMs / 1000).toFixed(1)}s (${(delayMs / 60000).toFixed(1)} min) before retry`
            );
            return delayMs;
          }
        }
      } catch (parseError) {
        console.warn('[ESI] Failed to parse MailStopSpamming remainingTime:', parseError.message);
      }
    }
  }

  // Check for Retry-After header (for 429/420 responses)
  if (error?.response?.headers?.['retry-after']) {
    const retryAfter = parseInt(error.response.headers['retry-after'], 10);
    if (!isNaN(retryAfter)) {
      return retryAfter * 1000; // Convert to milliseconds
    }
  }

  // Exponential backoff
  const exponentialDelay = baseDelay * Math.pow(ESI_CONFIG.BACKOFF_MULTIPLIER, attemptNumber - 1);

  // Cap at max delay
  return Math.min(exponentialDelay, ESI_CONFIG.MAX_RETRY_DELAY);
}

// ============================================================================
// COMPATIBILITY DATE MANAGEMENT
// ============================================================================

/**
 * Fetch ESI changelog and filter to dates after our current compatibility date
 *
 * @param {string} currentDate - Current compatibility date (YYYY-MM-DD)
 * @returns {Promise<Object>} Filtered changelog with only relevant changes
 */
async function fetchRelevantChangelog(currentDate) {
  try {
    const url = 'https://esi.evetech.net/meta/changelog';

    const response = await axios({
      method: 'GET',
      url,
      headers: {
        Accept: 'application/json',
        'X-Compatibility-Date': currentDate,
        'User-Agent': process.env.ESI_USER_AGENT || 'bb-esi-client/1.0',
      },
      timeout: 10000,
      validateStatus: (status) => status === 200,
    });

    if (!response || !response.data || !response.data.changelog) {
      return null;
    }

    // Filter changelog to only dates after our current date
    const filteredChangelog = {};
    const currentDateObj = new Date(currentDate);

    for (const [changeDate, changes] of Object.entries(response.data.changelog)) {
      const changeDateObj = new Date(changeDate);

      // Only include changes that occurred AFTER our current compatibility date
      if (changeDateObj > currentDateObj) {
        filteredChangelog[changeDate] = changes;
      }
    }

    return filteredChangelog;
  } catch (error) {
    console.warn('[ESI] Failed to fetch changelog:', error.message);
    return null;
  }
}

/**
 * Display ESI changelog in a readable format
 *
 * @param {Object} changelog - Filtered changelog object
 * @param {string} currentDate - Current compatibility date
 * @param {string} latestDate - Latest available compatibility date
 */
function displayChangelog(changelog, currentDate, latestDate) {
  console.log('\n' + '='.repeat(80));
  console.log('[ESI] NEW COMPATIBILITY DATE AVAILABLE');
  console.log('='.repeat(80));
  console.log(`Current: ${currentDate}`);
  console.log(`Latest:  ${latestDate}`);
  console.log('\n[WARNING] BREAKING CHANGES MAY BE PRESENT - REVIEW BEFORE UPDATING\n');

  const sortedDates = Object.keys(changelog).sort();

  for (const date of sortedDates) {
    console.log(`\n[${date}]`);
    console.log('-'.repeat(80));

    for (const change of changelog[date]) {
      console.log(`[${change.type.toUpperCase()}] ${change.method} ${change.path}`);
      if (change.description) {
        console.log(`   ${change.description}`);
      }
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('To update: Change cachedCompatibilityDate.date in lib/esi.js');
  console.log('='.repeat(80) + '\n');
}

/**
 * Check for new ESI compatibility dates and display changelog if available
 *
 * This function checks hourly for new compatibility dates. When a newer date
 * is detected, it fetches and displays the changelog for all changes that
 * occurred after our current compatibility date.
 *
 * IMPORTANT: This does NOT automatically update to the new date. Developers
 * must manually update cachedCompatibilityDate.date after reviewing changes.
 */
async function refreshCompatibilityDate() {
  try {
    const url = 'https://esi.evetech.net/meta/compatibility-dates';

    // Direct axios call to avoid circular dependency
    const response = await axios({
      method: 'GET',
      url,
      headers: {
        Accept: 'application/json',
        'X-Compatibility-Date': cachedCompatibilityDate.date, // Use current cached date
        'User-Agent': process.env.ESI_USER_AGENT || 'bb-esi-client/1.0',
      },
      timeout: 10000,
      validateStatus: (status) => status === 200,
    });

    cachedCompatibilityDate.lastFetched = Date.now();

    if (!response || !response.data) {
      console.warn('[ESI] Invalid response from compatibility dates endpoint');
      return;
    }

    if (response.data.compatibility_dates && response.data.compatibility_dates.length > 0) {
      const latestDate = response.data.compatibility_dates[0];

      // Check if there's a newer date available
      if (latestDate > cachedCompatibilityDate.date) {
        console.log(
          `[ESI] Newer compatibility date detected: ${cachedCompatibilityDate.date} → ${latestDate}`
        );

        // Fetch and display changelog for changes after our current date
        const changelog = await fetchRelevantChangelog(cachedCompatibilityDate.date);

        if (changelog && Object.keys(changelog).length > 0) {
          displayChangelog(changelog, cachedCompatibilityDate.date, latestDate);
        } else {
          console.log(
            `[ESI] No breaking changes found between ${cachedCompatibilityDate.date} and ${latestDate}`
          );
          console.log('[ESI] Safe to update compatibility date manually if desired.');
        }

        // DO NOT automatically update - require manual review
        // cachedCompatibilityDate.date = latestDate; // REMOVED
      }
    }
  } catch (error) {
    console.warn('[ESI] Failed to check for compatibility date updates:', error.message);
  }
}

/**
 * Get current compatibility date (cached value)
 *
 * Automatically refreshes if cache is stale (older than 1 hour)
 *
 * @returns {string} Current compatibility date (YYYY-MM-DD)
 */
function getCompatibilityDateSync() {
  const now = Date.now();

  // Refresh if cache is stale
  if (
    !cachedCompatibilityDate.lastFetched ||
    now - cachedCompatibilityDate.lastFetched > cachedCompatibilityDate.cacheDuration
  ) {
    // Trigger refresh (non-blocking)
    refreshCompatibilityDate().catch((err) =>
      console.warn('[ESI] Background compatibility date refresh failed:', err.message)
    );
  }

  return cachedCompatibilityDate.date;
}

/**
 * Build standard ESI request headers
 *
 * @param {string} [accessToken] - EVE SSO access token (optional for public endpoints)
 * @param {boolean} [includeContentType=false] - Whether to include Content-Type header (for POST requests)
 * @returns {Object} Headers object for axios request
 *
 * @example
 * const headers = buildEsiHeaders(token);
 * const postHeaders = buildEsiHeaders(token, true);
 * const publicHeaders = buildEsiHeaders(); // For public endpoints
 */
function buildEsiHeaders(accessToken = null, includeContentType = false) {
  const headers = {
    Accept: 'application/json',
    'X-Compatibility-Date': getCompatibilityDateSync(),
    'User-Agent': process.env.ESI_USER_AGENT || 'bb-esi-client/1.0',
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  if (includeContentType) {
    headers['Content-Type'] = 'application/json';
  }

  return headers;
}

// Fetch compatibility date on module load (non-blocking)
refreshCompatibilityDate().catch((err) =>
  console.warn('[ESI] Initial compatibility date fetch failed:', err.message)
);

// ============================================================================
// CORE ESI REQUEST FUNCTIONS
// ============================================================================

/**
 * Core ESI request function with retry logic and error handling
 *
 * @param {string} method - HTTP method (GET, POST, etc.)
 * @param {string} url - Full ESI API URL
 * @param {Object} options - Request options
 * @param {string} [options.accessToken] - EVE SSO access token
 * @param {Object} [options.params] - Query parameters
 * @param {Object} [options.data] - Request body (for POST)
 * @param {number} [options.timeout] - Custom timeout
 * @param {number} [options.maxRetries] - Custom max retries
 * @param {boolean} [options.skipRetry] - Skip retry logic
 * @returns {Promise<any>} Response data
 * @throws {Error} If request fails after all retries
 */
async function esiRequest(method, url, options = {}) {
  const {
    accessToken = null,
    params = {},
    data = null,
    timeout = ESI_CONFIG.REQUEST_TIMEOUT,
    maxRetries = ESI_CONFIG.MAX_RETRIES,
    skipRetry = false,
  } = options;

  const includeContentType = method === 'POST';
  const headers = buildEsiHeaders(accessToken, includeContentType);

  requestStats.totalRequests++;

  let lastError;
  const retryCount = skipRetry ? 1 : maxRetries;

  for (let attempt = 1; attempt <= retryCount; attempt++) {
    try {
      // Check if we need to throttle based on error budget
      const throttleDelay = getThrottleDelay();
      if (throttleDelay > 0) {
        requestStats.throttledRequests++;
        await sleep(throttleDelay);
      }

      // Make the request
      const response = await axios({
        method,
        url,
        headers,
        params,
        data,
        timeout,
        validateStatus: (status) => status < 600, // Accept all status codes < 600
      });

      // Update both error limit (legacy) and rate limit (new) states from response headers
      updateErrorLimitState(response.headers);
      updateRateLimitState(response.headers, response.status);

      // Track rate limited requests
      if (response.status === 429) {
        requestStats.rateLimitedRequests++;
      }

      // Check for error status codes
      if (response.status >= 400) {
        const error = new Error(
          `ESI returned ${response.status}: ${response.data?.error || 'Unknown error'}`
        );
        error.response = response;
        throw error;
      }

      // Validate response has data
      if (response.data === undefined || response.data === null) {
        console.warn('[ESI] Response successful but no data returned from:', url);
        // Return empty object/array depending on expected response (ESI typically returns objects or arrays)
        return Array.isArray(response.data) ? [] : {};
      }

      // Success!
      requestStats.successfulRequests++;
      return response.data;
    } catch (error) {
      lastError = error;

      // Update error limit and rate limit state if available
      if (error.response?.headers) {
        updateErrorLimitState(error.response.headers);
        updateRateLimitState(error.response.headers, error.response.status);
      }

      // Track rate limited requests
      if (error.response?.status === 429) {
        requestStats.rateLimitedRequests++;
      }

      // Check if we should retry
      const shouldRetry = attempt < retryCount && isRetryableError(error);

      if (shouldRetry) {
        requestStats.retriedRequests++;

        const delay = calculateRetryDelay(attempt, error);
        const status = error.response?.status || 'network error';

        console.warn(
          `[ESI] Request failed (${status}), retrying in ${delay}ms ` +
            `(attempt ${attempt}/${maxRetries}): ${url}`
        );

        await sleep(delay);
        continue;
      }

      // No more retries or non-retryable error
      break;
    }
  }

  // All retries exhausted
  requestStats.failedRequests++;

  const errorMessage = lastError.response?.data?.error || lastError.message;
  console.error(`[ESI] Request failed after ${retryCount} attempts: ${url}`, {
    error: errorMessage,
    status: lastError.response?.status,
  });

  throw new Error(`ESI request failed: ${errorMessage}`);
}

/**
 * Make GET request to ESI API
 *
 * @param {string} url - Full ESI API URL
 * @param {string} [accessToken] - EVE SSO access token (optional for public endpoints)
 * @param {Object} [params] - Query parameters
 * @param {Object} [options] - Additional options (timeout, maxRetries, etc.)
 * @returns {Promise<any>} Response data
 * @throws {Error} If request fails
 *
 * @example
 * const data = await esiGet(`${ESI_BASE_URL}/characters/123`, token);
 * const publicData = await esiGet(`${ESI_BASE_URL}/characters/123`); // Public endpoint
 */
async function esiGet(url, accessToken = null, params = {}, options = {}) {
  return esiRequest('GET', url, {
    accessToken,
    params,
    ...options,
  });
}

/**
 * Make POST request to ESI API
 *
 * @param {string} url - Full ESI API URL
 * @param {Object} payload - Request body data
 * @param {string} [accessToken] - EVE SSO access token (optional for public endpoints)
 * @param {Object} [options] - Additional options (timeout, maxRetries, etc.)
 * @returns {Promise<any>} Response data
 * @throws {Error} If request fails
 *
 * @example
 * const mailId = await esiPost(`${ESI_BASE_URL}/characters/123/mail`, mailData, token);
 * const names = await esiPost(`${ESI_BASE_URL}/universe/names`, [123, 456]); // Public endpoint
 */
async function esiPost(url, payload, accessToken = null, options = {}) {
  return esiRequest('POST', url, {
    accessToken,
    data: payload,
    ...options,
  });
}

// ============================================================================
// MONITORING AND STATISTICS
// ============================================================================

/**
 * Get current ESI error limit state (legacy system)
 * Useful for monitoring and debugging
 *
 * @returns {Object} Current error limit state
 */
function getErrorLimitState() {
  return {
    ...esiErrorState,
    resetTimeReadable: esiErrorState.resetTime
      ? new Date(esiErrorState.resetTime * 1000).toISOString()
      : null,
  };
}

/**
 * Get current ESI rate limit state (new floating window system)
 * Useful for monitoring and debugging
 *
 * @returns {Object} Current rate limit state
 */
function getRateLimitState() {
  return {
    ...esiRateLimitState,
    resetTimeReadable: esiRateLimitState.resetTime
      ? new Date(esiRateLimitState.resetTime * 1000).toISOString()
      : null,
    percentRemaining:
      esiRateLimitState.tokensRemaining !== null && esiRateLimitState.tokensLimit !== null
        ? ((esiRateLimitState.tokensRemaining / esiRateLimitState.tokensLimit) * 100).toFixed(2) +
          '%'
        : 'N/A',
  };
}

/**
 * Get comprehensive limit state (both error and rate limits)
 * Useful for monitoring and debugging
 *
 * @returns {Object} Both error limit and rate limit states
 */
function getLimitState() {
  return {
    errorLimit: getErrorLimitState(),
    rateLimit: getRateLimitState(),
  };
}

/**
 * Get request statistics
 * Useful for monitoring and debugging
 *
 * @returns {Object} Request statistics
 */
function getRequestStats() {
  return {
    ...requestStats,
    successRate:
      requestStats.totalRequests > 0
        ? ((requestStats.successfulRequests / requestStats.totalRequests) * 100).toFixed(2) + '%'
        : 'N/A',
    averageTokensPerRequest:
      requestStats.totalRequests > 0
        ? (requestStats.tokensConsumed / requestStats.totalRequests).toFixed(2)
        : 'N/A',
  };
}

/**
 * Reset request statistics
 * Useful for testing or periodic monitoring resets
 */
function resetRequestStats() {
  requestStats.totalRequests = 0;
  requestStats.successfulRequests = 0;
  requestStats.failedRequests = 0;
  requestStats.retriedRequests = 0;
  requestStats.throttledRequests = 0;
  requestStats.rateLimitedRequests = 0;
  requestStats.tokensConsumed = 0;
}

/**
 * Parse MailStopSpamming error to extract retry delay
 *
 * ESI mail spam protection returns errors like:
 * "MailStopSpamming, details: {"remainingTime": 564217469}"
 *
 * @param {Error} error - Error from ESI request
 * @returns {Object|null} { isMailSpam: true, retryAfterMs: number, retryAfterDate: Date } or null if not a mail spam error
 */
function parseMailStopSpammingError(error) {
  if (!error?.response?.data?.error) {
    return null;
  }

  const errorMsg = error.response.data.error;
  if (typeof errorMsg !== 'string' || !errorMsg.includes('MailStopSpamming')) {
    return null;
  }

  try {
    // Extract the details JSON from the error message
    const detailsMatch = errorMsg.match(/details:\s*({[^}]+})/);
    if (detailsMatch) {
      const details = JSON.parse(detailsMatch[1]);
      if (details.remainingTime) {
        const retryAfterMs = parseInt(details.remainingTime, 10);
        const retryAfterDate = new Date(Date.now() + retryAfterMs);

        return {
          isMailSpam: true,
          retryAfterMs,
          retryAfterDate,
          retryAfterSeconds: (retryAfterMs / 1000).toFixed(1),
          retryAfterMinutes: (retryAfterMs / 60000).toFixed(1),
        };
      }
    }
  } catch (parseError) {
    console.warn('[ESI] Failed to parse MailStopSpamming error:', parseError.message);
  }

  return null;
}

/**
 * Check if an error is a MailStopSpamming error
 * Convenience function for quick checks
 *
 * @param {Error} error - Error from ESI request
 * @returns {boolean} True if this is a MailStopSpamming error
 */
function isMailStopSpammingError(error) {
  return parseMailStopSpammingError(error) !== null;
}

// ============================================================================
// ESI UNIVERSE OPERATIONS
// ============================================================================

/**
 * Get type information including group name
 *
 * Fetches type details and group details from ESI API.
 * Used for ship type lookup in admin management UI.
 *
 * @param {number} typeId - EVE type ID
 * @returns {Promise<Object>} Type and group info
 *
 * @example
 * const typeInfo = await getTypeInfo(33476);
 * // Returns: {
 * //   type_id: 33476,
 * //   type_name: "Mobile Cynosural Inhibitor",
 * //   group_id: 1249,
 * //   group_name: "Mobile Cyno Inhibitor"
 * // }
 */
async function getTypeInfo(typeId) {
  // Get type details
  const typeInfo = await esiGet(`${ESI_BASE_URL}/universe/types/${typeId}`);

  // Get group name
  const groupInfo = await esiGet(`${ESI_BASE_URL}/universe/groups/${typeInfo.group_id}`);

  return {
    type_id: typeId,
    type_name: typeInfo.name,
    group_id: typeInfo.group_id,
    group_name: groupInfo.name,
  };
}

/**
 * Resolve IDs to names in bulk
 *
 * Resolves IDs to their names. Automatically chunks into multiple requests
 * if more than 1000 IDs (ESI limit per request).
 * Supports: agents, alliances, characters, constellations, corporations,
 * factions, inventory_types, regions, stations, systems
 *
 * @param {number[]} ids - Array of IDs to resolve (any amount)
 * @returns {Promise<Object[]>} Array of {id, name, category} objects
 *
 * @example
 * const names = await resolveNames([90504880, 98815119, 34]);
 * // Returns: [
 * //   { id: 90504880, name: "Karaff Tuborg", category: "character" },
 * //   { id: 98815119, name: "ECTrade", category: "corporation" },
 * //   { id: 34, name: "Tritanium", category: "inventory_type" }
 * // ]
 */
async function resolveNames(ids) {
  if (!ids || ids.length === 0) {
    return [];
  }

  const url = `${ESI_BASE_URL}/universe/names`;
  const CHUNK_SIZE = 1000; // ESI limit per request

  // If under limit, single request
  if (ids.length <= CHUNK_SIZE) {
    return await esiPost(url, ids, null);
  }

  // Over limit - chunk into multiple requests
  console.log(`[ESI] Resolving ${ids.length} IDs in ${Math.ceil(ids.length / CHUNK_SIZE)} chunks`);

  const allResults = [];
  for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
    const chunk = ids.slice(i, i + CHUNK_SIZE);
    const chunkResults = await esiPost(url, chunk, null);
    allResults.push(...chunkResults);
  }

  return allResults;
}

/**
 * Resolve names to IDs in bulk
 *
 * Resolves names to their IDs. Automatically chunks into multiple requests
 * if more than 500 names (ESI limit per request).
 * Only exact matches are returned.
 *
 * @param {string[]} names - Array of names to resolve (any amount)
 * @returns {Promise<Object>} Object with categories containing matched names/IDs
 *
 * @example
 * const ids = await resolveIds(["Karaff Tuborg", "ECTrade"]);
 * // Returns: {
 * //   characters: [{ id: 90504880, name: "Karaff Tuborg" }],
 * //   corporations: [{ id: 98815119, name: "ECTrade" }]
 * // }
 */
async function resolveIds(names) {
  if (!names || names.length === 0) {
    return {};
  }

  const url = `${ESI_BASE_URL}/universe/ids`;
  const CHUNK_SIZE = 500; // ESI limit per request

  // If under limit, single request
  if (names.length <= CHUNK_SIZE) {
    return await esiPost(url, names, null);
  }

  // Over limit - chunk into multiple requests and merge results
  console.log(
    `[ESI] Resolving ${names.length} names in ${Math.ceil(names.length / CHUNK_SIZE)} chunks`
  );

  const mergedResults = {};
  for (let i = 0; i < names.length; i += CHUNK_SIZE) {
    const chunk = names.slice(i, i + CHUNK_SIZE);
    const chunkResults = await esiPost(url, chunk, null);

    // Merge results from each chunk (categories like characters, corporations, etc.)
    for (const [category, items] of Object.entries(chunkResults)) {
      if (!mergedResults[category]) {
        mergedResults[category] = [];
      }
      mergedResults[category].push(...items);
    }
  }

  return mergedResults;
}

// ============================================================================
// ESI MAIL OPERATIONS
// ============================================================================

/**
 * Send EVE mail
 *
 * @param {string} accessToken - Character access token (with mail send scope)
 * @param {number} senderCharacterId - Character ID sending the mail (must match access token)
 * @param {Object} mailData - Mail content and recipients
 * @param {string} mailData.subject - Mail subject (<= 1000 chars)
 * @param {string} mailData.body - Mail body (<= 10000 chars, supports HTML)
 * @param {Array<Object>} mailData.recipients - Array of recipients
 * @param {number} mailData.recipients[].recipient_id - Character/corp/alliance ID
 * @param {string} mailData.recipients[].recipient_type - Type: 'character', 'corporation', 'alliance', 'mailing_list'
 * @returns {Promise<number>} Mail ID of sent mail
 *
 * @example
 * const mailId = await sendMail(accessToken, 2123814259, {
 *   subject: "SRP Request Received",
 *   body: "Your SRP request has been received!",
 *   recipients: [{ recipient_id: 123456, recipient_type: 'character' }]
 * });
 */
async function sendMail(accessToken, senderCharacterId, { subject, body, recipients }) {
  const url = `${ESI_BASE_URL}/characters/${senderCharacterId}/mail`;

  const payload = {
    approved_cost: 0,
    body: body,
    recipients: recipients,
    subject: subject,
  };

  return await esiPost(url, payload, accessToken); // Returns mail ID
}

/**
 * Send SRP request confirmation mail
 *
 * Sent when an SRP request is received and processed.
 *
 * @param {string} accessToken - Character access token (with mail send scope)
 * @param {number} senderCharacterId - Character ID sending the mail (must match access token)
 * @param {number} recipientCharacterId - Recipient character ID
 * @param {string} recipientCharacterName - Recipient character name
 * @param {string} shipName - Ship type lost
 * @param {Date} lossDate - Date/time of loss
 * @param {number} payoutAmount - Expected payout amount in ISK
 * @param {string} killmailUrl - Zkillboard URL for the loss
 * @returns {Promise<number>} Mail ID
 */
async function sendSRPConfirmationMail(
  accessToken,
  senderCharacterId,
  recipientCharacterId,
  recipientCharacterName,
  shipName,
  lossDate,
  payoutAmount,
  killmailUrl
) {
  const subject = "O'Bomber-care - SRP Request Received";

  // Format payout amount with commas
  const formattedPayout = payoutAmount.toLocaleString('en-US');

  // Format loss date
  const lossDateStr = new Date(lossDate).toISOString().split('T')[0];
  const lossTimeStr = new Date(lossDate).toISOString().split('T')[1].split('.')[0];

  const body = `<b>SRP Request Received</b>

Greetings ${recipientCharacterName},

Your O'Bomber-care SRP request has been received and is now pending review.

<b>Request Details:</b>
• Pilot: ${recipientCharacterName}
• Ship: ${shipName}
• Loss Date: ${lossDateStr} ${lossTimeStr}
• Expected Payout: ${formattedPayout} ISK
• Killmail: <url=${killmailUrl}>${killmailUrl}</url>

Your request will be reviewed by leadership and processed accordingly. If approved, ISK will be sent directly to your character.

Fly safe.

- Bombers Bar Leadership

---
<b>O'Bomber-care</b> is Bombers Bar's ship replacement program. Questions? Contact leadership on the Bombers Bar Discord <url=https://discord.gg/yqQFDqRXvr>https://discord.gg/yqQFDqRXvr</url>`.trim();

  return await sendMail(accessToken, senderCharacterId, {
    subject,
    body,
    recipients: [
      {
        recipient_id: recipientCharacterId,
        recipient_type: 'character',
      },
    ],
  });
}

/**
 * Send SRP request rejection mail
 *
 * Sent when an SRP request is rejected (e.g., wrong pilot submitting)
 *
 * @param {string} accessToken - Character access token (with mail send scope)
 * @param {number} mailSenderCharacterId - Character ID sending the mail (must match access token)
 * @param {number} rejectedCharacterId - Character who sent the request (recipient of rejection)
 * @param {string} rejectedCharacterName - Name of sender who got rejected
 * @param {string} victimCharacterName - Name of actual victim in killmail
 * @param {string} killmailUrl - Zkillboard URL
 * @returns {Promise<number>} Mail ID
 */
async function sendSRPRejectionMail(
  accessToken,
  mailSenderCharacterId,
  rejectedCharacterId,
  rejectedCharacterName,
  victimCharacterName,
  killmailUrl
) {
  const subject = "O'Bomber-care - SRP Request Rejected (Pilot Mismatch)";

  const body = `<b>SRP Request Rejected</b>

Greetings ${rejectedCharacterName},

Your O'Bomber-care SRP request has been automatically rejected.

<b>Reason:</b>
The pilot in the killmail (${victimCharacterName}) does not match your character (${rejectedCharacterName}).

<b>What to do:</b>
If this is your loss on an alt character, please have <b>${victimCharacterName}</b> submit the SRP request directly by sending a mail with the killmail link.

If you believe this is an error, please contact leadership on Discord.

<b>Killmail:</b> <url=${killmailUrl}>${killmailUrl}</url>

Fly safe.

- Bombers Bar Leadership

---
<b>O'Bomber-care</b> is Bombers Bar's ship replacement program. Questions? Contact leadership on the Bombers Bar Discord <url=https://discord.gg/yqQFDqRXvr>https://discord.gg/yqQFDqRXvr</url>`.trim();

  return await sendMail(accessToken, mailSenderCharacterId, {
    subject,
    body,
    recipients: [
      {
        recipient_id: rejectedCharacterId,
        recipient_type: 'character',
      },
    ],
  });
}

/**
 * Send unapproved ship type rejection mail
 *
 * Sent when an SRP request is for a ship type not covered by O'Bomber-care
 *
 * @param {string} accessToken - Character access token (with mail send scope)
 * @param {number} mailSenderCharacterId - Character ID sending the mail (must match access token)
 * @param {number} rejectedCharacterId - Character who sent the request (recipient of rejection)
 * @param {string} rejectedCharacterName - Name of sender who got rejected
 * @param {string} shipName - Ship type that was lost
 * @param {string} killmailUrl - Zkillboard URL
 * @param {Object} approvedShipsMap - Pre-loaded approved ships map from getAllApprovedShips()
 * @returns {Promise<number>} Mail ID
 */
async function sendUnapprovedShipMail(
  accessToken,
  mailSenderCharacterId,
  rejectedCharacterId,
  rejectedCharacterName,
  shipName,
  killmailUrl,
  approvedShipsMap
) {
  const subject = "O'Bomber-care - SRP Request Rejected (Ship Not Covered)";

  // Import getShipsByGroup helper
  const { getShipsByGroup } = await import('./srp/shipTypes.js');

  // Build dynamic ship list from database
  const shipsByGroup = getShipsByGroup(approvedShipsMap);

  let shipList = '';
  for (const [groupName, ships] of Object.entries(shipsByGroup)) {
    const shipNames = ships.map((s) => s.name).join(', ');

    // Add notes if any ship in the group has them (e.g., "Hunters/Links Only")
    const shipWithNotes = ships.find((s) => s.notes);
    const notesSuffix = shipWithNotes ? ` - <b>*${shipWithNotes.notes}</b>` : '';

    shipList += `• ${groupName} (${shipNames}${notesSuffix})\n`;
  }

  const body = `<b>SRP Request - Ship Not Covered</b>

Greetings ${rejectedCharacterName},

Your O'Bomber-care SRP request has been automatically rejected.

<b>Reason:</b>
The ship type (${shipName}) is not covered under the O'Bomber-care program.

<b>Covered Ship Types:</b>
${shipList}

If you believe this is an error or have questions about coverage, please contact leadership on the Bombers Bar Discord.

<b>Killmail:</b> <url=${killmailUrl}>${killmailUrl}</url>

Fly safe.

- Bombers Bar Leadership

---
<b>O'Bomber-care</b> is Bombers Bar's ship replacement program. Questions? Contact leadership on the Bombers Bar Discord <url=https://discord.gg/yqQFDqRXvr>https://discord.gg/yqQFDqRXvr</url>`.trim();

  return await sendMail(accessToken, mailSenderCharacterId, {
    subject,
    body,
    recipients: [
      {
        recipient_id: rejectedCharacterId,
        recipient_type: 'character',
      },
    ],
  });
}

/**
 * Send mails with rate limiting
 *
 * EVE ESI rate limit: 4 mails per minute (15 seconds between mails)
 * This function processes mails sequentially with delays.
 *
 * @param {string} accessToken - Admin character access token
 * @param {Array<Object>} mailBatch - Array of mail objects
 * @param {Function} mailBatch[].sendFunction - Function to send the mail (returns Promise)
 * @param {number} [delayMs=15000] - Delay between mails in milliseconds (default: 15s for 4/minute)
 * @returns {Promise<Array>} Results array with success/error status
 */
async function sendMailsWithRateLimit(accessToken, mailBatch, delayMs = 15000) {
  const results = [];

  for (let i = 0; i < mailBatch.length; i++) {
    const mailJob = mailBatch[i];

    try {
      const result = await mailJob.sendFunction();
      results.push({
        index: i,
        status: 'success',
        result: result,
        ...mailJob.metadata,
      });

      console.log(`[MAIL RATE LIMIT] Sent mail ${i + 1}/${mailBatch.length}`);

      // Delay between mails (except after last mail)
      if (i < mailBatch.length - 1) {
        console.log(`[MAIL RATE LIMIT] Waiting ${delayMs}ms before next mail...`);
        await sleep(delayMs);
      }
    } catch (error) {
      results.push({
        index: i,
        status: 'error',
        error: error.message,
        ...mailJob.metadata,
      });

      console.error(
        `[MAIL RATE LIMIT] Error sending mail ${i + 1}/${mailBatch.length}:`,
        error.message
      );

      // Still delay even on error to maintain rate limit
      if (i < mailBatch.length - 1) {
        await sleep(delayMs);
      }
    }
  }

  return results;
}

/**
 * Get mail headers for a character
 *
 * Retrieves the list of mail headers (metadata) for a character.
 * Does not include mail body - use getMailContent() to get full mail.
 *
 * @param {string} accessToken - Character access token (with mail read scope)
 * @param {number} characterId - Character ID to get mail for
 * @param {Object} [options] - Optional parameters
 * @param {number} [options.lastMailId] - Return only mails newer than this ID
 * @param {Array<string>} [options.labels] - Filter by label IDs
 * @returns {Promise<Array>} Array of mail headers
 *
 * @example
 * const mailHeaders = await getMailHeaders(accessToken, 90504880);
 * // Returns: [{ mail_id, subject, from, timestamp, is_read, recipients, labels }, ...]
 */
async function getMailHeaders(accessToken, characterId, options = {}) {
  const url = `${ESI_BASE_URL}/characters/${characterId}/mail`;
  const params = {};

  if (options.lastMailId) {
    params.last_mail_id = options.lastMailId;
  }

  if (options.labels && options.labels.length > 0) {
    params.labels = options.labels.join(',');
  }

  return await esiGet(url, accessToken, params);
}

/**
 * Get full mail content
 *
 * Retrieves the complete mail including body content.
 *
 * @param {string} accessToken - Character access token (with mail read scope)
 * @param {number} characterId - Character ID that owns the mail
 * @param {number} mailId - Mail ID to retrieve
 * @returns {Promise<Object>} Mail object with full content
 *
 * @example
 * const mail = await getMailContent(accessToken, 90504880, 123456);
 * // Returns: { mail_id, subject, from, timestamp, body, recipients, labels, is_read }
 */
async function getMailContent(accessToken, characterId, mailId) {
  const url = `${ESI_BASE_URL}/characters/${characterId}/mail/${mailId}`;
  return await esiGet(url, accessToken);
}

/**
 * Get mail labels for a character
 *
 * Retrieves custom mail labels/folders for a character.
 *
 * @param {string} accessToken - Character access token (with mail read scope)
 * @param {number} characterId - Character ID to get labels for
 * @returns {Promise<Object>} Labels object with labels array and total_unread_count
 *
 * @example
 * const labelsData = await getMailLabels(accessToken, 90504880);
 * // Returns: { labels: [{ label_id, name, unread_count, color }], total_unread_count }
 */
async function getMailLabels(accessToken, characterId) {
  const url = `${ESI_BASE_URL}/characters/${characterId}/mail/labels`;
  return await esiGet(url, accessToken);
}

// ============================================================================
// ESI STATUS OPERATIONS
// ============================================================================

/**
 * Get ESI status from /meta/status endpoint
 *
 * @param {boolean} [forceRefresh=false] - Force refresh cache
 * @returns {Promise<Object>} ESI status data
 */
async function getESIStatus(forceRefresh = false) {
  const now = Date.now();

  // Return cached data if still valid
  if (
    !forceRefresh &&
    cachedStatus.data &&
    now - cachedStatus.lastFetched < cachedStatus.cacheDuration
  ) {
    return cachedStatus.data;
  }

  try {
    // Meta endpoints are at root level, not under /latest/
    const url = 'https://esi.evetech.net/meta/status';
    const status = await esiGet(url);

    cachedStatus.data = status;
    cachedStatus.lastFetched = now;

    return status;
  } catch (error) {
    console.error('[ESI STATUS] Failed to fetch status:', error.message);

    // If we have cached data, return it even if stale
    if (cachedStatus.data) {
      console.warn('[ESI STATUS] Using stale cached data due to fetch failure');
      return cachedStatus.data;
    }

    // No cached data - assume ESI is down
    return null;
  }
}

/**
 * Check if ESI is healthy enough to process mails
 *
 * Returns false if any critical routes are Down or Recovering.
 * Allows Degraded routes with a warning.
 *
 * @returns {Promise<Object>} { healthy: boolean, issues: string[], warnings: string[] }
 */
async function checkESIHealth() {
  const statusData = await getESIStatus();

  const result = {
    healthy: true,
    issues: [],
    warnings: [],
  };

  if (!statusData || !statusData.routes || statusData.routes.length === 0) {
    result.healthy = false;
    result.issues.push('Unable to fetch ESI status - assuming unhealthy');
    return result;
  }

  // Check critical routes
  for (const criticalRoute of CRITICAL_ROUTES) {
    const routeStatus = statusData.routes.find(
      (r) => r.method === criticalRoute.method && r.path === criticalRoute.path
    );

    if (!routeStatus) {
      // Route not in status list - assume OK
      continue;
    }

    const statusValue = routeStatus.status.toLowerCase();
    const routeLabel = `${criticalRoute.method} ${criticalRoute.path}`;

    if (statusValue === 'down') {
      result.healthy = false;
      result.issues.push(`Critical route DOWN: ${routeLabel}`);
    } else if (statusValue === 'recovering') {
      result.healthy = false;
      result.issues.push(`Critical route RECOVERING: ${routeLabel}`);
    } else if (statusValue === 'degraded') {
      result.warnings.push(`Critical route DEGRADED (may be slow): ${routeLabel}`);
    }
  }

  return result;
}

/**
 * Get current X-Compatibility-Date
 *
 * Returns the cached compatibility date from helpers module.
 * The date is automatically fetched and refreshed every hour.
 *
 * @returns {Promise<string>} Latest compatibility date (YYYY-MM-DD)
 */
async function getCompatibilityDate() {
  // Use the cached value (synchronous, already fetched)
  return getCompatibilityDateSync();
}

/**
 * Check if all critical mail-related routes are operational
 * Quick health check for mail processing
 *
 * @returns {Promise<boolean>} True if safe to process mails
 */
async function isMailProcessingSafe() {
  const health = await checkESIHealth();

  if (!health.healthy) {
    console.error('[ESI STATUS] Mail processing UNSAFE:', health.issues.join(', '));
    return false;
  }

  if (health.warnings.length > 0) {
    console.warn('[ESI STATUS] Mail processing may be slow:', health.warnings.join(', '));
  }

  return true;
}

/**
 * Get human-readable ESI health summary
 *
 * @returns {Promise<Object>} { status: string, message: string, routes: Object[] }
 */
async function getHealthSummary() {
  const health = await checkESIHealth();
  const statusData = await getESIStatus();

  let overallStatus = 'OK';
  let message = 'All critical ESI routes operational';

  if (!health.healthy) {
    overallStatus = 'DOWN';
    message = `Critical issues detected: ${health.issues.join(', ')}`;
  } else if (health.warnings.length > 0) {
    overallStatus = 'DEGRADED';
    message = `Some routes degraded: ${health.warnings.join(', ')}`;
  }

  // Get status of critical routes
  const routes = CRITICAL_ROUTES.map((criticalRoute) => {
    const routeStatus = statusData?.routes?.find(
      (r) => r.method === criticalRoute.method && r.path === criticalRoute.path
    );

    return {
      route: `${criticalRoute.method} ${criticalRoute.path}`,
      status: routeStatus?.status?.toLowerCase() || 'unknown',
    };
  });

  return {
    status: overallStatus,
    message,
    routes,
    lastChecked: cachedStatus.lastFetched ? new Date(cachedStatus.lastFetched).toISOString() : null,
  };
}

// ============================================================================
// ESI WALLET OPERATIONS
// ============================================================================

/**
 * Get corporation ID from character's public info
 *
 * @param {number} characterId - Character ID
 * @returns {Promise<number>} Corporation ID
 */
async function getCharacterCorporation(characterId) {
  const url = `${ESI_BASE_URL}/characters/${characterId}`;
  const data = await esiGet(url);
  return data.corporation_id;
}

/**
 * Fetch corporation wallet journal entries
 *
 * Returns list of wallet journal entries (ISK movements).
 * Journal entries are in reverse chronological order (newest first).
 *
 * @param {string} accessToken - Character access token (with corp wallet scope)
 * @param {number} corporationId - Corporation ID
 * @param {number} [division] - Wallet division (defaults to WALLET_DIVISION = 1)
 * @param {number} [page] - Page number for pagination (default: 1)
 * @returns {Promise<Object[]>} Array of journal entries
 * @property {number} amount - ISK amount (positive = credit, negative = debit)
 * @property {number} balance - Wallet balance after transaction
 * @property {number} context_id - Context identifier (varies by ref_type)
 * @property {string} date - Transaction date (ISO 8601)
 * @property {string} description - Transaction description
 * @property {number} first_party_id - Character/corp that initiated
 * @property {number} id - Unique journal entry ID
 * @property {string} ref_type - Transaction type (player_donation, bounty_prizes, etc.)
 * @property {number} second_party_id - Character/corp that received
 *
 * @example
 * const journal = await getWalletJournal(accessToken, corporationId);
 * // Returns: [{ id: 123, amount: 300000000, ref_type: "player_donation", ... }]
 */
async function getWalletJournal(
  accessToken,
  corporationId,
  division = WALLET_DIVISION,
  page = null
) {
  const url = `${ESI_BASE_URL}/corporations/${corporationId}/wallets/${division}/journal`;

  const params = {};
  if (page && page > 1) {
    params.page = page;
  }

  return await esiGet(url, accessToken, params);
}

/**
 * Fetch corporation wallet transactions
 *
 * Returns list of wallet transactions (market purchases/sales).
 * Transactions are in reverse chronological order (newest first).
 *
 * @param {string} accessToken - Character access token (with corp wallet scope)
 * @param {number} corporationId - Corporation ID
 * @param {number} [division] - Wallet division (defaults to WALLET_DIVISION = 1)
 * @param {number} [fromId] - Only show transactions before this ID (for pagination)
 * @returns {Promise<Object[]>} Array of transaction entries
 * @property {number} client_id - Character/corp that transaction was with
 * @property {string} date - Transaction date (ISO 8601)
 * @property {boolean} is_buy - True if corp bought, false if corp sold
 * @property {number} journal_ref_id - Corresponding journal entry ID (-1 if none)
 * @property {number} location_id - Station/structure where transaction occurred
 * @property {number} quantity - Number of items transacted
 * @property {number} transaction_id - Unique transaction ID
 * @property {number} type_id - EVE item type ID
 * @property {number} unit_price - ISK per unit
 *
 * @example
 * const transactions = await getWalletTransactions(accessToken, corporationId);
 * // Returns: [{ transaction_id: 123, type_id: 34, quantity: 10, unit_price: 1000000, ... }]
 */
async function getWalletTransactions(
  accessToken,
  corporationId,
  division = WALLET_DIVISION,
  fromId = null
) {
  const url = `${ESI_BASE_URL}/corporations/${corporationId}/wallets/${division}/transactions`;

  const params = {};

  if (fromId) {
    params.from_id = fromId;
  }

  return await esiGet(url, accessToken, params);
}

// ============================================================================
// ESI SHIP INFO OPERATIONS
// ============================================================================

/**
 * Parse ship information from ESI response
 * @param {Object} esiData - Raw ESI data
 * @returns {Object} Parsed ship info
 */
function parseShipInfo(esiData) {
  const dogmaAttrs = esiData.dogma_attributes || [];

  // Extract slot counts from dogma attributes
  const getAttribute = (attrId) => {
    const attr = dogmaAttrs.find((a) => a.attribute_id === attrId);
    return attr ? Math.floor(attr.value) : 0;
  };

  return {
    type_id: esiData.type_id,
    name: esiData.name,
    description: esiData.description || '',
    group_id: esiData.group_id,
    mass: esiData.mass || 0,
    volume: esiData.volume || 0,
    capacity: esiData.capacity || 0,
    published: esiData.published || false,

    // Slot specifications
    high_slots: getAttribute(DOGMA_ATTRIBUTES.HIGH_SLOTS),
    mid_slots: getAttribute(DOGMA_ATTRIBUTES.MID_SLOTS),
    low_slots: getAttribute(DOGMA_ATTRIBUTES.LOW_SLOTS),
    rig_slots:
      getAttribute(DOGMA_ATTRIBUTES.RIG_SLOTS) || getAttribute(DOGMA_ATTRIBUTES.RIG_SLOTS_ALT),
    launcher_hardpoints: getAttribute(DOGMA_ATTRIBUTES.LAUNCHER_HARDPOINTS),
    turret_hardpoints: getAttribute(DOGMA_ATTRIBUTES.TURRET_HARDPOINTS),
    cargo_capacity: getAttribute(DOGMA_ATTRIBUTES.CARGO_CAPACITY),

    // Raw dogma for advanced usage
    dogma_attributes: dogmaAttrs,
    dogma_effects: esiData.dogma_effects || [],
  };
}

/**
 * Fetch ship type information from ESI
 * @param {number} typeId - EVE type ID
 * @returns {Promise<Object>} Ship information
 */
async function getShipInfo(typeId) {
  // Check cache first
  const cached = shipInfoCache.get(typeId);
  if (cached && Date.now() - cached.timestamp < SHIP_INFO_CACHE_DURATION) {
    return cached.data;
  }

  try {
    const data = await esiGet(`${ESI_BASE_URL}/universe/types/${typeId}`);

    if (!data) {
      throw new Error('ESI returned empty response for ship info');
    }

    // Parse ship specifications
    const shipInfo = parseShipInfo(data);

    // Cache the result
    shipInfoCache.set(typeId, {
      data: shipInfo,
      timestamp: Date.now(),
    });

    return shipInfo;
  } catch (error) {
    console.error(`Error fetching ship info for type ${typeId}:`, error);
    throw error;
  }
}

/**
 * Fetch group information from ESI
 * @param {number} groupId - EVE group ID
 * @returns {Promise<Object>} Group information
 */
async function getGroupInfo(groupId) {
  try {
    const data = await esiGet(`${ESI_BASE_URL}/universe/groups/${groupId}`);

    if (!data) {
      throw new Error('ESI returned empty response for group info');
    }

    return data;
  } catch (error) {
    console.error(`Error fetching group info for ${groupId}:`, error);
    return { name: 'Unknown Group', group_id: groupId };
  }
}

/**
 * Get detailed info for multiple type IDs
 * @param {Array<number>} typeIds - Array of type IDs
 * @returns {Promise<Array>} Array of ship info objects
 */
async function getMultipleShipInfo(typeIds) {
  const promises = typeIds.map((id) =>
    getShipInfo(id).catch((err) => {
      console.error(`Failed to fetch ship ${id}:`, err);
      return null;
    })
  );

  const results = await Promise.all(promises);
  return results.filter((r) => r !== null);
}

/**
 * Clear the ship info cache (useful for testing/maintenance)
 */
function clearShipInfoCache() {
  shipInfoCache.clear();
}

/**
 * Get ship info cache statistics
 */
function getShipInfoCacheStats() {
  return {
    size: shipInfoCache.size,
    entries: Array.from(shipInfoCache.keys()),
  };
}

// ============================================================================
// ESI FITTING PARSER OPERATIONS
// ============================================================================

/**
 * Parse EVE fitting URL format
 * Format: <url=fitting:12032:5299;1:31592;1:380;1:...>Fit Name</url>
 * @param {string} fittingText - Full fitting text including URL tags
 * @returns {Object} Parsed fitting data
 */
function parseFittingURL(fittingText) {
  // Extract fitting data from URL tag
  const urlMatch = fittingText.match(/<url=fitting:([^>]+)>([^<]+)<\/url>/);

  if (!urlMatch) {
    throw new Error('Invalid fitting format. Expected EVE fitting URL format.');
  }

  const fittingData = urlMatch[1];
  const fittingName = urlMatch[2];

  // Split fitting data into parts
  const parts = fittingData.split(':');

  if (parts.length < 2) {
    throw new Error('Invalid fitting data structure');
  }

  const shipTypeId = parseInt(parts[0]);

  if (isNaN(shipTypeId)) {
    throw new Error('Invalid ship type ID');
  }

  // Parse modules (format: typeId;quantity)
  const modules = [];
  for (let i = 1; i < parts.length; i++) {
    if (!parts[i] || parts[i] === '_') continue; // Skip empty slots

    const [typeIdStr, quantityStr] = parts[i].split(';');
    const typeId = parseInt(typeIdStr);
    const quantity = parseInt(quantityStr) || 1;

    if (!isNaN(typeId) && typeId > 0) {
      modules.push({ type_id: typeId, quantity });
    }
  }

  return {
    ship_type_id: shipTypeId,
    name: fittingName,
    modules,
  };
}

/**
 * Parse EVE fitting from various formats
 * Supports: URL format, EFT format, or simple module list
 * @param {string} fittingText - Fitting text
 * @returns {Object} Parsed fitting
 */
function parseFitting(fittingText) {
  // Try URL format first
  if (fittingText.includes('<url=fitting:')) {
    return parseFittingURL(fittingText);
  }

  // Try EFT format (future enhancement)
  // [Ship Name, Fitting Name]
  // Module Name
  // ...

  throw new Error('Unsupported fitting format. Please use EVE in-game fitting link.');
}

/**
 * Get dogma effects for an item type
 * @param {number} typeId - Item type ID
 * @returns {Promise<Array>} Array of effect objects
 */
async function getItemEffects(typeId) {
  // Check cache
  const cached = itemEffectsCache.get(typeId);
  if (cached && Date.now() - cached.timestamp < ITEM_EFFECTS_CACHE_DURATION) {
    return cached.effects;
  }

  try {
    const data = await esiGet(`${ESI_BASE_URL}/universe/types/${typeId}`);
    const effects = data.dogma_effects || [];

    // Cache the result
    itemEffectsCache.set(typeId, {
      effects,
      timestamp: Date.now(),
      name: data.name,
    });

    return effects;
  } catch (error) {
    console.error(`Error fetching effects for type ${typeId}:`, error);
    return [];
  }
}

/**
 * Determine which slot type a module fits into
 * @param {number} typeId - Module type ID
 * @returns {Promise<string>} Slot type: 'high', 'mid', 'low', 'rig', 'subsystem', or 'cargo'
 */
async function determineSlotType(typeId) {
  const effects = await getItemEffects(typeId);
  const effectIds = effects.map((e) => e.effect_id);

  if (effectIds.includes(DOGMA_EFFECTS.HIGH_SLOT)) return 'high';
  if (effectIds.includes(DOGMA_EFFECTS.MID_SLOT)) return 'mid';
  if (effectIds.includes(DOGMA_EFFECTS.LOW_SLOT)) return 'low';
  if (effectIds.includes(DOGMA_EFFECTS.RIG_SLOT)) return 'rig';
  if (effectIds.includes(DOGMA_EFFECTS.SUB_SYSTEM)) return 'subsystem';

  // If no slot effect found, assume it's cargo (ammo, charges, etc.)
  return 'cargo';
}

/**
 * Categorize modules into slot types
 * @param {Array} modules - Array of {type_id, quantity}
 * @returns {Promise<Object>} Categorized modules
 */
async function categorizeModules(modules) {
  const categorized = {
    high: [],
    mid: [],
    low: [],
    rig: [],
    subsystem: [],
    cargo: [],
  };

  for (const item of modules) {
    const slotType = await determineSlotType(item.type_id);

    // Get cached name if available
    const cached = itemEffectsCache.get(item.type_id);
    const name = cached ? cached.name : `Type ${item.type_id}`;

    const moduleData = {
      type_id: item.type_id,
      name,
      quantity: item.quantity,
    };

    // For fitted modules (high/mid/low/rig/subsystem), expand quantity into individual slots
    // For cargo items, keep as single entry with quantity
    if (slotType === 'cargo') {
      categorized[slotType].push(moduleData);
    } else {
      // Expand into individual slot entries
      for (let i = 0; i < item.quantity; i++) {
        categorized[slotType].push({
          type_id: item.type_id,
          name,
          quantity: 1, // Each slot gets quantity 1
        });
      }
    }
  }

  return categorized;
}

/**
 * Parse and categorize a complete fitting
 * @param {string} fittingText - EVE fitting text
 * @returns {Promise<Object>} Complete fitting with categorized modules
 */
async function parseAndCategorizeFitting(fittingText) {
  // Parse the fitting format
  const parsed = parseFitting(fittingText);

  // Categorize modules by slot type
  const categorized = await categorizeModules(parsed.modules);

  return {
    ship_type_id: parsed.ship_type_id,
    name: parsed.name,
    high_slot_modules: categorized.high,
    mid_slot_modules: categorized.mid,
    low_slot_modules: categorized.low,
    rig_modules: categorized.rig,
    subsystem_modules: categorized.subsystem,
    cargo_items: categorized.cargo,
  };
}

/**
 * Convert categorized fitting to JSONB format for database
 * Pads arrays to match ship's slot counts and converts to fixed-length arrays
 * @param {Object} categorized - Categorized modules
 * @param {Object} shipSpecs - Ship specifications (slot counts)
 * @returns {Object} JSONB-ready fitting data
 */
function formatForDatabase(categorized, shipSpecs) {
  const padArray = (arr, length) => {
    const padded = [...arr];
    while (padded.length < length) {
      padded.push(null);
    }
    return padded.slice(0, length); // Ensure exact length
  };

  return {
    high_slot_modules: padArray(categorized.high_slot_modules || [], shipSpecs.high_slots || 8),
    mid_slot_modules: padArray(categorized.mid_slot_modules || [], shipSpecs.mid_slots || 8),
    low_slot_modules: padArray(categorized.low_slot_modules || [], shipSpecs.low_slots || 8),
    rig_modules: padArray(categorized.rig_modules || [], shipSpecs.rig_slots || 3),
    cargo_items: categorized.cargo_items || [],
  };
}

/**
 * Generate EVE fitting link from doctrine data
 * @param {Object} doctrine - Doctrine with modules
 * @returns {string} EVE fitting URL format
 */
function generateFittingLink(doctrine) {
  const parts = [doctrine.ship_type_id];

  // Helper to add modules
  const addModules = (modules) => {
    if (!modules) return;
    modules.forEach((mod) => {
      if (mod && mod.type_id) {
        parts.push(`${mod.type_id};${mod.quantity || 1}`);
      } else {
        parts.push('_'); // Empty slot
      }
    });
  };

  // Add in order: high, mid, low, rigs, cargo
  addModules(doctrine.high_slot_modules);
  addModules(doctrine.mid_slot_modules);
  addModules(doctrine.low_slot_modules);
  addModules(doctrine.rig_modules);
  addModules(doctrine.cargo_items);

  const fittingData = parts.join(':');
  return `<url=fitting:${fittingData}>${doctrine.name}</url>`;
}

/**
 * Clear the item effects cache (useful for testing)
 */
function clearFittingParserCache() {
  itemEffectsCache.clear();
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  // Constants
  ESI_BASE_URL,
  ESI_CONFIG,
  MAILER_CHARACTER_ID,
  WALLET_DIVISION,
  DOGMA_ATTRIBUTES,
  DOGMA_EFFECTS,

  // Core ESI request functions
  esiGet,
  esiPost,
  esiRequest,
  buildEsiHeaders,

  // Monitoring and statistics
  getErrorLimitState,
  getRateLimitState,
  getLimitState,
  getRequestStats,
  resetRequestStats,
  parseMailStopSpammingError,
  isMailStopSpammingError,

  // Compatibility date management
  refreshCompatibilityDate,
  getCompatibilityDateSync,

  // Universe operations
  resolveNames,
  resolveIds,
  getTypeInfo,

  // Mail operations
  sendMail,
  sendSRPConfirmationMail,
  sendSRPRejectionMail,
  sendUnapprovedShipMail,
  sendMailsWithRateLimit,
  getMailHeaders,
  getMailContent,
  getMailLabels,

  // Status operations
  getESIStatus,
  checkESIHealth,
  getCompatibilityDate,
  isMailProcessingSafe,
  getHealthSummary,

  // Wallet operations
  getCharacterCorporation,
  getWalletJournal,
  getWalletTransactions,

  // Ship info operations
  getShipInfo,
  getGroupInfo,
  getMultipleShipInfo,
  clearShipInfoCache,
  getShipInfoCacheStats,

  // Fitting parser operations
  parseFitting,
  parseFittingURL,
  parseAndCategorizeFitting,
  categorizeModules,
  determineSlotType,
  formatForDatabase,
  generateFittingLink,
  clearFittingParserCache,
};
