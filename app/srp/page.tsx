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
  const { user, hasRole } = useAuth();
  const [statusFilter, setStatusFilter] = useState<SRPStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
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
        />
      </Card>
    </div>
  );
}
