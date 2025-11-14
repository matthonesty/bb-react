import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils/cn';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'bordered' | 'elevated';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

/**
 * Card container component with variants
 */
export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ children, className, variant = 'default', padding = 'md', ...props }, ref) => {
    const baseStyles = 'rounded-lg';

    const variants = {
      default: 'bg-card-bg',
      bordered: 'bg-card-bg border border-card-border',
      elevated: 'bg-card-bg shadow-lg',
    };

    const paddings = {
      none: '',
      sm: 'p-3',
      md: 'p-4',
      lg: 'p-6',
    };

    return (
      <div
        ref={ref}
        className={cn(baseStyles, variants[variant], paddings[padding], className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

/**
 * Card Header component
 */
export const CardHeader = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ children, className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn('flex flex-col space-y-1.5', className)}
      {...props}
    >
      {children}
    </div>
  );
});

CardHeader.displayName = 'CardHeader';

/**
 * Card Title component
 */
export const CardTitle = forwardRef<
  HTMLHeadingElement,
  HTMLAttributes<HTMLHeadingElement>
>(({ children, className, ...props }, ref) => {
  return (
    <h3
      ref={ref}
      className={cn('text-xl font-semibold text-foreground', className)}
      {...props}
    >
      {children}
    </h3>
  );
});

CardTitle.displayName = 'CardTitle';

/**
 * Card Description component
 */
export const CardDescription = forwardRef<
  HTMLParagraphElement,
  HTMLAttributes<HTMLParagraphElement>
>(({ children, className, ...props }, ref) => {
  return (
    <p
      ref={ref}
      className={cn('text-sm text-foreground-muted', className)}
      {...props}
    >
      {children}
    </p>
  );
});

CardDescription.displayName = 'CardDescription';

/**
 * Card Content component
 */
export const CardContent = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ children, className, ...props }, ref) => {
  return (
    <div ref={ref} className={cn('pt-0', className)} {...props}>
      {children}
    </div>
  );
});

CardContent.displayName = 'CardContent';

/**
 * Card Footer component
 */
export const CardFooter = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ children, className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn('flex items-center pt-4', className)}
      {...props}
    >
      {children}
    </div>
  );
});

CardFooter.displayName = 'CardFooter';
