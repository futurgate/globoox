import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { PrototypeShell } from '@/app/prototype/_components/PrototypeShell';
import { StudioSectionNavigation } from '@/app/studio/_components/StudioSectionNavigation';

it('renders the same current route and real links for both widths of the section switcher', () => {
  vi.stubGlobal('React', React);
  try {
    const html = renderToStaticMarkup(React.createElement(StudioSectionNavigation, {
      label: 'Разделы перевода', compactLabel: 'Раздел книги',
      items: [{ id: '', label: 'Обзор' }, { id: 'glossary', label: 'Глоссарий' }],
      active: 'glossary', hrefFor: id => '/studio/books/b/translations/EN' + (id ? '/' + id : ''),
    }));
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('<strong>Глоссарий</strong>');
    expect(html.match(/<a\s/g)).toHaveLength(2);
    expect(html.match(/<a\b[^>]+>/g)?.filter(link => link.includes('aria-current="page"'))).toEqual([
      expect.stringContaining('href="/studio/books/b/translations/EN/glossary"'),
    ]);
  } finally { vi.unstubAllGlobals(); }
});

it('keeps the drawer trigger specific to Studio in the catalog and within a book', () => {
  vi.stubGlobal('React', React);
  try {
    const props = { role: 'admin' as const, active: 'projects', items: [{ id: 'projects', label: 'Мои проекты' }],
      title: 'Книга', itemHref: (id: string) => '/studio/' + id, children: null };
    for (const detail of [undefined, { parent: { label: 'Мои проекты', href: '/studio/projects' } }]) {
      const html = renderToStaticMarkup(React.createElement(PrototypeShell, { ...props, live: true, detail }));
      expect(html).toContain('aria-haspopup="dialog"');
      expect(html).not.toContain('pt-mobile-nav');
    }
    const prototype = renderToStaticMarkup(React.createElement(PrototypeShell, props));
    expect(prototype).toContain('pt-mobile-nav');
    expect(prototype).not.toContain('aria-haspopup="dialog"');
  } finally { vi.unstubAllGlobals(); }
});
