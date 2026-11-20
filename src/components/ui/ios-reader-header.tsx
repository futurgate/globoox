'use client';

import type { ReactNode, Ref } from 'react';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { uiIconTriggerButton } from '@/components/ui/button-styles';
import IOSIcon from '@/components/ui/ios-icon';
import { cn } from '@/lib/utils';

export type HeaderAncestor = { label: string; href: string };

interface SharedHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  trailingLeft?: ReactNode;
  trailingRight?: ReactNode;
  className?: string;
  headingRef?: Ref<HTMLHeadingElement>;
}

type IOSReaderHeaderProps = SharedHeaderProps &
  (
    | { layout?: 'reader'; backLabel?: string; onBack?: () => void }
    | {
        layout: 'workspace';
        ancestors: readonly HeaderAncestor[];
        navigationLabel: string;
      }
  );

export default function IOSReaderHeader(props: IOSReaderHeaderProps) {
  const {
    title,
    subtitle,
    trailingLeft,
    trailingRight,
    className,
    headingRef,
  } = props;
  const workspace = props.layout === 'workspace';
  return (
    <header
      className={cn(
        'mobile-ui-no-select backdrop-blur-xl',
        !workspace && 'border-b',
        className,
      )}
      style={{
        backgroundColor: 'var(--reader-chrome-bg)',
        borderColor: 'var(--reader-border)',
        color: 'var(--reader-text)',
      }}
    >
      {workspace && (
        <nav aria-label={props.navigationLabel} className="pt-2 sm:pt-3">
          <ol className="m-0 flex min-w-0 list-none items-center gap-x-2 p-0">
            {props.ancestors.map(({ label, href }, index) => (
              <li key={href} className="flex min-w-0 items-center gap-x-2">
                {index > 0 && (
                  <span
                    aria-hidden="true"
                    className="text-xs text-[var(--reader-muted-text)]"
                  >
                    /
                  </span>
                )}
                <a
                  href={href}
                  title={label}
                  className="inline-flex min-h-6 min-w-0 items-center text-xs font-medium text-[color:color-mix(in_srgb,var(--reader-text)_78%,transparent)] underline decoration-[var(--reader-border)] underline-offset-2 hover:text-[var(--reader-accent)] hover:decoration-current focus-visible:decoration-current"
                >
                  <span className="truncate">{label}</span>
                </a>
              </li>
            ))}
          </ol>
        </nav>
      )}
      <div
        className={cn(
          'flex min-h-11 items-center',
          workspace
            ? 'gap-x-3 pt-0.5 pb-2'
            : 'px-4 pt-[calc(env(safe-area-inset-top)+16px)]',
        )}
      >
        {!workspace && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={props.onBack}
            aria-label={props.backLabel ?? 'Back'}
            title={props.backLabel ?? 'Back'}
            className={cn(
              uiIconTriggerButton,
              '-ml-2 shrink-0 text-[var(--reader-accent)]',
            )}
          >
            <IOSIcon
              icon={ChevronLeft}
              className="size-5"
              strokeWidth={2}
              aria-hidden="true"
            />
          </Button>
        )}
        <div className={workspace ? 'min-w-0 flex-1' : 'min-w-0 flex-1 px-2'}>
          <h1
            title={typeof title === 'string' ? title : undefined}
            ref={headingRef}
            tabIndex={headingRef ? -1 : undefined}
            className={cn(
              'max-w-full font-semibold text-[var(--reader-text)]',
              workspace
                ? 'line-clamp-2 text-xl leading-tight tracking-tight break-words sm:text-2xl'
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
