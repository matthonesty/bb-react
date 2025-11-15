'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/Table';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { apiClient } from '@/lib/api/client';
import { formatISK, formatDate } from '@/lib/utils/format';
import type { WalletJournalEntry } from '@/types';
import Link from 'next/link';

const TRANSACTION_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'corporation_account_withdrawal', label: 'Corp Withdrawals' },
  { value: 'player_donation', label: 'Player Donations' },
  { value: 'bounty_prizes', label: 'Bounty Prizes' },
  { value: 'contract_price_payment_corp', label: 'Contract Payments' },
  { value: 'contract_sales_tax', label: 'Contract Tax' },
];

export default function WalletPage() {
  const { hasRole } = useAuth();
  const [currentDivision, setCurrentDivision] = useState(4);
  const [refTypeFilter, setRefTypeFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [journal, setJournal] = useState<WalletJournalEntry[]>([]);
  const [pagination, setPagination] = useState<{
    page: number;
    limit: number;
    total_entries: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canAccessAllDivisions = hasRole(['admin', 'Council', 'Accountant']);

  useEffect(() => {
    document.title = 'Wallet - Bombers Bar';
  }, []);

  const loadJournal = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '100',
        division: currentDivision.toString(),
      });

      if (refTypeFilter) {
        params.append('ref_type', refTypeFilter);
      }

      const response = await apiClient.get<{
        success: boolean;
        journal: WalletJournalEntry[];
        count: number;
        pagination: {
          page: number;
          limit: number;
          total_entries: number;
          total_pages: number;
          has_next: boolean;
          has_prev: boolean;
        };
      }>(`/api/admin/wallet?${params}`);
      setJournal(response.journal);
      setPagination(response.pagination);
    } catch (err: any) {
      setError(err.message || 'Failed to load wallet history');
    } finally {
      setLoading(false);
    }
  }, [currentDivision, refTypeFilter, currentPage]);

  useEffect(() => {
    loadJournal();
  }, [loadJournal]);

  const switchDivision = (division: number) => {
    if (division !== 4 && !canAccessAllDivisions) {
      return;
    }
    setCurrentDivision(division);
    setCurrentPage(1);
  };

  const handleFilterChange = (value: string) => {
    setRefTypeFilter(value);
    setCurrentPage(1);
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return (
      <div className="flex flex-col text-xs">
        <span>{formatDate(date, 'MMM d, yyyy')}</span>
        <span className="text-foreground-muted">{formatDate(date, 'HH:mm:ss')}</span>
      </div>
    );
  };

  return (
    <RequireAuth requireFCRole>
      <PageContainer>
        <PageHeader title="Wallet History" description="View corporation wallet journal entries" />

        {/* Division Tabs */}
        <div className="mb-6 flex gap-2 flex-wrap">
          {[1, 2, 3, 4, 5, 6, 7].map((division) => {
            const isLocked = division !== 4 && !canAccessAllDivisions;
            const isActive = division === currentDivision;

            return (
              <Button
                key={division}
                variant={isActive ? 'primary' : 'secondary'}
                onClick={() => switchDivision(division)}
                disabled={isLocked}
                title={
                  isLocked
                    ? 'Accountant, Council, or Admin access required'
                    : `Division ${division}`
                }
              >
                Division {division}
              </Button>
            );
          })}
        </div>

        {/* Filters */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <label htmlFor="ref-type-filter" className="text-sm font-medium text-foreground">
              Type:
            </label>
            <select
              id="ref-type-filter"
              value={refTypeFilter}
              onChange={(e) => handleFilterChange(e.target.value)}
              className="rounded-md border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {TRANSACTION_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {pagination && (
            <span className="text-sm text-foreground-muted">
              Total Entries: <strong>{pagination.total_entries}</strong>
            </span>
          )}
        </div>

        {/* Table */}
        <Card variant="bordered" padding="none">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <div className="text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
                <p className="mt-4 text-foreground-muted">Loading wallet history...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center p-12">
              <p className="text-error mb-4">{error}</p>
              <Button onClick={loadJournal}>Retry</Button>
            </div>
          ) : journal.length === 0 ? (
            <div className="flex items-center justify-center p-12">
              <p className="text-foreground-muted">No wallet entries found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {journal.map((entry) => {
                    const isCredit = entry.amount > 0;
                    const refTypeLabel = entry.ref_type.replace(/_/g, ' ').toUpperCase();

                    return (
                      <TableRow key={entry.id}>
                        <TableCell className="whitespace-nowrap">
                          {formatDateTime(entry.date)}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-foreground">{refTypeLabel}</span>
                        </TableCell>
                        <TableCell
                          className={`text-right ${isCredit ? 'text-success' : 'text-error'}`}
                        >
                          <span className="text-sm font-medium">
                            {isCredit ? '+' : ''}
                            {formatISK(Math.abs(entry.amount), 2)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="text-sm font-medium text-foreground">
                            {formatISK(entry.balance, 2)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-foreground">
                            {entry.first_party_name || `ID ${entry.first_party_id || 'N/A'}`}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-foreground">
                            {entry.second_party_name || `ID ${entry.second_party_id || 'N/A'}`}
                          </span>
                        </TableCell>
                        <TableCell>
                          {entry.reason && /^\d+$/.test(entry.reason) ? (
                            <Link
                              href={`/srp?id=${entry.reason}`}
                              className="text-sm text-primary hover:text-primary-hover"
                            >
                              {entry.reason}
                            </Link>
                          ) : (
                            <span className="text-sm text-foreground">{entry.reason || '-'}</span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          <span className="text-sm text-foreground">
                            {entry.description || '-'}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>

        {/* Pagination */}
        {pagination && pagination.total_pages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-2">
            <Button
              variant="secondary"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={!pagination.has_prev}
            >
              Previous
            </Button>
            <span className="px-4 py-2 text-foreground">
              Page {pagination.page} of {pagination.total_pages}
            </span>
            <Button
              variant="secondary"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={!pagination.has_next}
            >
              Next
            </Button>
          </div>
        )}
      </PageContainer>
    </RequireAuth>
  );
}
