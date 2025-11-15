/**
 * @fileoverview ESI API Helper Utilities
 *
 * Centralized ESI API client with comprehensive rate limiting, error handling,
 * and retry logic. Implements philosophy from ect-api with ESI-specific enhancements.
 *
 * Key Features:
 * - Automatic retry with exponential backoff
 * - ESI error limit tracking (X-ESI-Error-Limit-Remain, X-ESI-Error-Limit-Reset)
 * - Automatic throttling when error budget is low
 * - Network error detection and handling
 * - Configurable timeouts and retry strategies
 * - Request statistics and monitoring
 */

import axios from 'axios';

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
  MAX_RETRY_DELAY: 10000,     // 10 seconds (does not apply to ESI-specified delays)
  BACKOFF_MULTIPLIER: 2,       // Exponential backoff

  // Error limit thresholds
  ERROR_LIMIT_WARNING_THRESHOLD: 20,  // Warn when below 20 errors remaining
  ERROR_LIMIT_CRITICAL_THRESHOLD: 5,  // Throttle heavily when below 5

  // Throttle delays (ms)
  THROTTLE_DELAY_WARNING: 500,   // Delay when in warning zone
  THROTTLE_DELAY_CRITICAL: 2000, // Delay when in critical zone

  // Mail spam protection - max wait time (15 minutes in ms)
  // ESI's MailStopSpamming can require very long waits
  MAX_MAIL_SPAM_DELAY: 15 * 60 * 1000,
};

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
      console.warn(`[ESI] CRITICAL: Only ${tokensRemaining}/${tokensLimit} tokens remaining (${percentRemaining.toFixed(1)}%)`);
      maxDelay = Math.max(maxDelay, ESI_CONFIG.THROTTLE_DELAY_CRITICAL);
    }
    // If we're down to 25% of tokens, throttle moderately
    else if (percentRemaining <= 25) {
      console.warn(`[ESI] WARNING: Only ${tokensRemaining}/${tokensLimit} tokens remaining (${percentRemaining.toFixed(1)}%)`);
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
              console.warn(`[ESI] MailStopSpamming delay too long (${(delayMs / 1000).toFixed(1)}s), capping at ${ESI_CONFIG.MAX_MAIL_SPAM_DELAY / 1000}s`);
              delayMs = ESI_CONFIG.MAX_MAIL_SPAM_DELAY;
            }

            console.warn(`[ESI] MailStopSpamming: waiting ${(delayMs / 1000).toFixed(1)}s (${(delayMs / 60000).toFixed(1)} min) before retry`);
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

/**
 * Sleep utility for delays
 *
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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
        'Accept': 'application/json',
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
  console.log('To update: Change cachedCompatibilityDate.date in lib/esi/helpers.js');
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

    // Direct axios call to avoid circular dependency with esiGet
    const response = await axios({
      method: 'GET',
      url,
      headers: {
        'Accept': 'application/json',
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
        console.log(`[ESI] Newer compatibility date detected: ${cachedCompatibilityDate.date} → ${latestDate}`);

        // Fetch and display changelog for changes after our current date
        const changelog = await fetchRelevantChangelog(cachedCompatibilityDate.date);

        if (changelog && Object.keys(changelog).length > 0) {
          displayChangelog(changelog, cachedCompatibilityDate.date, latestDate);
        } else {
          console.log(`[ESI] No breaking changes found between ${cachedCompatibilityDate.date} and ${latestDate}`);
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
  if (!cachedCompatibilityDate.lastFetched ||
      (now - cachedCompatibilityDate.lastFetched) > cachedCompatibilityDate.cacheDuration) {
    // Trigger refresh (non-blocking)
    refreshCompatibilityDate().catch(err =>
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
    'Accept': 'application/json',
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
refreshCompatibilityDate().catch(err =>
  console.warn('[ESI] Initial compatibility date fetch failed:', err.message)
);

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
        const error = new Error(`ESI returned ${response.status}: ${response.data?.error || 'Unknown error'}`);
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
 * const data = await esiGet(`${ESI_BASE_URL}/characters/123/`, token);
 * const publicData = await esiGet(`${ESI_BASE_URL}/characters/123/`); // Public endpoint
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
 * const mailId = await esiPost(`${ESI_BASE_URL}/characters/123/mail/`, mailData, token);
 * const names = await esiPost(`${ESI_BASE_URL}/universe/names/`, [123, 456]); // Public endpoint
 */
async function esiPost(url, payload, accessToken = null, options = {}) {
  return esiRequest('POST', url, {
    accessToken,
    data: payload,
    ...options,
  });
}

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
    percentRemaining: esiRateLimitState.tokensRemaining !== null && esiRateLimitState.tokensLimit !== null
      ? ((esiRateLimitState.tokensRemaining / esiRateLimitState.tokensLimit) * 100).toFixed(2) + '%'
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
    successRate: requestStats.totalRequests > 0
      ? (requestStats.successfulRequests / requestStats.totalRequests * 100).toFixed(2) + '%'
      : 'N/A',
    averageTokensPerRequest: requestStats.totalRequests > 0
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

export {
  ESI_BASE_URL,
  ESI_CONFIG,
  buildEsiHeaders,
  esiGet,
  esiPost,
  esiRequest,
  getErrorLimitState,
  getRateLimitState,
  getLimitState,
  getRequestStats,
  resetRequestStats,
  parseMailStopSpammingError,
  isMailStopSpammingError,
  refreshCompatibilityDate,
  getCompatibilityDateSync,
};
