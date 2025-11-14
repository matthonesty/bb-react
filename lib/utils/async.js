/**
 * @fileoverview Async Utility Functions
 *
 * Common async/await helper utilities.
 */

/**
 * Sleep for a specified duration
 *
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>} Promise that resolves after the delay
 *
 * @example
 * await sleep(1000); // Wait 1 second
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export { sleep };
