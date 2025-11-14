'use client';

import { useState } from 'react';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { X } from 'lucide-react';

interface RejectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  isLoading?: boolean;
  characterName: string;
  shipName: string | null;
}

/**
 * Custom rejection modal for SRP requests
 */
export function RejectModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
  characterName,
  shipName,
}: RejectModalProps) {
  const [reason, setReason] = useState('');

  const handleSubmit = () => {
    if (reason.trim()) {
      onConfirm(reason.trim());
      setReason(''); // Reset for next use
    }
  };

  const handleClose = () => {
    setReason('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Reject SRP Request"
      size="md"
    >
      <div className="space-y-4">
        {/* Warning message */}
        <div className="rounded-lg bg-error/10 border border-error/20 p-4">
          <div className="flex items-start gap-3">
            <X size={20} className="text-error mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-medium text-error mb-1">
                You are about to reject this SRP request
              </div>
              <div className="text-sm text-foreground-muted">
                <strong>{characterName}</strong> - {shipName ?? 'Unknown Ship'}
              </div>
            </div>
          </div>
        </div>

        {/* Reason input */}
        <div>
          <label
            htmlFor="reject-reason"
            className="block text-sm font-medium text-foreground mb-2"
          >
            Rejection Reason <span className="text-error">*</span>
          </label>
          <textarea
            id="reject-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Enter the reason for rejecting this SRP request..."
            className="w-full h-32 px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
            autoFocus
            disabled={isLoading}
          />
          <div className="mt-1 text-xs text-foreground-muted">
            This reason will be visible to the pilot
          </div>
        </div>
      </div>

      <ModalFooter>
        <div className="flex gap-2 justify-end w-full">
          <Button
            variant="secondary"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleSubmit}
            isLoading={isLoading}
            disabled={!reason.trim() || isLoading}
            className="min-w-[100px]"
          >
            <X size={16} className="mr-1" />
            Reject Request
          </Button>
        </div>
      </ModalFooter>
    </Modal>
  );
}
