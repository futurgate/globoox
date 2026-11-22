'use client';

import { createContext, useContext, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import IOSItemsStack from '@/components/ui/ios-items-stack';
import { useUIPortalHost } from '@/components/ui/ui-portal-scope';
import { uiMenuItemButton } from '@/components/ui/button-styles';
import { useAdaptiveDropdown } from '@/components/ui/useAdaptiveDropdown';

export const StudioHeaderActions = createContext<HTMLElement | null>(null);

export type StudioMenuAction = { label: string; onClick: () => void; disabled?: boolean };

export function StudioHeaderTools({ children }: { children: ReactNode }) {
  const header = useContext(StudioHeaderActions);
  return header ? createPortal(children, header) : children;
}

export function StudioEntityMenu({ label, actions, inHeader = false, triggerText, disabled }: {
  label: string; actions: StudioMenuAction[]; inHeader?: boolean; triggerText?: string; disabled?: boolean;
}) {
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const host = useUIPortalHost();
  const id = useId();
  const { menuStyle, isPositioned } = useAdaptiveDropdown({ isOpen: open, setIsOpen: setOpen, triggerRef: trigger, menuRef: menu,
    menuWidth: 224, menuHeight: actions.length * 44, measureMenu: true });
  useLayoutEffect(() => {
    if (open && isPositioned) menu.current?.querySelector<HTMLButtonElement>('button:enabled')?.focus({ preventScroll: true });
  }, [open, isPositioned]);
  if (!actions.length) return null;
  const body = <><Button ref={trigger} type="button" size={triggerText ? 'sm' : 'icon'} variant={triggerText ? 'outline' : 'ghost'} disabled={disabled} aria-expanded={open}
    aria-controls={open ? id : undefined} aria-label={label} onClick={() => setOpen(v => !v)}>
      {triggerText ? <>{triggerText}<ChevronDown aria-hidden/></> : <MoreVertical aria-hidden/>}
    </Button>
    {open && host && createPortal(<div id={id} ref={menu} role="group" aria-label={label}
      className="fixed z-[150] w-56 max-w-[calc(100vw-16px)] text-[var(--app-text)]"
      style={{ ...menuStyle, visibility: isPositioned ? 'visible' : 'hidden' }}
      onKeyDown={e => {
        if (e.key === 'Escape') {
          e.preventDefault(); e.stopPropagation(); setOpen(false); trigger.current?.focus();
        } else if (e.key === 'Tab') {
          setOpen(false); trigger.current?.focus();
        } else if (['ArrowDown','ArrowUp','Home','End'].includes(e.key)) {
          e.preventDefault();
          const buttons = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('button:enabled'));
          const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
          const next = e.key === 'Home' ? 0 : e.key === 'End' ? buttons.length - 1 :
            (index + (e.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
          buttons[next]?.focus();
        }
      }}>
      <IOSItemsStack className="shadow-lg">{actions.map(action =>
        <button type="button" className={uiMenuItemButton} key={action.label} disabled={action.disabled} onClick={() => {
          setOpen(false); trigger.current?.focus(); action.onClick();
        }}>{action.label}</button>)}</IOSItemsStack>
    </div>, host)}</>;
  return inHeader ? <StudioHeaderTools>{body}</StudioHeaderTools> : body;
}
