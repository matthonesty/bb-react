'use client';

import { Modal, ModalFooter } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { CopyButton, CopyableField } from '@/components/ui/CopyButton';
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
import { ExternalLink, User, MapPin, Ship, Calendar } from 'lucide-react';

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
            <Badge
              srpStatus={request.status}
              size="lg"
              isAutoRejection={request.is_auto_rejection}
            />
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
            {request.status === 'approved' && (
              <div className="mt-2 text-sm text-foreground-muted">
                Approved requests are automatically paid when payment is reconciled
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-foreground">
              {request.status === 'denied' ? '—' : formatISK(request.final_payout_amount, 0)}
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

        {/* Copyable SRP Details - Only for pending, approved, and paid */}
        {['pending', 'approved', 'paid'].includes(request.status) && (
          <div className="rounded-lg bg-background-secondary p-4">
            <div className="text-sm font-medium text-foreground-muted mb-3">
              SRP Details (Copyable)
            </div>
            <div className="space-y-2 text-sm">
              <CopyableField label="Character Name" value={request.character_name} />
              {request.killmail_id && (
                <CopyableField label="Killmail ID" value={request.killmail_id} />
              )}
              <CopyableField
                label="Payment Amount"
                value={formatISK(request.final_payout_amount, 0)}
                copyValue={request.final_payout_amount.toString()}
              />
            </div>
          </div>
        )}

        {/* Ship, Location, and Killmail Link */}
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
            {request.killmail_id && (
              <div className="mt-3">
                <a
                  href={getZkillboardUrl(request.killmail_id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-sm text-primary hover:text-primary-hover"
                >
                  <ExternalLink size={14} className="mr-1" />
                  View on zKillboard
                </a>
              </div>
            )}
          </div>

          <div className="rounded-lg bg-background-secondary p-4">
            <div className="flex items-center gap-2 mb-2">
              <MapPin size={18} className="text-foreground-muted" />
              <div className="text-sm font-medium text-foreground-muted">Location</div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-lg font-medium text-foreground">
                {!request.solar_system_name && !request.killmail_id
                  ? 'Not Applicable'
                  : request.solar_system_name || 'Unknown'}
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

        {/* Timeline */}
        <div className="rounded-lg bg-background-secondary p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar size={18} className="text-foreground-muted" />
            <div className="text-sm font-medium text-foreground-muted">Timeline</div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-foreground-muted">Loss:</span>
              <span className="text-foreground">{formatDate(request.killmail_time)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-foreground-muted">Submitted:</span>
              <span className="text-foreground">{formatDate(request.submitted_at)}</span>
            </div>
            {request.processed_at && (
              <div className="flex justify-between">
                <span className="text-foreground-muted">Processed:</span>
                <span className="text-foreground">{formatDate(request.processed_at)}</span>
              </div>
            )}
            {request.paid_at && (
              <div className="flex justify-between">
                <span className="text-foreground-muted">Paid:</span>
                <span className="text-foreground">{formatDate(request.paid_at)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Fleet Info */}
        {request.fleet_description && (
          <div className="rounded-lg bg-background-secondary p-4">
            <div className="text-sm font-medium text-foreground-muted mb-2">Fleet Description</div>
            <div className="text-foreground">{request.fleet_description}</div>
          </div>
        )}

        {/* FC Name */}
        {request.fc_name && (
          <div className="rounded-lg bg-background-secondary p-4">
            <div className="text-sm font-medium text-foreground-muted mb-2">Fleet Commander</div>
            <div className="text-foreground">{request.fc_name}</div>
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
        <div className="flex gap-2 ml-auto items-center">
          {isAdmin && <SRPActionButtons request={request} onUpdate={onUpdate} onClose={onClose} />}
          <Button variant="secondary" onClick={onClose} className="min-w-[100px]">
            Close
          </Button>
        </div>
      </ModalFooter>
    </Modal>
  );
}
