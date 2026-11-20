'use client';

import type { ReactNode, Ref } from 'react';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { uiIconTriggerButton } from '@/components/ui/button-styles';
import IOSIcon from '@/components/ui/ios-icon';
import { cn } from '@/lib/utils';

interface IOSReaderHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  trailingLeft?: ReactNode;
  trailingRight?: ReactNode;
  className?: string;
  onBack?: () => void;
  backLabel?: string;
  headingRef?: Ref<HTMLHeadingElement>;
  layout?: 'reader' | 'workspace';
}

export default function IOSReaderHeader({
  title,
  subtitle,
  trailingLeft,
  trailingRight,
  className,
  onBack,
  backLabel = 'Back',
  headingRef,
  layout = 'reader',
}: IOSReaderHeaderProps) {
  const workspace = layout === 'workspace';
  return (
    <header
      className={cn('mobile-ui-no-select border-b backdrop-blur-xl', className)}
      style={{
        backgroundColor: 'var(--reader-chrome-bg)',
        borderColor: 'var(--reader-border)',
        color: 'var(--reader-text)',
      }}
    >
      <div
        className={cn(
          'flex min-h-11 items-center',
          workspace
            ? 'gap-x-1 py-1.5 sm:gap-x-2'
            : 'px-4 pt-[calc(env(safe-area-inset-top)+16px)]',
        )}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onBack}
          aria-label={backLabel}
          title={backLabel}
          className={cn(
            uiIconTriggerButton,
            'shrink-0 text-[var(--reader-accent)]',
            workspace
              ? 'lg:w-auto lg:max-w-44 lg:gap-1 lg:pr-3 lg:pl-2'
              : '-ml-2',
          )}
        >
          <IOSIcon
            icon={ChevronLeft}
            className="size-5"
            strokeWidth={2}
            aria-hidden="true"
          />
          {workspace && (
            <span className="hidden truncate lg:inline">{backLabel}</span>
          )}
        </Button>
        <div className={workspace ? 'min-w-0 flex-1' : 'min-w-0 flex-1 px-2'}>
          <h1
            title={typeof title === 'string' ? title : undefined}
            ref={headingRef}
            tabIndex={headingRef ? -1 : undefined}
            className={cn(
              'max-w-full font-semibold text-[var(--reader-text)]',
              workspace
                ? 'line-clamp-2 text-base leading-tight break-words sm:text-lg'
                : 'truncate text-sm',
            )}
          >
            {title}
          </h1>
          {subtitle && (
            <p
              className={cn(
                'text-[var(--reader-muted-text)]',
                workspace
                  ? 'mt-0.5 truncate text-xs leading-snug'
                  : 'truncate text-[11px] leading-3',
              )}
            >
              {subtitle}
            </p>
          )}
        </div>
        {(trailingLeft || trailingRight) && (
          <div
            className={cn(
              'flex items-center justify-end text-[var(--reader-accent)]',
              workspace ? 'ml-auto max-w-full' : 'h-full shrink-0',
            )}
          >
            {trailingLeft}
            {trailingRight}
          </div>
        )}
      </div>
    </header>
  );
}
