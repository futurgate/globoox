import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import ProjectWorkspace from '@/app/studio/_components/ProjectWorkspace';
import type { WorkspaceBook, WorkspaceData } from '@/lib/translationWorkspaceTypes';

const state = vi.hoisted(() => ({ search:new URLSearchParams(), urls:vi.fn() }));
vi.mock('next/navigation', () => ({
  useSearchParams:() => state.search, usePathname:() => '/studio/projects/one', useRouter:() => ({}),
}));
vi.mock('@/app/studio/_components/LaunchAccess', () => ({ useLaunchAccess:() => ({allowed:true}) }));
vi.mock('@/app/studio/_components/bookRequests', async original => ({
  ...await original<typeof import('@/app/studio/_components/bookRequests')>(),
  useBookData:(url: string | null) => { state.urls(url); return url ? {data:{books:[]}} : null; },
}));
vi.mock('@/app/studio/_components/StudioLanguages', () => ({
  StudioLanguagePicker:({value}: {value:string}) => React.createElement('span', null, 'Язык ' + value),
  useStudioLanguageName:() => (code:string) => code,
  useStudioLanguageCatalog:() => ({languages:[{code:'en-gb'}]}),
}));
vi.mock('@/app/studio/_components/ProjectGlossary', () => ({
  ProjectGlossary:({lang}: {lang:string}) => React.createElement('div', null, 'Словарь ' + lang),
}));
const project = {id:'one', name:'Проект', orderRevision:1};
function book(id:string, projectId:string): WorkspaceBook {
  return {id, projectId, title:id, author:null, sourceLanguage:'RU', processingStatus:'ready',seriesId:null,volumeNumber:null};
}
const data:WorkspaceData = {userId:'owner',role:'admin',projects:[project,{id:'two',name:'Другой проект'}],
  books:[book('a','one'),book('b','one'),book('c','two')],series:[]};
const render = (section:string) => renderToStaticMarkup(React.createElement(ProjectWorkspace, {
  data,project,section,refresh:async () => {},
}));
beforeEach(() => { vi.stubGlobal('React',React); state.search = new URLSearchParams('lang=FR'); });
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });

it('groups translation settings and launch above the tabs, and book actions with the queue', () => {
  const html = render('');
  const tabs = html.indexOf('aria-label="Разделы проекта"');
  expect(tabs).toBeGreaterThan(0);
  const toolbar = html.substring(html.indexOf('aria-label="Язык и действия перевода"'),tabs);
  for (const label of ['Язык FR','Параметры перевода','Перевести проект']) expect(toolbar).toContain(label);
  const tableActions = html.split('aria-label="Действия со списком книг"')[1].split('<table')[0];
  for (const label of ['Загрузить EPUB','Добавить из проекта','Изменить порядок']) expect(tableActions).toContain(label);
  const glossary = render('glossary');
  expect(glossary).toContain('Словарь FR');
  expect(glossary).toContain('Параметры перевода');
  expect(glossary).not.toContain('Загрузить EPUB');
});
it('opens a personal language as a glossary context without requesting translation progress', () => {
  state.search.set('lang','en-GB');
  const html = render('glossary');
  expect(html).toContain('Словарь EN-GB');
  expect(html).not.toContain('Перевести проект');
  expect(state.urls).not.toHaveBeenCalledWith(expect.stringContaining('project-progress'));
});
