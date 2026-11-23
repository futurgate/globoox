'use client';

import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { ChevronsUpDown, Check, Pencil, Plus } from 'lucide-react';
import IOSIcon from '@/components/ui/ios-icon';
import {
  uiDropdownItemButton,
  uiMenuItemButton,
} from '@/components/ui/button-styles';
import IOSItemsStack from '@/components/ui/ios-items-stack';
import { useAdaptiveDropdown } from '@/components/ui/useAdaptiveDropdown';
import { useUIPortalHost } from '@/components/ui/ui-portal-scope';
import { cn } from '@/lib/utils';

export interface IOSSettingsRowOption {
  id: string;
  label: string;
  onEdit?: () => void;
}

interface IOSSettingsRowProps {
  label: string;
  value: string;
  options: readonly IOSSettingsRowOption[];
  addAction?: { label: string; onClick: () => void };
  onChange: (id: string) => void;
  className?: string;
  compactLabels?: { label: string; value: string };
  disabled?: boolean;
  'aria-label'?: string;
}

export default function IOSSettingsRow({
  label,
  value,
  options,
  addAction,
  onChange,
  className,
  compactLabels,
  disabled,
  'aria-label': accessibleLabel,
}: IOSSettingsRowProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const host = useUIPortalHost();
  const listId = useId();
  const isOpen = open && !disabled && !!host;
  const { menuStyle, isPositioned } = useAdaptiveDropdown({
    isOpen,
    setIsOpen: setOpen,
    triggerRef,
    menuRef,
    menuWidth: 224,
    menuHeight: 280,
    measureMenu: true,
  });
  const hasActions = Boolean(addAction || options.some(option => option.onEdit));
  const currentLabel = options.find((opt) => opt.id === value)?.label ?? value;

  useLayoutEffect(() => {
    const menu = menuRef.current;
    if (!menu || !isOpen || !isPositioned) return;
    const selected =
      menu.querySelector<HTMLButtonElement>('[aria-selected="true"], [aria-checked="true"]') ??
      menu.querySelector('button');
    selected?.focus({ preventScroll: true });
    selected?.scrollIntoView({ block: 'nearest' });
  }, [isOpen, isPositioned]);

  function close() {
    setOpen(false);
    triggerRef.current?.focus({ preventScroll: true });
  }

  function navigate(event: KeyboardEvent<HTMLDivElement>) {
    const choices = Array.from(event.currentTarget.querySelectorAll('button'));
    const index = choices.indexOf(document.activeElement as HTMLButtonElement);
    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        event.stopPropagation();
        close();
        return;
      case 'Tab':
        close();
        return;
      case 'Home':
      case 'End':
      case 'ArrowDown':
      case 'ArrowUp': {
        event.preventDefault();
        const next =
          event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? choices.length - 1
              : Math.max(
                  0,
                  Math.min(
                    choices.length - 1,
                    index + (event.key === 'ArrowDown' ? 1 : -1),
                  ),
                );
        choices[next]?.focus();
        return;
      }
    }
    // Match the next option with this initial, like a native picker.
    if (
      event.key.length === 1 &&
      event.key !== ' ' &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey
    ) {
      const next = [
        ...choices.slice(index + 1),
        ...choices.slice(0, index + 1),
      ].find((choice) =>
        choice.textContent
          ?.trim()
          .toLocaleLowerCase()
          .startsWith(event.key.toLocaleLowerCase()),
      );
      next?.focus();
    }
  }

  return (
    <div className={cn('relative min-w-0', className)}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={accessibleLabel}
        title={currentLabel}
        aria-haspopup={hasActions ? 'menu' : 'listbox'}
        aria-expanded={isOpen}
        aria-controls={isOpen ? listId : undefined}
        disabled={disabled || (!options.length && !addAction)}
        onClick={() => setOpen(!isOpen)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            setOpen(true);
          }
        }}
        className={cn(
          uiMenuItemButton,
          'min-h-12 gap-3 py-2 disabled:cursor-not-allowed disabled:opacity-50',
          compactLabels && 'gap-1 px-1 lg:gap-3 lg:px-4',
        )}
      >
        <span className="min-w-0 break-words">
          <span className={compactLabels && 'hidden lg:inline'}>{label}</span>
          {compactLabels && (
            <span className="lg:hidden">{compactLabels.label}</span>
          )}
        </span>
        <span className="flex min-w-0 items-center justify-end gap-1.5 text-right text-[15px] text-[var(--app-text-muted)]">
          <span className="min-w-0 break-words">
            <span className={compactLabels && 'hidden lg:inline'}>
              {currentLabel}
            </span>
            {compactLabels && (
              <span className="lg:hidden">{compactLabels.value}</span>
            )}
          </span>
          <IOSIcon
            icon={ChevronsUpDown}
            aria-hidden="true"
            className="size-4 shrink-0"
            strokeWidth={1.9}
          />
        </span>
      </button>
      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed z-[150] w-56 max-w-[calc(100vw-16px)]"
            style={{
              ...menuStyle,
              visibility: isPositioned ? 'visible' : 'hidden',
            }}
          >
            <IOSItemsStack className="shadow-lg">
              <div
                role={hasActions ? 'menu' : 'listbox'}
                id={listId}
                aria-label={accessibleLabel ?? label}
                onKeyDown={navigate}
                className="max-h-[min(18rem,calc(100dvh-24px))] overflow-y-auto overscroll-contain py-1 [&>button+button]:border-t [&>button+button]:border-[var(--app-border)]"
              >
                {options.map((opt) => {
                  const choice = <button
                    key={opt.id}
                    type="button"
                    role={hasActions ? 'menuitemradio' : 'option'}
                    aria-selected={hasActions ? undefined : value === opt.id}
                    aria-checked={hasActions ? value === opt.id : undefined}
                    tabIndex={-1}
                    className={cn(
                      uiDropdownItemButton,
                      'min-h-11 gap-2 break-words focus-visible:bg-[var(--fill-tertiary)] focus-visible:outline-offset-[-3px]',
                    )}
                    onClick={() => {
                      close();
                      onChange(opt.id);
                    }}
                  >
                    <span className="min-w-0">{opt.label}</span>
                    {value === opt.id && (
                      <IOSIcon
                        icon={Check}
                        aria-hidden="true"
                        className="size-[18px] shrink-0 text-[var(--app-accent)]"
                      />
                    )}
                  </button>;
                  if (!hasActions) return choice;
                  return <div key={opt.id} role="none" className="flex items-center border-b border-[var(--app-border)] last:border-0">
                    {choice}
                    {opt.onEdit && <button type="button" role="menuitem" tabIndex={-1}
                      aria-label={'Редактировать · ' + opt.label} title={'Редактировать · ' + opt.label}
                      className="inline-flex size-11 shrink-0 items-center justify-center text-[var(--app-text-muted)] hover:bg-[var(--fill-tertiary)]"
                      onClick={() => { close(); opt.onEdit?.(); }}><Pencil className="size-4" aria-hidden/></button>}
                  </div>;
                })}
                {addAction && <button type="button" role="menuitem" tabIndex={-1} className={cn(uiDropdownItemButton, 'min-h-11 justify-start gap-2')}
                  onClick={() => { close(); addAction.onClick(); }}><Plus className="size-4" aria-hidden/>{addAction.label}</button>}
              </div>
            </IOSItemsStack>
          </div>,
          host,
        )}
    </div>
  );
}
