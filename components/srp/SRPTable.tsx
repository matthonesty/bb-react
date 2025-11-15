'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { srpApi } from '@/lib/api/srp';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SRPDetailModal } from './SRPDetailModal';
import { Pagination } from '@/components/ui/Pagination';
import { formatISK, formatDate, formatRelativeTime } from '@/lib/utils/format';
import type { SRPStatus, SRPRequest } from '@/types';
import { ExternalLink, ChevronUp, ChevronDown } from 'lucide-react';
import { DEFAULT_PAGE_SIZE } from '@/lib/constants';

interface SRPTableProps {
  statusFilter: SRPStatus | 'all';
  searchQuery: string;
  currentPage: number;
  onPageChange: (page: number) => void;
  isAdmin: boolean;
}

// Sort icon component - defined outside to avoid recreation on every render
function SortIcon({
  column,
  sortBy,
  sortDirection,
}: {
  column: string;
  sortBy: string;
  sortDirection: 'asc' | 'desc';
}) {
  if (sortBy !== column) return null;
  return sortDirection === 'asc' ? (
    <ChevronUp size={14} className="inline ml-1" />
  ) : (
    <ChevronDown size={14} className="inline ml-1" />
  );
}

/**
 * SRP Table component with sorting, pagination, and admin actions
 */
export function SRPTable({
  statusFilter,
  searchQuery,
  currentPage,
  onPageChange,
  isAdmin,
}: SRPTableProps) {
  const [sortBy, setSortBy] = useState<string>('submitted_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedRequest, setSelectedRequest] = useState<SRPRequest | null>(null);

  // Fetch SRP requests
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['srp', 'list', statusFilter, searchQuery, currentPage, sortBy, sortDirection],
    queryFn: () =>
      srpApi.list({
        status: statusFilter,
        search: searchQuery,
        page: currentPage,
        pageSize: DEFAULT_PAGE_SIZE,
        sortBy,
        sortDirection,
      }),
  });

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDirection('desc');
    }
  };

  if (isLoading) {
    return (
      <div className="p-12 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
        <p className="mt-4 text-foreground-muted">Loading SRP requests...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-12 text-center">
        <p className="text-error">Error loading SRP requests</p>
        <Button onClick={() => refetch()} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  if (!data || data.data.length === 0) {
    return (
      <div className="p-12 text-center">
        <p className="text-foreground-muted">No SRP requests found</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead sortable onClick={() => handleSort('submitted_at')}>
                Submitted <SortIcon column="submitted_at" sortBy={sortBy} sortDirection={sortDirection} />
              </TableHead>
              <TableHead sortable onClick={() => handleSort('character_name')}>
                Character <SortIcon column="character_name" sortBy={sortBy} sortDirection={sortDirection} />
              </TableHead>
              <TableHead sortable onClick={() => handleSort('ship_name')}>
                Ship <SortIcon column="ship_name" sortBy={sortBy} sortDirection={sortDirection} />
              </TableHead>
              <TableHead sortable onClick={() => handleSort('solar_system_name')}>
                Location <SortIcon column="solar_system_name" sortBy={sortBy} sortDirection={sortDirection} />
              </TableHead>
              <TableHead sortable onClick={() => handleSort('payout_amount')}>
                Payout <SortIcon column="payout_amount" sortBy={sortBy} sortDirection={sortDirection} />
              </TableHead>
              <TableHead sortable onClick={() => handleSort('status')}>
                Status <SortIcon column="status" sortBy={sortBy} sortDirection={sortDirection} />
              </TableHead>
              <TableHead>Killmail</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.data.map((request) => (
              <TableRow key={request.id} clickable onClick={() => setSelectedRequest(request)}>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="text-sm text-foreground">
                      {formatDate(request.submitted_at, 'MMM d')}
                    </span>
                    <span className="text-xs text-foreground-muted">
                      {formatRelativeTime(request.submitted_at)}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-foreground">
                      {request.character_name}
                    </span>
                    <span className="text-xs text-foreground-muted">
                      {request.alliance_name || request.corporation_name}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="text-sm text-foreground">
                      {request.ship_name === 'Unknown Ship' && !request.killmail_id
                        ? 'Multiple Killmails'
                        : request.ship_name}
                    </span>
                    {request.is_polarized && (
                      <span className="text-xs text-warning">⚡ Polarized</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-foreground">
                    {!request.solar_system_name && !request.killmail_id
                      ? '—'
                      : request.solar_system_name}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-foreground">
                      {request.status === 'denied'
                        ? '—'
                        : formatISK(request.final_payout_amount, 0)}
                    </span>
                    {request.payout_adjusted && request.status !== 'denied' && (
                      <span className="text-xs text-foreground-muted line-through">
                        {formatISK(request.base_payout_amount, 0)}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge srpStatus={request.status} isAutoRejection={request.is_auto_rejection} />
                </TableCell>
                <TableCell>
                  {request.killmail_id ? (
                    <a
                      href={`https://zkillboard.com/kill/${request.killmail_id}/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center text-primary hover:text-primary-hover"
                    >
                      <ExternalLink size={16} />
                    </a>
                  ) : (
                    <span className="text-xs text-foreground-muted">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="border-t border-border p-4">
        <Pagination
          currentPage={currentPage}
          totalPages={data.pagination.totalPages}
          totalItems={data.pagination.total}
          pageSize={DEFAULT_PAGE_SIZE}
          onPageChange={onPageChange}
        />
      </div>

      {/* Detail Modal */}
      {selectedRequest && (
        <SRPDetailModal
          request={selectedRequest}
          isOpen={!!selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onUpdate={refetch}
          isAdmin={isAdmin}
        />
      )}
    </>
  );
}
