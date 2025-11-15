/**
 * Logout Endpoint
 * Clears authentication token
 */

import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({
    success: true,
    message: 'Logged out successfully',
  });

  // Clear auth token cookie
  response.cookies.delete('auth_token');
  response.cookies.delete('auth_state');

  return response;
}
