import { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

interface PageHeaderProps {
  title: string;
  description?: string;
  /** Optional actions/buttons to display on the right side of header */
  actions?: ReactNode;
  className?: string;
}

/**
 * Standard page header with title, description, and optional actions
 *
 * Provides consistent styling for page titles across the application
 */
export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('mb-8', className)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {title}
          </h1>
          {description && (
            <p className="text-foreground-muted">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
