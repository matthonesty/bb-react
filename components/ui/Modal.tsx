'use client';

import { useEffect, useRef, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils/cn';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
}

/**
 * Modal component with portal rendering
 * Supports different sizes and close behaviors
 */
export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Handle escape key
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose, closeOnEscape]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-full mx-4',
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={handleOverlayClick}
    >
      <div
        ref={modalRef}
        className={cn(
          'relative w-full bg-card-bg border border-card-border rounded-lg shadow-xl my-auto',
          'max-h-[90vh] flex flex-col',
          sizes[size]
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between border-b border-border px-6 py-4 flex-shrink-0">
            {title && (
              <h2 id="modal-title" className="text-xl font-semibold text-foreground">
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="ml-auto rounded-md p-1 text-foreground-muted hover:bg-background-secondary hover:text-foreground transition-colors"
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            )}
          </div>
        )}

        {/* Content - Scrollable */}
        <div className="px-6 py-4 overflow-y-auto flex-1 min-h-0">{children}</div>
      </div>
    </div>
  );

  // Render in portal
  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
}

/**
 * Modal Footer component for action buttons
 * Sticky footer that stays visible at the bottom when content scrolls
 */
export function ModalFooter({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'sticky bottom-0 flex items-center justify-end gap-3',
        'border-t border-border px-6 py-4 -mx-6 -mb-4 mt-4',
        'bg-card-bg',
        className
      )}
    >
      {children}
    </div>
  );
}
