/**
 * @fileoverview CORS middleware for Vercel serverless functions
 *
 * Provides centralized CORS header management and OPTIONS preflight handling.
 * Replaces duplicated CORS code across all API endpoints.
 *
 * Security:
 * - Uses specific allowed origin (not wildcard '*')
 * - Credentials enabled for authenticated requests
 * - SameSite protection via cookie settings
 *
 * @module lib/middleware/cors
 */

/**
 * Apply CORS headers and handle OPTIONS preflight requests
 *
 * Sets appropriate CORS headers for cross-origin requests and handles
 * OPTIONS preflight requests automatically.
 *
 * @param {Object} req - HTTP request object
 * @param {string} req.method - HTTP method (GET, POST, OPTIONS, etc.)
 * @param {Object} res - HTTP response object
 * @returns {boolean} True if request was handled (OPTIONS), false otherwise
 *
 * @example
 * const { corsMiddleware } = require('../lib/middleware/cors');
 *
 * module.exports = async (req, res) => {
 *   if (corsMiddleware(req, res)) return;
 *   // ... endpoint logic
 * };
 */
function corsMiddleware(req, res) {
  const allowedOrigin = process.env.FRONTEND_URL || 'https://data.edencom.net';

  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true;
  }

  return false;
}

module.exports = { corsMiddleware };
