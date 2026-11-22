'use client'

import { Card } from '@/components/ui/card'
import IOSItemsStack from '@/components/ui/ios-items-stack'
import IOSSettingsRow from '@/components/ui/ios-settings-row'
import { CopyableTextarea } from '@/components/ui/copy-text'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

import { useState, useSyncExternalStore } from 'react'
import { BookOpen, SlidersHorizontal } from 'lucide-react'
import { PrototypeShell, type NavItem } from '../../_components/PrototypeShell'
import { SectionNav } from '../../_components/SectionNav'
import { GlossaryImport } from './GlossaryImport'
import { recipes, readRecipe, readGlossary, saveRecipe, unitOptions, type Recipe, type Units } from './config'
import './editor.css'

const tabs = ['Основное', 'Модели и промпты', 'Проверки'].map((label) => ({ id: label, label }))

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
    <Card className="pt-stack p-5">
      <SectionNav label="Параметры рецепта" items={tabs} active={tab} onSelect={setTab} />
      {tab === 'Основное' && (
        <>
          <div className="pt-row">
            <span>Направление</span>
            <strong>
              {draft.source} → {draft.target}
            </strong>
          </div>
          <IOSItemsStack>
            <IOSSettingsRow
              label="Единицы по умолчанию"
              value={draft.units}
              options={unitOptions}
              onChange={(units) => set({ units: units as Units })}
            />
          </IOSItemsStack>
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
                <IOSItemsStack>
                  <IOSSettingsRow
                    label={stage === 'glossary' ? 'Модель словаря' : 'Модель перевода'}
                    value={draft[model]}
                    options={['Flash', 'Hydrogen'].map((label) => ({ id: label, label }))}
                    onChange={(value) => set({ [model]: value })}
                  />
                </IOSItemsStack>
                <CopyableTextarea fieldClassName="pt-field" label="Шаблон этапа"
                  rows={5}
                  value={draft[prompt]}
                  onChange={(e) => set({ [prompt]: e.target.value })}
                />
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
        <Button disabled={!canSave} onClick={save}>
          Сохранить версию
        </Button>
        {dirty && (
          <Button
            variant="outline"
            onClick={() => {
              setDraft(saved)
              setError('')
            }}
          >
            Отменить изменения
          </Button>
        )}
        <Badge variant="secondary">Версия {saved.version}</Badge>
      </div>
      {status && <p role="status">{status}</p>}
      {error && (
        <p role="alert" className="pt-callout">
          {error}{' '}
          <Button
            variant="outline"
            onClick={() => {
              const current = readRecipe(draft.id)
              setSaved(current)
              setDraft(current)
              setError('')
            }}
          >
            Открыть актуальную версию
          </Button>
        </p>
      )}
    </Card>
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
              <IOSItemsStack>
                <IOSSettingsRow
                  label="Рецепт"
                  value={recipe}
                  options={recipes.map((r) => ({
                    id: r.id,
                    label: r.genre + ' · ' + r.source + ' → ' + r.target,
                  }))}
                  onChange={setRecipe}
                />
              </IOSItemsStack>
              <RecipeSettings key={recipe} initial={readRecipe(recipe)} />
            </>
          ))}
      </div>
    </PrototypeShell>
  )
}
