'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { SRPTable } from '@/components/srp/SRPTable';
import { SRPFilters } from '@/components/srp/SRPFilters';
import { Card } from '@/components/ui/Card';
import type { SRPStatus } from '@/types';

function SRPContent() {
  useEffect(() => {
    document.title = 'Ship Replacement Program - Bombers Bar';
  }, []);
  const { user, hasRole } = useAuth();
  const searchParams = useSearchParams();
  const idFromUrl = searchParams.get('id');

  const [statusFilter, setStatusFilter] = useState<SRPStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState(idFromUrl || '');
  const [currentPage, setCurrentPage] = useState(1);

  const isAdmin = hasRole(['admin', 'Council', 'Accountant']);

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
          autoOpenId={idFromUrl}
        />
      </Card>
    </div>
  );
}

export default function SRPPage() {
  return (
    <RequireAuth requireFCRole>
      <Suspense fallback={
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center p-12">
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
              <p className="mt-4 text-foreground-muted">Loading...</p>
            </div>
          </div>
        </div>
      }>
        <SRPContent />
      </Suspense>
    </RequireAuth>
  );
}
