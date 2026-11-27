'use client';

import Link from 'next/link';
import { useId, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Props = {
  label: string;
  compactLabel: string;
  items: readonly { id: string; label: string }[];
  active: string;
  hrefFor: (id: string) => string;
};

export function StudioSectionNavigation({ label, compactLabel, items, active, hrefFor }: Props) {
  const [open, setOpen] = useState(false);
  const linksId = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const current = items.find(item => item.id === active);

  return (
    <nav aria-label={label} className="studio-sections"
      onBlur={event => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      onKeyDown={event => {
        if (event.key === 'Escape' && open) {
          event.preventDefault();
          setOpen(false);
          trigger.current?.focus();
        }
      }}>
      <Button ref={trigger} type="button" variant="outline" className="studio-sections-trigger"
        aria-expanded={open} aria-controls={linksId} onClick={() => setOpen(!open)}>
        <span>{compactLabel}</span>
        <strong>{current?.label}</strong>
        <ChevronDown aria-hidden="true"/>
      </Button>
      <div id={linksId} className="pt-sections studio-section-links" data-expanded={open}>
        {items.map(item => (
          <Button key={item.id} variant="ghost" asChild>
            <Link href={hrefFor(item.id)} aria-current={active === item.id ? 'page' : undefined}
              onNavigate={() => setOpen(false)}>
              {item.label}
            </Link>
          </Button>
        ))}
      </div>
    </nav>
  );
}
