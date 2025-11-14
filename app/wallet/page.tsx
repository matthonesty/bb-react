'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { Card } from '@/components/ui/Card';
import { apiClient } from '@/lib/api/client';
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
  const { user, hasRole } = useAuth();
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

  useEffect(() => {
    loadJournal();
  }, [currentDivision, refTypeFilter, currentPage]);

  const loadJournal = async () => {
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
  };

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

  const formatISK = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount) + ' ISK';
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return (
      <div className="flex flex-col text-xs">
        <span>{date.toLocaleDateString()}</span>
        <span className="text-foreground-muted">{date.toLocaleTimeString()}</span>
      </div>
    );
  };

  return (
    <RequireAuth requireFCRole>
      <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Wallet History</h1>
          <p className="text-foreground-muted">
            View corporation wallet journal entries
          </p>
        </div>

        {/* Division Tabs */}
        <div className="mb-6 flex gap-2 flex-wrap">
          {[1, 2, 3, 4, 5, 6, 7].map((division) => {
            const isLocked = division !== 4 && !canAccessAllDivisions;
            const isActive = division === currentDivision;

            return (
              <button
                key={division}
                onClick={() => switchDivision(division)}
                disabled={isLocked}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : isLocked
                    ? 'bg-background-secondary text-foreground-muted cursor-not-allowed opacity-50'
                    : 'bg-background-secondary text-foreground hover:bg-background-tertiary'
                }`}
                title={isLocked ? 'Accountant, Council, or Admin access required' : `Division ${division}`}
              >
                Division {division}
              </button>
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
              <button
                onClick={loadJournal}
                className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Retry
              </button>
            </div>
          ) : journal.length === 0 ? (
            <div className="flex items-center justify-center p-12">
              <p className="text-foreground-muted">No wallet entries found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-background-secondary border-b border-border">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-foreground-muted uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-foreground-muted uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-foreground-muted uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-foreground-muted uppercase tracking-wider">
                      Balance
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-foreground-muted uppercase tracking-wider">
                      From
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-foreground-muted uppercase tracking-wider">
                      To
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-foreground-muted uppercase tracking-wider">
                      Reason
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-foreground-muted uppercase tracking-wider">
                      Description
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {journal.map((entry) => {
                    const isCredit = entry.amount > 0;
                    const refTypeLabel = entry.ref_type.replace(/_/g, ' ').toUpperCase();

                    return (
                      <tr key={entry.id} className="hover:bg-background-secondary">
                        <td className="px-4 py-3 whitespace-nowrap">
                          {formatDateTime(entry.date)}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-background-tertiary text-foreground">
                            {refTypeLabel}
                          </span>
                        </td>
                        <td className={`px-4 py-3 text-right font-mono ${isCredit ? 'text-success' : 'text-error'}`}>
                          {isCredit ? '+' : ''}{formatISK(Math.abs(entry.amount))}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-purple-400">
                          {formatISK(entry.balance)}
                        </td>
                        <td className="px-4 py-3">
                          {entry.first_party_name || `ID ${entry.first_party_id || 'N/A'}`}
                        </td>
                        <td className="px-4 py-3">
                          {entry.second_party_name || `ID ${entry.second_party_id || 'N/A'}`}
                        </td>
                        <td className="px-4 py-3">
                          {entry.reason && /^\d+$/.test(entry.reason) ? (
                            <Link href={`/srp?id=${entry.reason}`} className="text-primary hover:underline">
                              {entry.reason}
                            </Link>
                          ) : (
                            entry.reason || '-'
                          )}
                        </td>
                        <td className="px-4 py-3 max-w-xs truncate">
                          {entry.description || '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Pagination */}
        {pagination && pagination.total_pages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-2">
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={!pagination.has_prev}
              className="px-4 py-2 rounded-md bg-background-secondary text-foreground hover:bg-background-tertiary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-foreground">
              Page {pagination.page} of {pagination.total_pages}
            </span>
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={!pagination.has_next}
              className="px-4 py-2 rounded-md bg-background-secondary text-foreground hover:bg-background-tertiary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </RequireAuth>
  );
}
