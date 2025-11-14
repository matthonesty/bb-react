'use client';

import { Modal, ModalFooter } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { SRPActionButtons } from './SRPActionButtons';
import { ProximityDataDisplay } from './ProximityDataDisplay';
import {
  formatISK,
  formatDate,
  getZkillboardUrl,
  getEveWhoUrl,
  getDotlanUrl,
} from '@/lib/utils/format';
import type { SRPRequest } from '@/types';
import { ExternalLink, User, MapPin, Ship, Calendar, DollarSign } from 'lucide-react';

interface SRPDetailModalProps {
  request: SRPRequest;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
  isAdmin: boolean;
}

/**
 * SRP Detail Modal showing full killmail information
 */
export function SRPDetailModal({
  request,
  isOpen,
  onClose,
  onUpdate,
  isAdmin,
}: SRPDetailModalProps) {
  // Extract unique FCs from proximity data
  const getFCsPresent = () => {
    if (!request.proximity_data?.relatedKillmails) return [];

    const fcSet = new Set<string>();
    request.proximity_data.relatedKillmails.forEach((km: any) => {
      if (km.fleet_commanders) {
        km.fleet_commanders
          .filter((fc: any) => fc.status === 'Active')
          .forEach((fc: any) => fcSet.add(fc.main_character_name));
      }
    });

    return Array.from(fcSet);
  };

  const fcsPresent = getFCsPresent();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="SRP Request Details" size="lg">
      <div className="space-y-6">
        {/* Status and Basic Info */}
        <div className="flex items-start justify-between">
          <div>
            <Badge srpStatus={request.status} size="lg" isAutoRejection={request.is_auto_rejection} />
            {request.is_polarized && (
              <Badge variant="warning" className="ml-2">
                ⚡ Polarized
              </Badge>
            )}
            {fcsPresent.length > 0 && (
              <div className="mt-2 text-sm text-success">
                FC{fcsPresent.length > 1 ? 's' : ''} Present: {fcsPresent.join(', ')}
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-foreground">
              {request.status === 'denied'
                ? '—'
                : formatISK(request.final_payout_amount, 0)}
            </div>
            <div className="text-sm text-foreground-muted">Payout Amount</div>
          </div>
        </div>

        {/* Character Info */}
        <div className="rounded-lg bg-background-secondary p-4 space-y-3">
          <div className="flex items-center gap-2">
            <User size={18} className="text-foreground-muted" />
            <div className="flex-1">
              <div className="font-medium text-foreground">{request.character_name}</div>
              <div className="text-sm text-foreground-muted">
                {request.alliance_name || request.corporation_name}
              </div>
            </div>
            <a
              href={getEveWhoUrl(request.character_id)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-primary-hover"
            >
              <ExternalLink size={16} />
            </a>
          </div>
        </div>

        {/* Ship and Location */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg bg-background-secondary p-4">
            <div className="flex items-center gap-2 mb-2">
              <Ship size={18} className="text-foreground-muted" />
              <div className="text-sm font-medium text-foreground-muted">Ship</div>
            </div>
            <div className="text-lg font-medium text-foreground">
              {request.ship_name === 'Unknown Ship' && !request.killmail_id
                ? 'Multiple Killmails'
                : request.ship_name}
            </div>
          </div>

          <div className="rounded-lg bg-background-secondary p-4">
            <div className="flex items-center gap-2 mb-2">
              <MapPin size={18} className="text-foreground-muted" />
              <div className="text-sm font-medium text-foreground-muted">Location</div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-medium text-foreground">
                  {!request.solar_system_name && !request.killmail_id
                    ? 'Not Applicable'
                    : request.solar_system_name || 'Unknown'}
                </div>
              </div>
              {request.solar_system_name && (
                <a
                  href={getDotlanUrl(request.solar_system_name)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary-hover"
                >
                  <ExternalLink size={16} />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Dates and Financial Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg bg-background-secondary p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar size={18} className="text-foreground-muted" />
              <div className="text-sm font-medium text-foreground-muted">Timeline</div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-foreground-muted">Loss:</span>
                <span className="text-foreground">
                  {formatDate(request.killmail_time)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-foreground-muted">Submitted:</span>
                <span className="text-foreground">
                  {formatDate(request.submitted_at)}
                </span>
              </div>
              {request.processed_at && (
                <div className="flex justify-between">
                  <span className="text-foreground-muted">Processed:</span>
                  <span className="text-foreground">
                    {formatDate(request.processed_at)}
                  </span>
                </div>
              )}
              {request.paid_at && (
                <div className="flex justify-between">
                  <span className="text-foreground-muted">Paid:</span>
                  <span className="text-foreground">
                    {formatDate(request.paid_at)}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-lg bg-background-secondary p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign size={18} className="text-foreground-muted" />
              <div className="text-sm font-medium text-foreground-muted">Pricing</div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-foreground-muted">Base Price:</span>
                <span className="text-foreground">
                  {request.status === 'denied' ? '—' : formatISK(request.base_payout_amount, 0)}
                </span>
              </div>
              {request.payout_adjusted && request.status !== 'denied' && (
                <div className="flex justify-between font-medium">
                  <span className="text-foreground">Adjusted Payout:</span>
                  <span className="text-success">
                    {formatISK(request.final_payout_amount, 0)}
                  </span>
                </div>
              )}
              {request.payment_amount && (
                <div className="flex justify-between font-medium">
                  <span className="text-foreground">Payment Amount:</span>
                  <span className="text-success">
                    {formatISK(request.payment_amount, 0)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Fleet Info */}
        {request.fleet_description && (
          <div className="rounded-lg bg-background-secondary p-4">
            <div className="text-sm font-medium text-foreground-muted mb-2">Fleet</div>
            <div className="text-foreground">{request.fleet_description}</div>
          </div>
        )}

        {/* Notes - Hide if just auto-rejection marker */}
        {request.admin_notes && request.admin_notes !== '[AUTO-REJECTION]' && (
          <div className="rounded-lg bg-background-secondary p-4">
            <div className="text-sm font-medium text-foreground-muted mb-2">Admin Notes</div>
            <div className="text-foreground whitespace-pre-wrap">{request.admin_notes}</div>
          </div>
        )}

        {/* Proximity Data - Show for pending and paid requests */}
        {(request.status === 'pending' || request.status === 'paid') && request.proximity_data && (
          <ProximityDataDisplay proximityData={request.proximity_data} />
        )}

        {/* Rejection Reason */}
        {request.denial_reason && (
          <div className="rounded-lg bg-error/10 border border-error/20 p-4">
            <div className="text-sm font-medium text-error mb-2">Rejection Reason</div>
            <div className="text-foreground">{request.denial_reason}</div>
          </div>
        )}

        {/* Processor Info */}
        {request.processed_by_character_name && (
          <div className="text-sm text-foreground-muted">
            Processed by {request.processed_by_character_name}
          </div>
        )}
      </div>

      {/* Footer */}
      <ModalFooter>
        <div className="flex items-center justify-between w-full">
          {request.killmail_id && (
            <a
              href={getZkillboardUrl(request.killmail_id)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-primary hover:text-primary-hover"
            >
              <ExternalLink size={16} className="mr-2" />
              View on zKillboard
            </a>
          )}

          <div className="flex gap-2 ml-auto">
            {isAdmin && (
              <SRPActionButtons request={request} onUpdate={onUpdate} />
            )}
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </ModalFooter>
    </Modal>
  );
}
