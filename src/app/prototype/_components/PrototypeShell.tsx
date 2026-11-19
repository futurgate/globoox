'use client';

import Link from 'next/link';
import { Fragment, useRef, type ReactNode } from 'react';
import { ArrowLeftRight, ChevronDown, type LucideIcon } from 'lucide-react';

export type NavItem = {
  id: string;
  label: string;
  section?: string;
  icon?: LucideIcon;
  count?: number;
};

const roleNames = {
  admin: 'Кабинет администратора',
  author: 'Кабинет автора',
  editor: 'Настройки редактора',
};

type ShellProps = {
  role: keyof typeof roleNames;
  items: NavItem[];
  active: string;
  onSelect: (id: string) => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export function PrototypeShell({
  role,
  items,
  active,
  onSelect,
  title,
  subtitle,
  children,
}: ShellProps) {
  const menu = useRef<HTMLDetailsElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const roleName = roleNames[role];
  const nav = (
    <nav aria-label={roleName} className="pt-navigation">
      {items.map(({ id, label, section, icon: Icon, count }, i) => (
        <Fragment key={id}>
          {section && section !== items[i - 1]?.section && (
            <p className="pt-section-label">{section}</p>
          )}
          <button
            type="button"
            aria-current={id === active ? 'page' : undefined}
            onClick={() => {
              if (menu.current) menu.current.open = false;
              onSelect(id);
              requestAnimationFrame(() =>
                heading.current?.focus({ preventScroll: true }),
              );
            }}
          >
            {Icon && <Icon size={19} strokeWidth={1.7} aria-hidden />}
            <span>{label}</span>
            {typeof count === 'number' && count > 0 && <small>{count}</small>}
          </button>
        </Fragment>
      ))}
    </nav>
  );
  const switchRole = (
    <Link className="pt-switch" href="/prototype">
      <ArrowLeftRight size={16} />
      Сменить кабинет
    </Link>
  );
  return (
    <div className="pt-shell">
      <aside className="pt-sidebar">
        <div className="pt-brand">
          <Link className="pt-wordmark" href="/prototype">
            Globoox
          </Link>
          <span>{roleName}</span>
        </div>
        {nav}
        {switchRole}
      </aside>
      <details className="pt-mobile-nav" ref={menu}>
        <summary>
          <strong>Globoox</strong>
          <span>{roleName}</span>
          <ChevronDown size={18} />
        </summary>
        {nav}
        {switchRole}
      </details>
      <main className="pt-main">
        <header className="pt-header">
          <h1 ref={heading} tabIndex={-1}>
            {title}
          </h1>
          {subtitle && <p>{subtitle}</p>}
        </header>
        {children}
      </main>
    </div>
  );
}
