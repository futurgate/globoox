'use client';

import { Button } from '@/components/ui/button';
import { uiMenuItemButton } from '@/components/ui/button-styles';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

import { useState, useSyncExternalStore } from 'react';
import {
  ArrowRight,
  Bell,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Layers3,
  Plus,
} from 'lucide-react';
import { PrototypeShell, type NavItem } from '../_components/PrototypeShell';
import { SectionNav } from '../_components/SectionNav';
import { BookTask } from './BookTask';
import { readAuthorRecipe } from './editor/config';
import { NewProject, emptyDraft } from './NewProject';
import {
  authorHref,
  flowFor,
  initialProjects,
  volumeCount,
  isUnlocked,
  openAuthor,
  phaseActions,
  phaseLabels,
  readProjects,
  subscribeHash,
  subscribeProjects,
  updateProject,
  type Project,
  type Volume,
} from './mock';
import './author.css';

const taskTitles: Record<string, string> = {
  term: 'Перевод термина',
  card: 'Карточка издания',
  queue: 'Очередь перевода',
  review: 'Проверка текста',
  impact: 'Изменения в серии',
  materials: 'Обложка и иллюстрации',
  preflight: 'Проверка сборки',
  ready: 'Издание готово',
};
const tabs = [
  { id: 'overview', label: 'Обзор' },
  { id: 'dictionary', label: 'Словарь' },
  { id: 'editions', label: 'Издания' },
];
function status(p: Project, v: Volume, i: number) {
  return isUnlocked(p, i) ? phaseLabels[v.phase] : 'Ожидает словарь тома ' + i;
}

export default function AuthorPrototype() {
  const projects = useSyncExternalStore(
    subscribeProjects,
    readProjects,
    initialProjects,
  );
  const hash = useSyncExternalStore(
    subscribeHash,
    () => window.location.hash,
    () => '',
  );
  const q = new URLSearchParams(hash.slice(1));
  const [draft, setDraft] = useState(emptyDraft);
  const requested = q.get('view') || 'projects';
  const p = projects.find((pr) => pr.id === q.get('project'));
  const v = p?.volumes.find((b) => b.id === q.get('volume')) || p?.volumes[0];
  const hasProject = Boolean(p && v);
  let view = requested;
  if (
    !['import', 'recipe', 'projects', 'decisions'].includes(view) &&
    !hasProject
  )
    view = 'projects';
  if (view === 'recipe' && !draft.files.length) view = 'import';
  if (p && v && view in taskTitles) {
    const expected = v.phase === 'glossary' ? 'term' : v.phase;
    if (
      !isUnlocked(p, p.volumes.indexOf(v)) ||
      (expected !== view && !(view === 'impact' && v.term))
    )
      view = 'overview';
  }
  const decisions = projects.flatMap((proj) =>
    proj.volumes.flatMap((vol, i) =>
      isUnlocked(proj, i) &&
      ['glossary', 'review', 'preflight', 'card', 'materials'].includes(
        vol.phase,
      )
        ? [{ p: proj, v: vol }]
        : [],
    ),
  );
  const items: NavItem[] = [
    { id: 'projects', label: 'Мои проекты', icon: Layers3 },
    {
      id: 'decisions',
      label: 'Требуют решения',
      icon: Bell,
      count: decisions.length,
    },
  ];
  const title =
    view === 'projects'
      ? 'Мои проекты'
      : view === 'decisions'
        ? 'Требуют решения'
        : view === 'import'
          ? 'Новый проект'
          : view === 'recipe'
            ? 'Параметры перевода'
            : taskTitles[view] || p?.title || 'Мои проекты';
  const updateVol = (volume: Volume) => {
    if (p)
      updateProject({
        ...p,
        volumes: p.volumes.map((b) => (b.id === volume.id ? volume : b)),
      });
  };
  const newProject = () => {
    setDraft({
      ...emptyDraft,
      files: [],
      units:
        readAuthorRecipe(emptyDraft.genre, emptyDraft.source, emptyDraft.target)
          ?.units || emptyDraft.units,
    });
    openAuthor('import');
  };
  const actionable =
    p?.volumes.find((b, i) => isUnlocked(p, i) && b.phase !== 'ready') ||
    p?.volumes[0];
  const isLocal =
    !!p && !!v && !['projects', 'decisions', 'import', 'recipe'].includes(view);
  const ancestors = [{ label: 'Мои проекты', href: authorHref('projects') }];
  if (isLocal && view in taskTitles) {
    ancestors.push({ label: p.title, href: authorHref('overview', p.id) });
  } else if (view === 'recipe') {
    ancestors.push({ label: 'Новый проект', href: authorHref('import') });
  }
  const detail =
    isLocal || view === 'import' || view === 'recipe'
      ? { ancestors }
      : undefined;
  return (
    <PrototypeShell
      role="author"
      title={title}
      detail={detail}
      subtitle={
        isLocal
          ? [
              view in taskTitles && p.volumes.length > 1 ? v.title : undefined,
              p.source + ' → ' + p.target,
            ]
              .filter(Boolean)
              .join(' · ')
          : undefined
      }
      items={items}
      active={view === 'decisions' ? 'decisions' : 'projects'}
      onSelect={(id) => openAuthor(id)}
    >
      <div className="au">
        {view === 'projects' && (
          <>
            <div className="au-heading">
              <div>
                <h2>Книги и серии</h2>
                <p>Ваши переводы и готовые издания</p>
              </div>
              <Button onClick={newProject}>
                <Plus size={18} />
                Новый проект
              </Button>
            </div>
            <div className="au-projects">
              {projects.map((proj) => (
                <Card key={proj.id} className="overflow-hidden">
                  <button
                    className={uiMenuItemButton + ' au-project'}
                    onClick={() => openAuthor('overview', proj.id)}
                  >
                    <div className="au-project-spine">
                      {proj.volumes.length > 1 ? <Layers3 /> : <BookOpen />}
                    </div>
                    <div className="au-project-summary">
                      <small>
                        {proj.volumes.length > 1
                          ? 'Серия · ' + volumeCount(proj.volumes.length)
                          : 'Книга'}
                      </small>
                      <h3>{proj.title}</h3>
                      <p>
                        {proj.source} → {proj.target}
                      </p>
                      <Badge
                        variant="secondary"
                        className={
                          proj.volumes.every((b) => b.phase === 'ready')
                            ? 'au-success'
                            : decisions.some((x) => x.p.id === proj.id)
                              ? 'au-warning'
                              : undefined
                        }
                      >
                        {proj.volumes.every((b) => b.phase === 'ready')
                          ? 'Издания готовы'
                          : decisions.some((x) => x.p.id === proj.id)
                            ? 'Требует решения'
                            : 'Перевод'}
                      </Badge>
                    </div>
                    <ChevronRight size={19} />
                  </button>
                </Card>
              ))}
            </div>
          </>
        )}
        {view === 'decisions' && (
          <Card className="au-form-panel">
            <h2>Ожидают вашего участия</h2>
            {decisions.length ? (
              decisions.map(({ p: pr, v: vol }) => (
                <button
                  key={pr.id + vol.id}
                  className={uiMenuItemButton + ' au-rowlink'}
                  onClick={() => flowFor(pr, vol)}
                >
                  <CircleAlert size={18} />
                  <span>
                    <strong>{phaseLabels[vol.phase]}</strong>
                    <small>
                      {pr.title} · {vol.title}
                    </small>
                  </span>
                  <ChevronRight size={18} />
                </button>
              ))
            ) : (
              <p>Все решения приняты.</p>
            )}
          </Card>
        )}
        {(view === 'import' || view === 'recipe') && (
          <NewProject draft={draft} setDraft={setDraft} step={view} />
        )}
        {isLocal && (
          <>
            {tabs.some(({ id }) => id === view) && (
              <SectionNav
                label="Разделы проекта"
                items={tabs}
                active={view}
                onSelect={(id) => openAuthor(id, p.id)}
              />
            )}
            {view === 'overview' && (
              <>
                {actionable && (
                  <div
                    className={
                      'au-attention ' +
                      (actionable.phase === 'ready' ? 'done' : '')
                    }
                  >
                    <div className="au-signal">
                      {actionable.phase === 'ready' ? (
                        <CheckCircle2 />
                      ) : (
                        <Bell />
                      )}
                    </div>
                    <div>
                      <h2>
                        {actionable.phase === 'glossary'
                          ? 'Уточните перевод термина'
                          : phaseLabels[actionable.phase]}
                      </h2>
                      <p>
                        {actionable.phase === 'glossary'
                          ? (p.source === 'Русский'
                              ? 'Северный предел'
                              : 'Northern Reach') + ' · '
                          : ''}
                        {actionable.title}
                      </p>
                    </div>
                    <Button onClick={() => flowFor(p, actionable)}>
                      {phaseActions[actionable.phase]}
                      <ArrowRight size={15} />
                    </Button>
                  </div>
                )}
                {actionable?.phase === 'glossary' && p.volumes.length > 1 && (
                  <p className="au-process-note">
                    После подтверждения словарь передаётся в перевод тома и в
                    подготовку следующего.
                  </p>
                )}
                <Card className="au-form-panel">
                  <h2>{p.volumes.length > 1 ? 'Тома серии' : 'Книга'}</h2>
                  {p.volumes.map((vol, i) => (
                    <button
                      className={uiMenuItemButton + ' au-rowlink'}
                      key={vol.id}
                      disabled={!isUnlocked(p, i)}
                      onClick={() => flowFor(p, vol)}
                    >
                      <span className="au-number">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span>
                        <strong>{vol.title}</strong>
                        <small>{vol.file}</small>
                      </span>
                      <em>{status(p, vol, i)}</em>
                      <ChevronRight size={16} />
                    </button>
                  ))}
                </Card>
                <details className="au-details">
                  <summary>Параметры проекта</summary>
                  <p>
                    {p.genre}
                    {p.recipeVersion
                      ? ' · рецепт v' + p.recipeVersion
                      : ''} · {p.source} → {p.target} · {p.units} единицы
                  </p>
                  {p.wishes && <p>{p.wishes}</p>}
                </details>
              </>
            )}
            {view === 'dictionary' && (
              <Card className="au-form-panel">
                <h2>Словарь проекта</h2>
                {Boolean(p.seedEntries?.length) && (
                  <details className="au-details">
                    <summary>
                      Стартовый словарь · {p.seedEntries?.length}
                    </summary>
                    {p.seedEntries?.map((entry) => (
                      <p key={entry.source}>
                        {entry.source} → {entry.target}
                      </p>
                    ))}
                  </details>
                )}
                {p.volumes
                  .filter((_, i) => isUnlocked(p, i))
                  .map((vol) => (
                    <div className="au-file" key={vol.id}>
                      <div>
                        <strong>{vol.title}</strong>
                        <small>
                          {p.source === 'Русский'
                            ? 'Северный предел'
                            : 'Northern Reach'}{' '}
                          → {vol.term || 'ожидает выбора'}
                        </small>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() =>
                          openAuthor(vol.term ? 'impact' : 'term', p.id, vol.id)
                        }
                      >
                        {vol.term ? 'Изменить' : 'Выбрать'}
                      </Button>
                    </div>
                  ))}
              </Card>
            )}
            {view === 'editions' && (
              <Card className="au-form-panel">
                <h2>Издания проекта</h2>
                {p.volumes.map((vol, i) => (
                  <button
                    key={vol.id}
                    disabled={!isUnlocked(p, i)}
                    className={uiMenuItemButton + ' au-rowlink'}
                    onClick={() => flowFor(p, vol)}
                  >
                    <BookOpen size={19} />
                    <span>
                      <strong>{vol.title}</strong>
                      <small>{status(p, vol, i)}</small>
                    </span>
                    <ChevronRight size={18} />
                  </button>
                ))}
              </Card>
            )}
            {view === 'queue' && (
              <Card className="au-form-panel">
                <Badge variant="secondary">Демонстрационная очередь</Badge>
                <h2>Подготовка томов</h2>
                {p.volumes.map((vol, i) => (
                  <div key={vol.id} className="au-file">
                    <span className="au-number">{i + 1}</span>
                    <div>
                      <strong>{vol.title}</strong>
                      <small>
                        {vol.id === v.id
                          ? 'Перевод и проверка фрагментов'
                          : status(p, vol, i)}
                      </small>
                    </div>
                  </div>
                ))}
                <p className="au-muted">
                  До трёх задач одновременно. Для демо перейдите к результату
                  обработки этого тома.
                </p>
                <Button
                  onClick={() => {
                    updateVol({ ...v, phase: 'review' });
                    openAuthor('review', p.id, v.id);
                  }}
                >
                  Показать результат перевода
                </Button>
              </Card>
            )}
            {view in taskTitles && view !== 'queue' && (
              <BookTask
                key={p.id + v.id + view}
                p={p}
                v={v}
                view={view}
                save={updateVol}
                saveProject={updateProject}
              />
            )}
          </>
        )}
      </div>
    </PrototypeShell>
  );
}
