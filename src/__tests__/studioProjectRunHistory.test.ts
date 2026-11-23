import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ProjectRunHistory } from '@/app/studio/_components/ProjectRunHistory';

const api = vi.hoisted(() => ({ read: vi.fn(), params: new URLSearchParams() }));
vi.mock('next/navigation', () => ({ useSearchParams: () => api.params }));
vi.mock('@/app/studio/_components/bookRequests', () => ({
  useBookData: (url: string) => api.read(url), useBookAction: () => ({busy:false}),
}));
vi.mock('@/app/studio/_components/LaunchAccess', () => ({useLaunchAccess: () => ({allowed:true})}));

const group = { groupId:'group',operation:'project',createdAt:'2026-11-23T10:00:00Z',lang:'EN',
  status:'stopped',doneVolumes:0,totalVolumes:1,costUsd:null,usageComplete:false,canResume:true,canStop:false,
  volumes:[{bookId:'book',runId:'run',volumeNumber:2,title:'Север',lang:'EN',status:'stopped',activeStage:'glossary'}],
};
function render(archived = false) {
  return renderToStaticMarkup(React.createElement(ProjectRunHistory,{projectId:'project',admin:true,archived}));
}
beforeEach(() => {
  vi.stubGlobal('React',React);
  api.params = new URLSearchParams('lang=EN&group=group');
  api.read.mockReturnValue({data:{groups:[group],nextCursor:'older'}});
});
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });

it('addresses an old group directly and shows its frozen per-book run link', () => {
  const html = render();
  expect(api.read).toHaveBeenCalledWith('/api/studio/project-runs?projectId=project&groupId=group');
  expect(html).toContain('/studio/books/book/translations/EN/runs/run');
  expect(html).toContain('Продолжить запуск');
  expect(html).not.toContain('Остановить запуск');
  expect(html).not.toContain('Старее');
});

it('can read archived results, and other groups cannot leak into the requested detail', () => {
  expect(render(true)).not.toContain('Продолжить запуск');
  api.params.set('group','absent');
  expect(render()).toContain('Запуск не найден в этом проекте.');
  expect(render()).not.toContain('/studio/books/book/');
});

it('has a stable link from the paginated history and gates stop on server capability', () => {
  api.params.delete('group');
  expect(render()).toContain('/studio/projects/project/runs?lang=EN&amp;group=group');
  expect(render()).toContain('Старее');
  api.params.set('group','group');
  api.read.mockReturnValue({data:{groups:[{...group,canResume:false,canStop:true,status:'running'}]}});
  expect(render()).toContain('Остановить запуск');
  expect(render()).not.toContain('Продолжить запуск');
});

it('lists all owned commands and links an archived project to the original group', () => {
  api.read.mockReturnValue({data:{groups:[{...group,projectId:'archived',projectName:'Архивная книга'}],nextCursor:null}});
  const html = renderToStaticMarkup(React.createElement(ProjectRunHistory,{admin:true}));
  expect(api.read).toHaveBeenCalledWith('/api/studio/workspace-runs');
  expect(html).toContain('/studio/projects/archived/runs?lang=EN&amp;group=group');
  expect(html).toContain('Архивная книга');
  expect(html).not.toContain('Продолжить запуск');
});

it('requests a complete language-scoped project page and preserves direct links to earlier runs', () => {
  api.params.delete('group');
  const view = () => renderToStaticMarkup(React.createElement(ProjectRunHistory, { projectId:'project',lang:'FR',admin:true }));
  view();
  expect(api.read).toHaveBeenLastCalledWith('/api/studio/project-runs?projectId=project&lang=FR');
  api.params.set('group','group');
  view();
  expect(api.read).toHaveBeenLastCalledWith('/api/studio/project-runs?projectId=project&groupId=group');
});

it('distinguishes glossary-only and translated books in a finished project run', () => {
  const done = { status:'done' };
  const volume = {...group.volumes[0],status:'done',activeStage:null};
  api.read.mockReturnValue({data:{groups:[{...group,status:'done',volumes:[
    {...volume,stages:{glossary:done}},
    {...volume,runId:'run-2',stages:{glossary:done,translate:done}},
  ]}]}});
  const html=render();
  expect(html).toContain('Готов только глоссарий');
  expect(html).toContain('Глоссарий и перевод готовы');
});
