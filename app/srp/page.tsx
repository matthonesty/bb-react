'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/Card';
import { SRPTable } from '@/components/srp/SRPTable';
import { SRPFilters } from '@/components/srp/SRPFilters';
import type { SRPStatus } from '@/types';

export default function SRPPage() {
  useEffect(() => {
    document.title = 'Ship Replacement Program - Bombers Bar';
  }, []);
  const { user, hasRole, isAuthenticated, isLoading } = useAuth();
  const [statusFilter, setStatusFilter] = useState<SRPStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const isAdmin = hasRole(['admin', 'Council', 'Accountant']);

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

  // Require authentication for SRP page
  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <div className="text-center p-8">
            <h1 className="text-2xl font-bold text-foreground mb-4">
              Authentication Required
            </h1>
            <p className="text-foreground-muted mb-6">
              You must be logged in to access the Ship Replacement Program.
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
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Page Header */}
      <div className="mb-8">
        <div className="mb-4">
          <h1 className="text-3xl font-bold text-foreground">
            Ship Replacement Program
          </h1>
          <p className="text-foreground-muted">
            View and manage SRP requests for fleet losses
          </p>
        </div>

        <SRPFilters
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
        />
      </div>

      {/* SRP Table */}
      <Card variant="bordered" padding="none">
        <SRPTable
          statusFilter={statusFilter}
          searchQuery={searchQuery}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          isAdmin={isAdmin}
        />
      </Card>
    </div>
  );
}
