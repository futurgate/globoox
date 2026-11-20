'use client';

import Link from 'next/link';
import IOSReaderHeader, {
  type HeaderAncestor,
} from '@/components/ui/ios-reader-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { uiMenuItemButton } from '@/components/ui/button-styles';
import { Fragment, useEffect, useRef, type ReactNode } from 'react';
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
  live?: boolean;
  role: keyof typeof roleNames;
  items: NavItem[];
  active: string;
  onSelect: (id: string) => void;
  title: string;
  subtitle?: string;
  detail?: { ancestors: readonly HeaderAncestor[]; action?: ReactNode };
  children: ReactNode;
};

export function PrototypeShell({
  live = false,
  role,
  items,
  active,
  onSelect,
  title,
  subtitle,
  detail,
  children,
}: ShellProps) {
  const menu = useRef<HTMLDetailsElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const previousTitle = useRef(title);
  useEffect(() => {
    if (title === previousTitle.current) return;
    previousTitle.current = title;
    window.scrollTo({ top: 0, behavior: 'instant' });
    heading.current?.focus({ preventScroll: true });
  }, [title]);
  const roleName = roleNames[role];
  const nav = (
    <nav aria-label={roleName} className="pt-navigation">
      {items.map(({ id, label, section, icon: Icon, count }, i) => (
        <Fragment key={id}>
          {section && section !== items[i - 1]?.section && (
            <p className="pt-section-label">{section}</p>
          )}
          <Button
            variant="ghost"
            className={uiMenuItemButton}
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
            {typeof count === 'number' && count > 0 && (
              <Badge variant="secondary">{count}</Badge>
            )}
          </Button>
        </Fragment>
      ))}
    </nav>
  );
  const switchRole = live ? (
    <Link className="pt-switch" href="/my-books">В библиотеку Globoox</Link>
  ) : (
    <Link className="pt-switch" href="/prototype">
      <ArrowLeftRight size={16} />
      Сменить кабинет
    </Link>
  );
  return (
    <div className="pt-shell">
      <aside className="pt-sidebar">
        <div className="pt-brand">
          <Link className="pt-wordmark" href={live ? '/prototype/to-be' : '/prototype'}>
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
      <main className={detail ? 'pt-main pt-main-detail' : 'pt-main'}>
        {detail ? (
          <IOSReaderHeader
            layout="workspace"
            className="pt-detail-header"
            title={title}
            subtitle={subtitle}
            headingRef={heading}
            navigationLabel="Путь навигации"
            ancestors={detail.ancestors}
            trailingRight={detail.action}
          />
        ) : (
          <header className="pt-header">
            <h1 ref={heading} tabIndex={-1}>
              {title}
            </h1>
            {subtitle && <p>{subtitle}</p>}
          </header>
        )}
        {children}
      </main>
    </div>
  );
}
