'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { formatDate } from '@/lib/utils/format';

interface ProximityDataProps {
  proximityData: any;
}

/**
 * Displays related killmails to help verify pilot was on fleet
 */
export function ProximityDataDisplay({ proximityData }: ProximityDataProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!proximityData) return null;

  const { relatedKillmails } = proximityData;

  if (!relatedKillmails || relatedKillmails.length === 0) return null;

  return (
    <div className="rounded-lg bg-background-secondary p-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full text-sm font-medium text-foreground hover:text-primary transition-colors"
      >
        <span>Related Killmails ({relatedKillmails.length})</span>
        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {isExpanded && (
        <ul className="mt-3 space-y-2 max-h-64 overflow-y-auto">
          {relatedKillmails.map((km: any, idx: number) => (
            <li key={idx} className="text-sm">
              <a
                href={`https://zkillboard.com/kill/${km.killmail_id}/`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:text-primary-hover"
              >
                Link
                <ExternalLink size={12} />
              </a>
              <span className="text-foreground-muted ml-2">
                ({km.victim_ship_name || 'Unknown Ship'} / {km.solar_system_name} / {formatDate(km.killmail_time, 'MMM d, HH:mm')})
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
