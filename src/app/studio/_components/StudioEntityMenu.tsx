'use client';

import { createContext, useContext, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import IOSItemsStack from '@/components/ui/ios-items-stack';
import { uiMenuItemButton } from '@/components/ui/button-styles';
import { useAdaptiveDropdown } from '@/components/ui/useAdaptiveDropdown';

export const StudioHeaderActions = createContext<HTMLElement | null>(null);

type Action = { label: string; onClick: () => void; disabled?: boolean };

export function StudioEntityMenu({ label, actions, inHeader = false }: { label: string; actions: Action[]; inHeader?: boolean }) {
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const header = useContext(StudioHeaderActions);
  const id = useId();
  const { menuStyle } = useAdaptiveDropdown({ isOpen: open, setIsOpen: setOpen, triggerRef: trigger, menuRef: menu,
    menuWidth: 224, menuHeight: actions.length * 44, measureMenu: true });
  if (!actions.length) return null;
  const body = <><Button ref={trigger} type="button" size="icon" variant="ghost" aria-expanded={open}
    aria-controls={open ? id : undefined} aria-label={label} onClick={() => setOpen(v => !v)}><MoreVertical aria-hidden/></Button>
    {open && <div id={id} ref={menu} style={{ position: 'fixed', ...menuStyle, width: 224, zIndex: 40 }}
      onKeyDown={e => { if (e.key === 'Escape') { setOpen(false); trigger.current?.focus(); } }}>
      <IOSItemsStack className="shadow-lg">{actions.map(action =>
        <button type="button" className={uiMenuItemButton} key={action.label} disabled={action.disabled} onClick={() => {
          setOpen(false); trigger.current?.focus(); action.onClick();
        }}>{action.label}</button>)}</IOSItemsStack>
    </div>}</>;
  return inHeader && header ? createPortal(body, header) : body;
}
