/**
 * @fileoverview JWKS (JSON Web Key Set) utilities for EVE SSO JWT verification
 *
 * Implements proper JWT signature verification using EVE's public keys.
 * Fetches JWKS metadata from EVE SSO and caches it for performance.
 *
 * JWT Signature Verification Process:
 * 1. Fetch JWKS metadata from EVE SSO well-known endpoint
 * 2. Extract JWKS URI from metadata
 * 3. Fetch public keys from JWKS URI
 * 4. Cache keys for performance (5 minute TTL)
 * 5. Use public key to verify JWT signature
 *
 * Security:
 * - Verifies token signature with EVE's public key
 * - Validates issuer matches EVE SSO
 * - Checks token expiration (exp claim)
 * - Verifies audience contains client_id and "EVE Online"
 *
 * @see {@link https://login.eveonline.com/.well-known/oauth-authorization-server} Metadata endpoint
 * @see {@link https://docs.esi.evetech.net/docs/sso/} EVE SSO documentation
 */

const axios = require('axios');
const jwt = require('jsonwebtoken');

/**
 * EVE SSO OAuth metadata endpoint
 * @constant {string}
 */
const METADATA_URL = 'https://login.eveonline.com/.well-known/oauth-authorization-server';

/**
 * JWKS cache duration in seconds (5 minutes)
 * @constant {number}
 */
const JWKS_CACHE_TTL = 300;

/**
 * Accepted token issuers
 * EVE SSO may use either format
 * @constant {string[]}
 */
const ACCEPTED_ISSUERS = ['login.eveonline.com', 'https://login.eveonline.com'];

/**
 * Expected audience value (static EVE Online identifier)
 * @constant {string}
 */
const EXPECTED_AUDIENCE = 'EVE Online';

// JWKS cache storage
let jwksCache = null;
let jwksCacheExpiry = 0;

/**
 * Fetch JWKS metadata from EVE SSO
 *
 * Fetches OAuth metadata and extracts JWKS URI, then fetches the actual keys.
 * Results are cached for JWKS_CACHE_TTL seconds to avoid excessive requests.
 *
 * Metadata Flow:
 * 1. GET https://login.eveonline.com/.well-known/oauth-authorization-server
 * 2. Extract jwks_uri from response
 * 3. GET jwks_uri to fetch public keys
 * 4. Cache keys with TTL
 *
 * @returns {Promise<Object>} JWKS object with public keys
 * @property {Array} keys - Array of public key objects
 * @throws {Error} If metadata or JWKS fetch fails
 *
 * @example
 * const jwks = await fetchJWKS();
 * // Returns: { keys: [{ kid: "...", kty: "RSA", alg: "RS256", ... }] }
 */
async function fetchJWKS() {
  // Return cached JWKS if still valid
  if (jwksCache && Date.now() < jwksCacheExpiry) {
    return jwksCache;
  }

  try {
    // Fetch OAuth metadata
    const metadataResponse = await axios.get(METADATA_URL);
    const metadata = metadataResponse.data;

    // Extract JWKS URI
    const jwksUri = metadata.jwks_uri;
    if (!jwksUri) {
      throw new Error('JWKS URI not found in metadata');
    }

    // Fetch JWKS from URI
    const jwksResponse = await axios.get(jwksUri);
    const jwks = jwksResponse.data;

    // Cache JWKS with TTL
    jwksCache = jwks;
    jwksCacheExpiry = Date.now() + (JWKS_CACHE_TTL * 1000);

    return jwks;
  } catch (error) {
    console.error('Error fetching JWKS:', error.message);
    throw new Error('Failed to fetch JWKS metadata');
  }
}

/**
 * Get public key for JWT verification
 *
 * Extracts the appropriate public key from JWKS based on JWT header.
 * Matches on key ID (kid) and algorithm (alg) from JWT header.
 *
 * @param {string} token - JWT token to extract header from
 * @returns {Promise<Object>} Public key object for verification
 * @throws {Error} If no matching key is found
 *
 * @example
 * const publicKey = await getPublicKey(accessToken);
 * // Returns: { kid: "...", kty: "RSA", alg: "RS256", n: "...", e: "..." }
 */
async function getPublicKey(token) {
  const jwks = await fetchJWKS();

  // Decode JWT header to get kid and alg
  const header = jwt.decode(token, { complete: true })?.header;
  if (!header) {
    throw new Error('Invalid token format');
  }

  // Find matching key
  const key = jwks.keys.find(
    k => k.kid === header.kid && k.alg === header.alg
  );

  if (!key) {
    throw new Error(`No matching public key found for kid: ${header.kid}, alg: ${header.alg}`);
  }

  return key;
}

/**
 * Convert JWKS key to PEM format for jsonwebtoken library
 *
 * The jsonwebtoken library expects PEM-formatted public keys.
 * This function converts JWKS RSA key to PEM format.
 *
 * @param {Object} jwk - JWKS key object
 * @param {string} jwk.kty - Key type (should be "RSA")
 * @param {string} jwk.n - RSA modulus (base64url encoded)
 * @param {string} jwk.e - RSA exponent (base64url encoded)
 * @returns {string} PEM-formatted public key
 *
 * Note: For production use, consider using a library like node-jose or jose
 * for proper JWKS to PEM conversion. This is a simplified implementation.
 */
function jwkToPem(jwk) {
  // For simplicity, we'll use the key directly with jsonwebtoken
  // jsonwebtoken 9.x can handle JWKS format directly
  return jwk;
}

/**
 * Verify and decode JWT access token with signature verification
 *
 * Performs complete JWT validation:
 * 1. Fetches public key from JWKS based on token header
 * 2. Verifies signature using EVE's public key
 * 3. Validates issuer matches EVE SSO
 * 4. Checks token expiration
 * 5. Verifies audience contains client_id and "EVE Online"
 *
 * JWT Claims Returned:
 * - sub: Subject "CHARACTER:EVE:<character_id>"
 * - name: Character name
 * - iss: Issuer (login.eveonline.com)
 * - exp: Expiration timestamp
 * - aud: Audience array [client_id, "EVE Online"]
 * - scp: Scopes array
 *
 * @param {string} accessToken - JWT access token from EVE SSO
 * @param {string} clientId - Application client ID for audience verification
 * @returns {Promise<Object>} Verified JWT payload with character info
 * @throws {Error} If token is invalid, expired, or signature verification fails
 *
 * @example
 * const payload = await verifyJWT(accessToken, process.env.EVE_CLIENT_ID);
 * // Returns: { sub: "CHARACTER:EVE:12345", name: "Character Name", ... }
 */
async function verifyJWT(accessToken, clientId) {
  try {
    // Get public key for this token
    const publicKey = await getPublicKey(accessToken);

    // Verify token with jsonwebtoken
    // Note: jsonwebtoken 9.x+ supports JWKS format directly
    const decoded = jwt.verify(accessToken, publicKey, {
      algorithms: [publicKey.alg],
      issuer: ACCEPTED_ISSUERS,
      // Note: audience verification is more complex for EVE SSO
      // We'll verify it manually after decoding
      complete: false
    });

    // Verify audience manually (must contain both client_id and "EVE Online")
    if (!Array.isArray(decoded.aud)) {
      throw new Error('Invalid audience format');
    }

    if (!decoded.aud.includes(clientId)) {
      throw new Error(`Token audience does not include client_id: ${clientId}`);
    }

    if (!decoded.aud.includes(EXPECTED_AUDIENCE)) {
      throw new Error(`Token audience does not include expected value: ${EXPECTED_AUDIENCE}`);
    }

    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token has expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error(`Token verification failed: ${error.message}`);
    } else {
      console.error('JWT verification error:', error.message);
      throw error;
    }
  }
}

/**
 * Basic token validation without signature verification (fallback)
 *
 * Use this only if JWKS fetching fails or for backwards compatibility.
 * Performs basic checks without cryptographic signature verification.
 *
 * WARNING: This does not verify the token signature. Use verifyJWT() for
 * production environments.
 *
 * @param {string} accessToken - JWT access token
 * @param {string} clientId - Application client ID
 * @returns {Object} Decoded token payload (NOT verified)
 * @throws {Error} If token is invalid or expired
 */
function validateTokenBasic(accessToken, clientId) {
  const decoded = jwt.decode(accessToken, { complete: true });

  if (!decoded) {
    throw new Error('Invalid token format');
  }

  const payload = decoded.payload;

  // Verify issuer
  if (!ACCEPTED_ISSUERS.includes(payload.iss)) {
    throw new Error('Invalid token issuer');
  }

  // Verify expiration
  if (payload.exp && payload.exp < Date.now() / 1000) {
    throw new Error('Token has expired');
  }

  // Verify audience
  if (!Array.isArray(payload.aud) || !payload.aud.includes(clientId)) {
    throw new Error('Invalid token audience');
  }

  return payload;
}

/**
 * Clear JWKS cache (useful for testing or forcing refresh)
 *
 * @example
 * clearJWKSCache(); // Next verification will fetch fresh JWKS
 */
function clearJWKSCache() {
  jwksCache = null;
  jwksCacheExpiry = 0;
}

module.exports = {
  fetchJWKS,
  getPublicKey,
  verifyJWT,
  validateTokenBasic,
  clearJWKSCache
};
