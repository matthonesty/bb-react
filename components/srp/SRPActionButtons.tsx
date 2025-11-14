'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { srpApi } from '@/lib/api/srp';
import { Button } from '@/components/ui/Button';
import { Check, X, DollarSign } from 'lucide-react';
import type { SRPRequest } from '@/types';

interface SRPActionButtonsProps {
  request: SRPRequest;
  onUpdate: () => void;
}

/**
 * Admin action buttons for SRP requests (Approve, Reject, Pay)
 */
export function SRPActionButtons({ request, onUpdate }: SRPActionButtonsProps) {
  const [rejectReason, setRejectReason] = useState('');

  const approveMutation = useMutation({
    mutationFn: (payoutAmount?: number) => srpApi.approve(request.id, payoutAmount),
    onSuccess: () => {
      onUpdate();
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (reason: string) => srpApi.reject(request.id, reason),
    onSuccess: () => {
      onUpdate();
      setRejectReason('');
    },
  });

  const payMutation = useMutation({
    mutationFn: () => srpApi.markPaid(request.id, 'Contract'),
    onSuccess: () => {
      onUpdate();
    },
  });

  // Show different actions based on status
  if (request.status === 'pending') {
    return (
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => approveMutation.mutate(undefined)}
          isLoading={approveMutation.isPending}
          disabled={rejectMutation.isPending}
        >
          <Check size={14} className="mr-1" />
          Approve
        </Button>
        <Button
          size="sm"
          variant="danger"
          onClick={() => {
            const reason = prompt('Rejection reason:');
            if (reason) {
              rejectMutation.mutate(reason);
            }
          }}
          isLoading={rejectMutation.isPending}
          disabled={approveMutation.isPending}
        >
          <X size={14} className="mr-1" />
          Reject
        </Button>
      </div>
    );
  }

  if (request.status === 'approved') {
    return (
      <Button
        size="sm"
        variant="primary"
        onClick={() => payMutation.mutate()}
        isLoading={payMutation.isPending}
      >
        <DollarSign size={14} className="mr-1" />
        Mark Paid
      </Button>
    );
  }

  return null;
}
