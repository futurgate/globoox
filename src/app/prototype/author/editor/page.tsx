'use client'

import { useState, useSyncExternalStore } from 'react'
import { BookOpen, SlidersHorizontal } from 'lucide-react'
import { PrototypeShell, type NavItem } from '../../_components/PrototypeShell'
import { GlossaryImport } from './GlossaryImport'
import { recipes, readRecipe, readGlossary, saveRecipe, type Recipe, type Units } from './config'
import './editor.css'

const nav: NavItem[] = [
  { id: 'recipe', label: 'Рецепты перевода', icon: SlidersHorizontal },
  { id: 'glossary', label: 'Импорт словаря', icon: BookOpen },
]
function subscribe(cb: () => void) {
  window.addEventListener('hashchange', cb)
  return () => window.removeEventListener('hashchange', cb)
}
function subscribeMount() {
  return () => {}
}
function selectedView() {
  return window.location.hash === '#glossary' ? 'glossary' : 'recipe'
}

function RecipeSettings({ initial }: { initial: Recipe }) {
  const [saved, setSaved] = useState(initial)
  const [draft, setDraft] = useState(initial)
  const [tab, setTab] = useState('Основное')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const dirty = JSON.stringify(saved) !== JSON.stringify(draft)
  const set = (change: Partial<Recipe>) => {
    setDraft({ ...draft, ...change })
    setStatus('')
    setError('')
  }
  const canSave = dirty && !!draft.glossaryPrompt.trim() && !!draft.translatePrompt.trim()
  const save = () => {
    try {
      saveRecipe(draft)
      const next = readRecipe(draft.id)
      setSaved(next)
      setDraft(next)
      setError('')
      setStatus(
        'Версия ' + next.version + ' сохранена. Параметры применятся к новым проектам с этим рецептом.',
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сохранить версию рецепта.')
    }
  }
  return (
    <section className="pt-panel pt-stack">
      <div className="pt-tabs" aria-label="Параметры рецепта">
        {['Основное', 'Модели и промпты', 'Проверки'].map((t) => (
          <button key={t} aria-current={tab === t ? 'page' : undefined} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>
      {tab === 'Основное' && (
        <>
          <div className="pt-row">
            <span>Направление</span>
            <strong>
              {draft.source} → {draft.target}
            </strong>
          </div>
          <label className="pt-field">
            Единицы по умолчанию
            <select value={draft.units} onChange={(e) => set({ units: e.target.value as Units })}>
              <option>Метрические</option>
              <option>Оставить как в оригинале</option>
            </select>
          </label>
          <p className="pt-muted">Автор может изменить единицы при настройке проекта.</p>
        </>
      )}
      {tab === 'Модели и промпты' && (
        <div className="pt-grid">
          {(['glossary', 'translate'] as const).map((stage) => {
            const model = stage === 'glossary' ? 'glossaryModel' : 'translateModel'
            const prompt = stage === 'glossary' ? 'glossaryPrompt' : 'translatePrompt'
            return (
              <div className="pt-stack" key={stage}>
                <h2>{stage === 'glossary' ? 'Подготовка словаря' : 'Перевод'}</h2>
                <label className="pt-field">
                  Модель
                  <select value={draft[model]} onChange={(e) => set({ [model]: e.target.value })}>
                    <option>Flash</option>
                    <option>Hydrogen</option>
                  </select>
                </label>
                <label className="pt-field">
                  Шаблон этапа
                  <textarea
                    rows={5}
                    value={draft[prompt]}
                    onChange={(e) => set({ [prompt]: e.target.value })}
                  />
                </label>
              </div>
            )
          })}
        </div>
      )}
      {tab === 'Проверки' && (
        <>
          <label className="pt-row">
            Стилистическая редактура
            <input
              type="checkbox"
              checked={draft.revision}
              onChange={(e) => set({ revision: e.target.checked })}
            />
          </label>
          <label className="pt-row">
            Читательская проверка
            <input
              type="checkbox"
              checked={draft.readerCheck}
              onChange={(e) => set({ readerCheck: e.target.checked })}
            />
          </label>
        </>
      )}
      <div className="ed-actions">
        <button className="pt-btn" disabled={!canSave} onClick={save}>
          Сохранить версию
        </button>
        {dirty && (
          <button
            className="pt-btn secondary"
            onClick={() => {
              setDraft(saved)
              setError('')
            }}
          >
            Отменить изменения
          </button>
        )}
        <span className="pt-badge">Версия {saved.version}</span>
      </div>
      {status && <p role="status">{status}</p>}
      {error && (
        <p role="alert" className="pt-callout">
          {error}{' '}
          <button
            className="pt-btn secondary"
            onClick={() => {
              const current = readRecipe(draft.id)
              setSaved(current)
              setDraft(current)
              setError('')
            }}
          >
            Открыть актуальную версию
          </button>
        </p>
      )}
    </section>
  )
}

export default function EditorPage() {
  const mounted = useSyncExternalStore(
    subscribeMount,
    () => true,
    () => false,
  )
  const active = useSyncExternalStore(subscribe, selectedView, () => 'recipe')
  const [recipe, setRecipe] = useState(recipes[0].id)
  return (
    <PrototypeShell
      role="editor"
      items={nav}
      active={active}
      onSelect={(id) => {
        window.location.hash = id
      }}
      title={active === 'recipe' ? 'Рецепты перевода' : 'Импорт словаря серии'}
      subtitle={
        active === 'recipe'
          ? 'Настройки для новых демонстрационных запусков.'
          : 'Предпросмотр и сохранение записей в этом браузере.'
      }
    >
      <div className="pt-stack">
        {mounted &&
          (active === 'glossary' ? (
            <GlossaryImport initial={readGlossary()} />
          ) : (
            <>
              <label className="pt-panel pt-field">
                Рецепт
                <select value={recipe} onChange={(e) => setRecipe(e.target.value)}>
                  {recipes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.genre} · {r.source} → {r.target}
                    </option>
                  ))}
                </select>
              </label>
              <RecipeSettings key={recipe} initial={readRecipe(recipe)} />
            </>
          ))}
      </div>
    </PrototypeShell>
  )
}
