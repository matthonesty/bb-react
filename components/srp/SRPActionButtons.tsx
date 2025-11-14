'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { srpApi } from '@/lib/api/srp';
import { Button } from '@/components/ui/Button';
import { Check, X } from 'lucide-react';
import { RejectModal } from './RejectModal';
import type { SRPRequest } from '@/types';

interface SRPActionButtonsProps {
  request: SRPRequest;
  onUpdate: () => void;
  onClose?: () => void;
}

/**
 * Admin action buttons for SRP requests (Approve, Reject)
 */
export function SRPActionButtons({ request, onUpdate, onClose }: SRPActionButtonsProps) {
  const [showRejectModal, setShowRejectModal] = useState(false);

  const approveMutation = useMutation({
    mutationFn: (payoutAmount?: number) => srpApi.approve(request.id, payoutAmount),
    onSuccess: () => {
      onUpdate();
      onClose?.();
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (reason: string) => srpApi.reject(request.id, reason),
    onSuccess: () => {
      onUpdate();
      setShowRejectModal(false);
      onClose?.();
    },
  });

  const handleReject = (reason: string) => {
    rejectMutation.mutate(reason);
  };

  // Show different actions based on status
  if (request.status === 'pending') {
    return (
      <>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => approveMutation.mutate(undefined)}
            isLoading={approveMutation.isPending}
            disabled={rejectMutation.isPending}
            className="min-w-[100px]"
          >
            <Check size={16} className="mr-1" />
            Approve
          </Button>
          <Button
            variant="danger"
            onClick={() => setShowRejectModal(true)}
            isLoading={rejectMutation.isPending}
            disabled={approveMutation.isPending}
            className="min-w-[100px]"
          >
            <X size={16} className="mr-1" />
            Reject
          </Button>
        </div>

        <RejectModal
          isOpen={showRejectModal}
          onClose={() => setShowRejectModal(false)}
          onConfirm={handleReject}
          isLoading={rejectMutation.isPending}
          characterName={request.character_name}
          shipName={request.ship_name}
        />
      </>
    );
  }

  return null;
}
