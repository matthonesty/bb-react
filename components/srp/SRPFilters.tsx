'use client';

import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { SRP_STATUSES } from '@/lib/constants';
import type { SRPStatus } from '@/types';
import { Search, X } from 'lucide-react';

interface SRPFiltersProps {
  statusFilter: SRPStatus | 'all';
  onStatusFilterChange: (status: SRPStatus | 'all') => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
}

/**
 * SRP Filters component for status and search filtering
 */
export function SRPFilters({
  statusFilter,
  onStatusFilterChange,
  searchQuery,
  onSearchQueryChange,
}: SRPFiltersProps) {
  return (
    <div className="flex-1 space-y-4">
      {/* Search */}
      <div className="relative max-w-md">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted"
          size={18}
        />
        <Input
          type="text"
          placeholder="Search by character, ship, or system..."
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          className="pl-10 pr-10"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchQueryChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground transition-colors"
            aria-label="Clear search"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Status Filter Badges */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onStatusFilterChange('all')}
          className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
            statusFilter === 'all'
              ? 'bg-primary text-white'
              : 'bg-background-secondary text-foreground hover:bg-background-tertiary'
          }`}
        >
          All
        </button>

        {SRP_STATUSES.filter((s) => s.value !== 'all').map((status) => (
          <button
            key={status.value}
            onClick={() => onStatusFilterChange(status.value as SRPStatus)}
            className="transition-opacity hover:opacity-80"
          >
            <Badge
              srpStatus={status.value as SRPStatus}
              className={
                statusFilter === status.value
                  ? 'ring-2 ring-primary ring-offset-2 ring-offset-background'
                  : ''
              }
            />
          </button>
        ))}
      </div>
    </div>
  );
}
