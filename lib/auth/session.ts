/**
 * Server-side session management for Next.js App Router
 */

import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export interface Session {
  character_id: number;
  character_name: string;
  corporation_id?: number;
  corporation_name?: string;
  alliance_id?: number;
  alliance_name?: string;
  roles?: string[];
}

/**
 * Get the current user session from cookies
 * Returns null if not authenticated
 */
export async function getServerSession(): Promise<Session | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return null;
    }

    // Verify and decode JWT
    const decoded = jwt.verify(token, JWT_SECRET) as Session;

    // Re-check roles from database to ensure they're up-to-date
    const { getRoles } = require('@/lib/auth/roles');
    const currentRoles = await getRoles(decoded.character_id);

    // Return session with current roles from database
    return {
      ...decoded,
      roles: currentRoles
    };
  } catch (error) {
    console.error('[AUTH] Session verification failed:', error);
    return null;
  }
}

/**
 * Check if the current user has one of the required roles
 */
export async function hasRole(requiredRoles: string[]): Promise<boolean> {
  const session = await getServerSession();

  if (!session || !session.roles) {
    return false;
  }

  return session.roles.some(role => requiredRoles.includes(role));
}
