'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { apiClient } from '@/lib/api/client';
import type { SRPRequest } from '@/types';
import { SRPActionButtons } from './SRPActionButtons';

interface SRPDetailViewProps {
  srpId: string;
  isAdmin: boolean;
  onUpdate?: () => void;
}

export function SRPDetailView({ srpId, isAdmin, onUpdate }: SRPDetailViewProps) {
  const [request, setRequest] = useState<SRPRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRequest();
  }, [srpId]);

  const loadRequest = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.get<{
        success: boolean;
        request: SRPRequest;
      }>(`/api/admin/srp/${srpId}`);
      setRequest(response.request);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load SRP request');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = () => {
    loadRequest();
    onUpdate?.();
  };

  const formatISK = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount) + ' ISK';
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-warning';
      case 'approved':
        return 'text-info';
      case 'denied':
        return 'text-error';
      case 'paid':
        return 'text-success';
      default:
        return 'text-foreground-muted';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-4 text-foreground-muted">Loading SRP request...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <div className="mb-4">
          <Link href="/srp" className="inline-flex items-center text-primary hover:underline">
            ← Back to All Requests
          </Link>
        </div>
        <Card variant="bordered">
          <div className="text-center py-8">
            <p className="text-error mb-4">{error}</p>
            <Link href="/srp" className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90">
              View All Requests
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  if (!request) {
    return null;
  }

  const killmailUrl = request.killmail_id
    ? `https://zkillboard.com/kill/${request.killmail_id}/`
    : '#';

  return (
    <div>
      <div className="mb-4">
        <Link href="/srp" className="inline-flex items-center text-primary hover:underline">
          ← Back to All Requests
        </Link>
      </div>

      <Card
        variant="bordered"
        className="border-2 border-purple-500/30 bg-purple-500/10"
      >
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h2 className="text-2xl font-bold text-purple-400 mb-4">
              SRP Request #{request.id}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-foreground-muted">Character:</span>{' '}
                <span className="text-foreground font-medium">{request.character_name}</span>
              </div>
              <div>
                <span className="text-foreground-muted">Corporation:</span>{' '}
                <span className="text-foreground font-medium">{request.corporation_name || 'N/A'}</span>
              </div>
              <div>
                <span className="text-foreground-muted">Ship:</span>{' '}
                <span className="text-foreground font-medium">
                  {request.ship_name}
                  {request.is_polarized && <span className="text-warning ml-2">(Polarized)</span>}
                </span>
              </div>
              <div>
                <span className="text-foreground-muted">System:</span>{' '}
                <span className="text-foreground font-medium">{request.solar_system_name || 'N/A'}</span>
              </div>
              <div>
                <span className="text-foreground-muted">FC:</span>{' '}
                <span className="text-foreground font-medium">{request.fc_name || 'N/A'}</span>
              </div>
              <div>
                <span className="text-foreground-muted">Loss Time:</span>{' '}
                <span className="text-foreground font-medium">
                  {request.killmail_time ? formatDateTime(request.killmail_time) : 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-foreground-muted">Submitted:</span>{' '}
                <span className="text-foreground font-medium">{formatDateTime(request.submitted_at)}</span>
              </div>
              <div>
                <span className="text-foreground-muted">Status:</span>{' '}
                <span className={`font-semibold uppercase ${getStatusColor(request.status)}`}>
                  {request.status}
                </span>
              </div>
            </div>
          </div>

          {/* Killmail Link */}
          {request.killmail_id && (
            <div>
              <a
                href={killmailUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 rounded-md bg-background-secondary text-foreground hover:bg-background-tertiary"
              >
                View Killmail on zKillboard →
              </a>
            </div>
          )}

          {/* Payout Information */}
          <div className="border-t border-border pt-6">
            <h3 className="text-lg font-semibold text-foreground mb-3">Payout Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-foreground-muted">Base Payout:</span>{' '}
                <span className="text-foreground font-mono">{formatISK(request.base_payout_amount)}</span>
              </div>
              <div>
                <span className="text-foreground-muted">Final Payout:</span>{' '}
                <span className="text-success font-mono font-semibold">{formatISK(request.final_payout_amount)}</span>
              </div>
              {request.hunter_donations > 0 && (
                <div>
                  <span className="text-foreground-muted">Hunter Donations:</span>{' '}
                  <span className="text-foreground font-mono">{formatISK(request.hunter_donations)}</span>
                </div>
              )}
              {request.payout_adjusted && (
                <div className="md:col-span-2">
                  <span className="text-foreground-muted">Adjustment Reason:</span>{' '}
                  <span className="text-foreground">{request.adjustment_reason || 'N/A'}</span>
                </div>
              )}
            </div>
          </div>

          {/* Fleet Description */}
          {request.fleet_description && (
            <div className="border-t border-border pt-6">
              <h3 className="text-lg font-semibold text-foreground mb-3">Fleet Description</h3>
              <p className="text-foreground whitespace-pre-wrap">{request.fleet_description}</p>
            </div>
          )}

          {/* Processing Information */}
          {(request.processed_at || request.paid_at || request.denial_reason) && (
            <div className="border-t border-border pt-6">
              <h3 className="text-lg font-semibold text-foreground mb-3">Processing Information</h3>
              <div className="space-y-2 text-sm">
                {request.processed_by_character_name && (
                  <div>
                    <span className="text-foreground-muted">Processed By:</span>{' '}
                    <span className="text-foreground">{request.processed_by_character_name}</span>
                  </div>
                )}
                {request.processed_at && (
                  <div>
                    <span className="text-foreground-muted">Processed At:</span>{' '}
                    <span className="text-foreground">{formatDateTime(request.processed_at)}</span>
                  </div>
                )}
                {request.paid_at && (
                  <div>
                    <span className="text-foreground-muted">Paid At:</span>{' '}
                    <span className="text-foreground">{formatDateTime(request.paid_at)}</span>
                  </div>
                )}
                {request.payment_amount && (
                  <div>
                    <span className="text-foreground-muted">Payment Amount:</span>{' '}
                    <span className="text-foreground font-mono">{formatISK(request.payment_amount)}</span>
                  </div>
                )}
                {request.denial_reason && (
                  <div>
                    <span className="text-foreground-muted">Denial Reason:</span>{' '}
                    <span className="text-error">{request.denial_reason}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Admin Notes */}
          {request.admin_notes && (
            <div className="border-t border-border pt-6">
              <h3 className="text-lg font-semibold text-foreground mb-3">Admin Notes</h3>
              <p className="text-foreground whitespace-pre-wrap">{request.admin_notes}</p>
            </div>
          )}

          {/* Validation Warnings */}
          {request.validation_warnings && request.validation_warnings.length > 0 && (
            <div className="border-t border-border pt-6">
              <h3 className="text-lg font-semibold text-warning mb-3">Validation Warnings</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-warning">
                {request.validation_warnings.map((warning, idx) => (
                  <li key={idx}>{warning}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Action Buttons */}
          {isAdmin && (
            <div className="border-t border-border pt-6">
              <SRPActionButtons
                request={request}
                onUpdate={handleAction}
              />
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
