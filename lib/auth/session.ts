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
export async function getServerSession(requireAuthorizedRole: boolean = true): Promise<Session | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return null;
    }

    // Verify and decode JWT
    const decoded = jwt.verify(token, JWT_SECRET) as Session;

    // Re-check roles from database to ensure they're up-to-date
    const { getRoles, isAuthorizedRole } = require('@/lib/auth/roles');
    const currentRoles = await getRoles(decoded.character_id);

    // If requireAuthorizedRole is true, check for fleet_commanders access
    if (requireAuthorizedRole) {
      const hasAuthorizedRole = currentRoles.some((role: string) => isAuthorizedRole(role));

      if (!hasAuthorizedRole) {
        return null;
      }
    }

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
 * Get session for standalone pages that don't require fleet_commanders access
 * Allows any authenticated EVE user
 */
export async function getPublicSession(): Promise<Session | null> {
  return getServerSession(false);
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
