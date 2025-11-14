'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface CopyButtonProps {
  text: string;
  label?: string;
  showLabel?: boolean;
  size?: number;
  className?: string;
}

/**
 * Copy to clipboard button with visual feedback
 */
export function CopyButton({
  text,
  label,
  showLabel = false,
  size = 16,
  className = ''
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`inline-flex items-center gap-1 text-foreground-muted hover:text-primary transition-colors ${className}`}
      title={label || `Copy ${text}`}
      type="button"
    >
      {copied ? (
        <>
          <Check size={size} className="text-success" />
          {showLabel && <span className="text-xs text-success">Copied!</span>}
        </>
      ) : (
        <>
          <Copy size={size} />
          {showLabel && label && <span className="text-xs">{label}</span>}
        </>
      )}
    </button>
  );
}

/**
 * Copyable text field with inline copy button
 */
interface CopyableFieldProps {
  label: string;
  value: string | number | null | undefined;
  copyValue?: string;
  className?: string;
}

export function CopyableField({ label, value, copyValue, className = '' }: CopyableFieldProps) {
  const displayValue = value?.toString() || '—';
  const textToCopy = copyValue || displayValue;

  if (displayValue === '—') {
    return (
      <div className={`flex justify-between ${className}`}>
        <span className="text-foreground-muted">{label}:</span>
        <span className="text-foreground">—</span>
      </div>
    );
  }

  return (
    <div className={`flex justify-between items-center gap-2 ${className}`}>
      <span className="text-foreground-muted">{label}:</span>
      <div className="flex items-center gap-2">
        <span className="text-foreground">{displayValue}</span>
        <CopyButton text={textToCopy} label={label} size={14} />
      </div>
    </div>
  );
}
