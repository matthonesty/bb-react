import { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

interface PageContainerProps {
  children: ReactNode;
  className?: string;
  /** Maximum width - defaults to 7xl (1280px) */
  maxWidth?: 'full' | '7xl' | '6xl' | '5xl' | '4xl';
}

/**
 * Standard page container with consistent width and padding
 *
 * Provides responsive padding and max-width constraint
 * Used across all main pages for visual consistency
 */
export function PageContainer({ children, className, maxWidth = '7xl' }: PageContainerProps) {
  const maxWidthClasses = {
    full: 'max-w-full',
    '7xl': 'max-w-7xl',
    '6xl': 'max-w-6xl',
    '5xl': 'max-w-5xl',
    '4xl': 'max-w-4xl',
  };

  return (
    <div className={cn('mx-auto px-4 py-8 sm:px-6 lg:px-8', maxWidthClasses[maxWidth], className)}>
      {children}
    </div>
  );
}
