import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils/cn';
import type { SRPStatus, FCRank } from '@/types';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  srpStatus?: SRPStatus;
  fcRank?: FCRank;
  isAutoRejection?: boolean;
}

/**
 * Badge component for status indicators and labels
 * Supports SRP status and FC rank auto-styling
 */
export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      children,
      className,
      variant = 'default',
      size = 'md',
      srpStatus,
      fcRank,
      isAutoRejection = false,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center rounded-md font-medium border whitespace-nowrap';

    // Auto-detect variant from srpStatus or fcRank
    let autoVariant: Exclude<BadgeProps['variant'], undefined> = variant || 'default';

    // Map status to display label (denied -> Rejected for UI)
    let displayContent = children;

    if (srpStatus) {
      const statusVariants: Record<SRPStatus, Exclude<BadgeProps['variant'], undefined>> = {
        pending: 'warning',
        approved: 'success',
        denied: 'error',
        paid: 'info',
        cancelled: 'secondary',
      };
      autoVariant = statusVariants[srpStatus];

      // Map database status to display label
      const statusLabels: Record<SRPStatus, string> = {
        pending: 'Pending',
        approved: 'Approved',
        denied: 'Rejected', // Display as "Rejected" instead of "Denied"
        paid: 'Paid',
        cancelled: 'Cancelled',
      };
      displayContent = statusLabels[srpStatus];

      // Prepend emoji for auto-rejections
      if (isAutoRejection && srpStatus === 'denied') {
        displayContent = `🤖 ${displayContent}`;
      }
    } else if (fcRank) {
      const rankVariants: Record<FCRank, Exclude<BadgeProps['variant'], undefined>> = {
        SFC: 'info',
        JFC: 'warning',
        FC: 'success',
        Support: 'secondary',
      };
      autoVariant = rankVariants[fcRank];
      displayContent = fcRank;
    }

    const variants = {
      default: 'bg-background-tertiary text-foreground border-border',
      success: 'bg-green-100 text-green-800 border-green-300',
      warning: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      error: 'bg-red-100 text-red-800 border-red-300',
      info: 'bg-blue-100 text-blue-800 border-blue-300',
      secondary: 'bg-gray-100 text-gray-800 border-gray-300',
    };

    const sizes = {
      sm: 'text-xs px-2 py-0.5',
      md: 'text-sm px-2.5 py-1',
      lg: 'text-base px-3 py-1.5',
    };

    const content = displayContent;

    return (
      <span
        ref={ref}
        className={cn(
          baseStyles,
          variants[autoVariant],
          sizes[size],
          className
        )}
        {...props}
      >
        {content}
      </span>
    );
  }
);

Badge.displayName = 'Badge';
