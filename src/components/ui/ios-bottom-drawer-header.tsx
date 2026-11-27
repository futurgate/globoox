'use client';

import { X } from 'lucide-react';
import IOSIcon from '@/components/ui/ios-icon';
import { uiIconCircleButton } from '@/components/ui/button-styles';
import { cn } from '@/lib/utils';

interface IOSBottomDrawerHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  onClose: () => void;
  closeLabel?: string;
  className?: string;
}

export default function IOSBottomDrawerHeader({
  title,
  subtitle,
  leading,
  trailing,
  onClose,
  closeLabel = 'Close',
  className,
}: IOSBottomDrawerHeaderProps) {
  return (
    <div className={cn('p-5', className)}>
      <div className="flex items-start gap-4">
        {leading && <div className="shrink-0">{leading}</div>}

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-[18px] font-semibold tracking-[-0.02em] text-[var(--reader-text)]">
                {title}
              </h3>
              {subtitle && (
                <div className="mt-1 text-[17px] leading-[22px] text-[var(--reader-muted-text)]">
                  {subtitle}
                </div>
              )}
            </div>
            {trailing && <div className="mt-1 shrink-0">{trailing}</div>}
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className={`${uiIconCircleButton} relative z-30 shrink-0 before:absolute before:bottom-[-8px] before:left-[-8px] before:right-[-20px] before:top-[-20px] before:content-['']`}
          aria-label={closeLabel}
        >
          <IOSIcon icon={X} strokeWidth={2.1} />
        </button>
      </div>
    </div>
  );
}
