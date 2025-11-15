/**
 * Shared API Authentication Utilities
 *
 * Provides reusable auth helpers for Next.js App Router API routes.
 * Centralizes JWT verification and permission checking to maintain DRY principles.
 */

import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET!;

/**
 * User object from JWT token
 */
export interface AuthUser {
  character_id: number;
  character_name: string;
  corporation_id?: number;
  corporation_name?: string;
  alliance_id?: number;
  alliance_name?: string;
  roles: string[];
}

/**
 * Verify authentication from request cookies
 *
 * @param request - Next.js request object
 * @returns Decoded user object or null if not authenticated
 */
export async function verifyAuth(request: NextRequest): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;

  if (!token) {
    return null;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Check if user has admin or council role
 *
 * @param roles - User's roles
 * @returns True if user can manage (admin or council)
 */
export function canManage(roles: string[]): boolean {
  return roles?.some((role: string) => ['admin', 'Council'].includes(role));
}

/**
 * Check if user has specific roles
 *
 * @param userRoles - User's roles
 * @param requiredRoles - Required roles (user needs at least one)
 * @returns True if user has at least one required role
 */
export function hasAnyRole(userRoles: string[], requiredRoles: string[]): boolean {
  return userRoles?.some((role: string) => requiredRoles.includes(role));
}

/**
 * Check if user has all specified roles
 *
 * @param userRoles - User's roles
 * @param requiredRoles - Required roles (user needs all)
 * @returns True if user has all required roles
 */
export function hasAllRoles(userRoles: string[], requiredRoles: string[]): boolean {
  return requiredRoles.every((role: string) => userRoles?.includes(role));
}
