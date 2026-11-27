'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { workspaceBase } from '@/lib/translationWorkspacePath';
import IOSReaderHeader, {
  type HeaderParentLink,
} from '@/components/ui/ios-reader-header';
import { Button } from '@/components/ui/button';
import IOSBottomDrawer from '@/components/ui/ios-bottom-drawer';
import IOSBottomDrawerHeader from '@/components/ui/ios-bottom-drawer-header';
import { Badge } from '@/components/ui/badge';
import { uiMenuItemButton } from '@/components/ui/button-styles';
import { Fragment, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { ArrowLeftRight, ChevronDown, Menu, type LucideIcon } from 'lucide-react';

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
  itemHref?: (id: string) => string;
  onSelect?: (id: string) => void;
  title: string;
  subtitle?: string;
  detail?: { parent: HeaderParentLink; action?: ReactNode };
  children: ReactNode;
};

type NavigationProps = Pick<ShellProps, 'live' | 'active' | 'items' | 'itemHref' | 'onSelect'> & {
  roleName: string;
};

function ShellNavigation({ live, roleName, items, active, itemHref, onSelect, closeMenu }: NavigationProps & {
  closeMenu: () => void;
}) {
  return <>
    <nav aria-label={roleName} className="pt-navigation">
      {items.map(({ id, label, section, icon: Icon, count }, i) => {
        const content = <>
          {Icon && <Icon size={19} strokeWidth={1.7} aria-hidden />}
          <span>{label}</span>
          {typeof count === 'number' && count > 0 && <Badge variant="secondary">{count}</Badge>}
        </>;
        const current = id === active ? 'page' : undefined;
        const href = itemHref?.(id);
        return (
          <Fragment key={id}>
            {section && section !== items[i - 1]?.section && (
              <p className="pt-section-label">{section}</p>
            )}
            {href ? (
              <Button asChild variant="ghost" className={uiMenuItemButton}>
                <Link href={href} aria-current={current}
                  onNavigate={event => {
                    closeMenu();
                    if (live && href === window.location.pathname + window.location.search + window.location.hash) {
                      event.preventDefault();
                    }
                  }}>
                  {content}
                </Link>
              </Button>
            ) : (
              <Button variant="ghost" className={uiMenuItemButton} type="button" aria-current={current}
                onClick={() => {
                  closeMenu();
                  onSelect?.(id);
                }}>
                {content}
              </Button>
            )}
          </Fragment>
        );
      })}
    </nav>
    {live ? (
      <Link className="pt-switch" href="/my-books" onNavigate={closeMenu}>В библиотеку Globoox</Link>
    ) : (
      <Link className="pt-switch" href="/prototype">
        <ArrowLeftRight size={16} />
        Сменить кабинет
      </Link>
    )}
  </>;
}

function StudioNavigationMenu({ navigation }: { navigation: NavigationProps }) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const close = () => setOpen(false);
  useEffect(() => {
    if (!open) return;
    const desktop = window.matchMedia('(min-width: 60rem)');
    const closeOnDesktop = () => { if (desktop.matches) setOpen(false); };
    desktop.addEventListener('change', closeOnDesktop);
    return () => desktop.removeEventListener('change', closeOnDesktop);
  }, [open]);
  return <>
    <Button type="button" variant="ghost" size="sm" className="studio-menu-trigger"
      aria-haspopup="dialog" aria-expanded={open} onClick={event => {
        event.currentTarget.focus({ preventScroll: true });
        setOpen(true);
      }}>
      <Menu aria-hidden="true"/>Меню
    </Button>
    <IOSBottomDrawer open={open} onOpenChange={setOpen} side="left"
      labelledBy={titleId} className="studio-menu-drawer">
      <IOSBottomDrawerHeader title={<span id={titleId}>Меню</span>} subtitle={navigation.roleName}
        closeLabel="Закрыть меню" onClose={close}/>
      <ShellNavigation {...navigation} closeMenu={close}/>
    </IOSBottomDrawer>
  </>;
}

export function PrototypeShell({
  live = false,
  role,
  items,
  active,
  onSelect,
  itemHref,
  title,
  subtitle,
  detail,
  children,
}: ShellProps) {
  const menu = useRef<HTMLDetailsElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const pathname = usePathname();
  // Sibling tabs share a heading and preserve the reading position.
  const page = live ? pathname?.replace(/^(\/studio\/projects\/[^/]+)\/(?:runs|glossary)$/, '$1') : null;
  function closePrototypeMenu() {
    if (menu.current) menu.current.open = false;
  }
  const previous = useRef({ page, title });
  useEffect(() => {
    if (previous.current.title === title && previous.current.page === page) return;
    previous.current = { page, title };
    window.scrollTo({ top: 0, behavior: 'instant' });
    heading.current?.focus({ preventScroll: true });
  }, [page, title]);
  const roleName = roleNames[role];
  const navigation: NavigationProps = { live, roleName, items, active, itemHref, onSelect: id => {
    onSelect?.(id);
    requestAnimationFrame(() => heading.current?.focus({ preventScroll: true }));
  } };
  const nav = <ShellNavigation {...navigation} closeMenu={closePrototypeMenu}/>;
  const menuButton = live && <StudioNavigationMenu key={page} navigation={navigation}/>;
  return (
    <div className={live ? 'pt-shell studio-shell' : 'pt-shell'}>
      <aside className="pt-sidebar">
        <div className="pt-brand">
          <Link className="pt-wordmark" href={live ? workspaceBase : '/prototype'}>
            Globoox
          </Link>
          <span>{roleName}</span>
        </div>
        {nav}
      </aside>
      {!live && (
        <details className="pt-mobile-nav" ref={menu}>
          <summary>
            <strong>Globoox</strong>
            <span>{roleName}</span>
            <ChevronDown size={18} />
          </summary>
          {nav}
        </details>
      )}
      <main className={detail ? 'pt-main pt-main-detail' : 'pt-main'}>
        {detail ? (
          <IOSReaderHeader
            layout="workspace"
            className="pt-detail-header"
            title={title}
            subtitle={subtitle}
            headingRef={heading}
            navigationLabel="На уровень выше"
            navigationAction={menuButton}
            parent={detail.parent}
            trailingRight={detail.action}
          />
        ) : (
          <header className="pt-header">
            <div className={live ? 'studio-page-heading' : undefined}>
              <h1 ref={heading} tabIndex={-1}>
                {title}
              </h1>
              {menuButton}
            </div>
            {subtitle && <p>{subtitle}</p>}
          </header>
        )}
        {children}
      </main>
    </div>
  );
}
