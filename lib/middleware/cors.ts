/**
 * @fileoverview CORS middleware for Next.js API routes
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

import { NextRequest, NextResponse } from 'next/server';

/**
 * Apply CORS headers and handle OPTIONS preflight requests
 *
 * Sets appropriate CORS headers for cross-origin requests and handles
 * OPTIONS preflight requests automatically.
 *
 * @param request - HTTP request object
 * @returns Response with CORS headers if OPTIONS, null otherwise
 *
 * @example
 * export async function GET(request: NextRequest) {
 *   const corsResponse = handleCors(request);
 *   if (corsResponse) return corsResponse;
 *
 *   // ... endpoint logic
 * }
 */
export function handleCors(request: NextRequest): NextResponse | null {
  const allowedOrigin = process.env.FRONTEND_URL || 'https://data.edencom.net';

  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': 'X-Requested-With,content-type,Authorization',
      },
    });
  }

  return null;
}

/**
 * Add CORS headers to a response
 *
 * @param response - Response to add headers to
 * @returns Response with CORS headers added
 */
export function addCorsHeaders(response: NextResponse): NextResponse {
  const allowedOrigin = process.env.FRONTEND_URL || 'https://data.edencom.net';

  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Allow-Origin', allowedOrigin);
  response.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'X-Requested-With,content-type,Authorization');

  return response;
}

/**
 * Legacy middleware for old-style serverless functions (deprecated)
 * Use handleCors for Next.js App Router instead
 */
export function corsMiddleware(req: { method: string }, res: any): boolean {
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
