'use client'

import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'

import { useMemo, useState } from 'react'
import {
  demoImport,
  entryKey,
  parseEntries,
  readGlossary,
  saveGlossary,
  seriesName,
  type Entry,
  type Glossary,
} from './config'

export function GlossaryImport({ initial }: { initial: Glossary }) {
  const [current, setCurrent] = useState(initial)
  const [raw, setRaw] = useState('')
  const [replace, setReplace] = useState(false)
  const [decisions, setDecisions] = useState<Record<string, 'old' | 'new'>>({})
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const parsed = useMemo(() => {
    if (!raw.trim()) return { entries: [], message: '' }
    try {
      return { entries: parseEntries(raw), message: '' }
    } catch (e) {
      return {
        entries: [],
        message: e instanceof Error ? e.message : 'Не удалось прочитать файл.',
      }
    }
  }, [raw])
  const currentById = new Map(current.entries.map((row) => [entryKey(row.source), row]))
  const incoming = new Map(parsed.entries.map((row) => [entryKey(row.source), row]))
  const conflicts = parsed.entries.filter((row) => {
    const prev = currentById.get(entryKey(row.source))
    return prev && prev.target !== row.target
  })
  const additions = parsed.entries.filter((row) => !currentById.has(entryKey(row.source))).length
  const matches = parsed.entries.length - conflicts.length - additions
  const removed = replace ? current.entries.filter((row) => !incoming.has(entryKey(row.source))).length : 0
  const ready = parsed.entries.length > 0 && conflicts.every((row) => decisions[entryKey(row.source)])
  function edit(value: string) {
    setRaw(value)
    setDecisions({})
    setStatus('')
    setError('')
  }
  function save() {
    if (!ready) return
    const next = replace ? new Map<string, Entry>() : new Map(currentById)
    for (const [id, entry] of incoming) {
      next.set(id, decisions[id] === 'old' ? currentById.get(id)! : entry)
    }
    try {
      saveGlossary(current.version, [...next.values()])
      const saved = readGlossary()
      setCurrent(saved)
      edit('')
      setStatus(
        'Сохранена версия ' +
          saved.version +
          '. Записей в словаре: ' +
          saved.entries.length +
          '. Импорт завершён, задачи не запускались.',
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сохранить словарь в этом браузере.')
    }
  }
  return (
    <div className="pt-stack">
      <Card className="pt-stack p-5">
        <h2>{seriesName}</h2>
        <span className="pt-muted">
          Русский → Английский · Версия {current.version} · Записей {current.entries.length}
        </span>
        <label className="pt-field">
          Исходный список JSON
          <Textarea
            rows={5}
            spellCheck={false}
            value={raw}
            onChange={(e) => edit(e.target.value)}
            placeholder={'[{"source":"Белая Гряда","target":"White Ridge"}]'}
          />
        </label>
        <div className="ed-actions">
          <Button variant="outline" onClick={() => edit(JSON.stringify(demoImport, null, 2))}>
            Подставить демо-JSON
          </Button>
          {raw && (
            <Button variant="outline" onClick={() => edit('')}>
              Очистить
            </Button>
          )}
        </div>
        {parsed.message && (
          <div role="alert" className="pt-callout">
            {parsed.message}
          </div>
        )}
      </Card>
      {!!parsed.entries.length && (
        <Card className="pt-stack p-5">
          <h2>Сверка записей</h2>
          <fieldset className="ed-choices">
            <legend>Способ импорта</legend>
            <label>
              <input type="radio" name="mode" checked={!replace} onChange={() => setReplace(false)} />{' '}
              Дописать
            </label>
            <label>
              <input type="radio" name="mode" checked={replace} onChange={() => setReplace(true)} /> Заменить
            </label>
          </fieldset>
          <div>
            <div className="pt-row">
              <span>Новые записи</span>
              <strong>{additions}</strong>
            </div>
            <div className="pt-row">
              <span>Совпадения</span>
              <strong>{matches}</strong>
            </div>
            <div className="pt-row">
              <span>Разногласия</span>
              <strong>{conflicts.length}</strong>
            </div>
          </div>
          {replace && (
            <p className="pt-callout">
              После замены в словаре останутся только записи из списка импорта. Будет удалено: {removed}.
            </p>
          )}
          {conflicts.map((row) => {
            const id = entryKey(row.source)
            return (
              <fieldset key={id} className="ed-conflict">
                <legend>{row.source}</legend>
                <label>
                  <input
                    type="radio"
                    name={id}
                    checked={decisions[id] === 'old'}
                    onChange={() => setDecisions({ ...decisions, [id]: 'old' })}
                  />{' '}
                  Оставить в серии — {currentById.get(id)!.target}
                </label>
                <label>
                  <input
                    type="radio"
                    name={id}
                    checked={decisions[id] === 'new'}
                    onChange={() => setDecisions({ ...decisions, [id]: 'new' })}
                  />{' '}
                  Взять из импорта — {row.target}
                </label>
              </fieldset>
            )
          })}
          <div className="ed-actions">
            <Button disabled={!ready} onClick={save}>
              {replace ? 'Заменить словарь' : 'Дописать записи'}
            </Button>
          </div>
        </Card>
      )}
      {status && (
        <Card role="status" className="p-5">
          {status}
        </Card>
      )}
      {error && (
        <p role="alert" className="pt-callout">
          {error}{' '}
          <Button
            variant="outline"
            onClick={() => {
              setCurrent(readGlossary())
              setDecisions({})
              setError('')
            }}
          >
            Обновить версию
          </Button>
        </p>
      )}
      <Card className="p-5">
        <details>
          <summary>Сохранённые записи · {current.entries.length}</summary>
          {current.entries.map((e) => (
            <div className="pt-row" key={entryKey(e.source)}>
              <strong>{e.source}</strong>
              <span>{e.target}</span>
            </div>
          ))}
        </details>
      </Card>
    </div>
  )
}
