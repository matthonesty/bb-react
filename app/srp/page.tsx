'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { SRPTable } from '@/components/srp/SRPTable';
import { SRPFilters } from '@/components/srp/SRPFilters';
import { Card } from '@/components/ui/Card';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import type { SRPStatus } from '@/types';

function SRPContent() {
  useEffect(() => {
    document.title = 'Ship Replacement Program - Bombers Bar';
  }, []);
  const { hasRole } = useAuth();
  const searchParams = useSearchParams();
  const idFromUrl = searchParams.get('id');

  const [statusFilter, setStatusFilter] = useState<SRPStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState(idFromUrl || '');
  const [currentPage, setCurrentPage] = useState(1);

  const isAdmin = hasRole(['admin', 'Council', 'OBomberCare']);

  return (
    <PageContainer>
      <PageHeader
        title="Ship Replacement Program"
        description="View and manage SRP requests for fleet losses"
      />

      {/* Filters */}
      <div className="mb-6">
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
    </PageContainer>
  );
}

export default function SRPPage() {
  return (
    <RequireAuth requireFCRole>
      <Suspense
        fallback={
          <PageContainer>
            <div className="flex items-center justify-center p-12">
              <div className="text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
                <p className="mt-4 text-foreground-muted">Loading...</p>
              </div>
            </div>
          </PageContainer>
        }
      >
        <SRPContent />
      </Suspense>
    </RequireAuth>
  );
}
