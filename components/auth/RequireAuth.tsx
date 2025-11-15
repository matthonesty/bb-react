'use client';

import { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/Card';
import type { UserRole } from '@/types';

interface RequireAuthProps {
  children: ReactNode;
  /** If true, requires user to have more than just 'user' role (i.e., FC/Admin role) */
  requireFCRole?: boolean;
  /** Custom roles required (checks if user has ANY of these roles) */
  requiredRoles?: UserRole[];
}

/**
 * Page-level authentication guard component
 *
 * Handles:
 * - Loading state while checking auth
 * - Authentication requirement (login prompt if not authenticated)
 * - Optional role-based authorization (access denied if insufficient permissions)
 *
 * @example
 * // Require any authenticated user
 * <RequireAuth>
 *   <YourPageContent />
 * </RequireAuth>
 *
 * @example
 * // Require FC/Admin role
 * <RequireAuth requireFCRole>
 *   <AdminPageContent />
 * </RequireAuth>
 *
 * @example
 * // Require specific roles
 * <RequireAuth requiredRoles={['admin', 'Council']}>
 *   <RestrictedContent />
 * </RequireAuth>
 */
export function RequireAuth({ children, requireFCRole = false, requiredRoles }: RequireAuthProps) {
  const { user, isAuthenticated, isLoading, hasAnyRole } = useAuth();

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-4 text-foreground-muted">Loading...</p>
        </div>
      </div>
    );
  }

  // Require authentication
  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <div className="text-center p-8">
            <h1 className="text-2xl font-bold text-foreground mb-4">Authentication Required</h1>
            <p className="text-foreground-muted mb-6">Please log in to continue.</p>
            <img
              src="https://web.ccpgamescdn.com/eveonlineassets/developers/eve-sso-login-white-large.png"
              alt="Login with EVE Online"
              onClick={() => {
                const returnUrl = encodeURIComponent(window.location.pathname);
                window.location.href = `/api/auth/login?return_url=${returnUrl}`;
              }}
              className="cursor-pointer hover:opacity-80 transition-opacity mx-auto"
            />
          </div>
        </Card>
      </div>
    );
  }

  // Check role-based authorization if required
  if (requireFCRole || requiredRoles) {
    let hasAccess = false;

    if (requireFCRole) {
      // Require any active FC role (more than just 'user' role)
      hasAccess = !!(user && user.roles.length > 1);
    } else if (requiredRoles) {
      // Check if user has any of the required roles
      hasAccess = hasAnyRole(requiredRoles);
    }

    if (!hasAccess) {
      return (
        <div className="flex min-h-screen items-center justify-center px-4">
          <Card className="max-w-md w-full">
            <div className="text-center p-8">
              <h1 className="text-2xl font-bold text-foreground mb-4">Access Denied</h1>
              <p className="text-foreground-muted mb-6">
                You do not have permission to access this page.
              </p>
              <button
                onClick={() => (window.location.href = '/')}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                Go Home
              </button>
            </div>
          </Card>
        </div>
      );
    }
  }

  // User is authenticated and authorized - render children
  return <>{children}</>;
}
