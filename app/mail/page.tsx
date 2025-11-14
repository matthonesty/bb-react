'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ProcessedMailsTable } from '@/components/mail/ProcessedMailsTable';

export default function ProcessedMailsPage() {
  const { user, isAuthenticated, isLoading, hasAnyRole } = useAuth();
  const [isViewOnly, setIsViewOnly] = useState(false);

  useEffect(() => {
    document.title = 'Processed Mails - Bombers Bar';

    // Check if user is view-only (FC or Accountant without higher permissions)
    if (user?.roles) {
      const viewOnly = (user.roles.includes('FC') || user.roles.includes('Accountant')) &&
        !user.roles.includes('admin') &&
        !user.roles.includes('Council');
      setIsViewOnly(viewOnly);
    }
  }, [user]);

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
        <div className="max-w-md w-full bg-card-bg border border-card-border rounded-lg shadow-lg">
          <div className="text-center p-8">
            <h1 className="text-2xl font-bold text-foreground mb-4">
              Authentication Required
            </h1>
            <p className="text-foreground-muted mb-6">
              You must be logged in to access processed mails.
            </p>
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
        </div>
      </div>
    );
  }

  // Require any active FC role (anyone in fleet_commanders with active status)
  // This includes: admin, Council, Accountant, OBomberCare, FC, Election Officer
  const hasAccess = user && user.roles.length > 1; // More than just 'user' role
  if (!hasAccess) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-md w-full bg-card-bg border border-card-border rounded-lg shadow-lg">
          <div className="text-center p-8">
            <h1 className="text-2xl font-bold text-foreground mb-4">
              Access Denied
            </h1>
            <p className="text-foreground-muted mb-6">
              You do not have permission to access processed mails. This page is restricted to Fleet Commanders and Leadership.
            </p>
            <button
              onClick={() => window.location.href = '/srp'}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Go to SRP
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Processed Mails</h1>
        <p className="text-foreground-muted">
          View and manage EVE in-game mails processed by the automated SRP mailer system.
        </p>
      </div>

      <ProcessedMailsTable isViewOnly={isViewOnly} />
    </div>
  );
}
