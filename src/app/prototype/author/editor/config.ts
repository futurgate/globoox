export type Entry = { source: string; target: string }
export type Units = 'Метрические' | 'Оставить как в оригинале'
export type Recipe = {
  id: string
  genre: string
  source: string
  target: string
  version: number
  units: Units
  glossaryModel: string
  translateModel: string
  glossaryPrompt: string
  translatePrompt: string
  revision: boolean
  readerCheck: boolean
}
export type Glossary = { version: number; entries: Entry[] }
export const seriesName = 'Хроники Севера'
export const recipes: Recipe[] = [
  {
    id: 'litrpg',
    genre: 'ЛитРПГ',
    source: 'Русский',
    target: 'Английский',
    version: 3,
    units: 'Метрические',
    glossaryModel: 'Flash',
    translateModel: 'Hydrogen',
    glossaryPrompt:
      'Извлеки из главы новые имена и игровые термины. Сверь их с принятыми решениями серии.',
    translatePrompt:
      'Переводи на английский. Сохраняй голос рассказчика, характер реплик и игровые обозначения.',
    revision: false,
    readerCheck: false,
  },
  {
    id: 'nonfiction',
    genre: 'Нон-фикшн',
    source: 'Английский',
    target: 'Русский',
    version: 1,
    units: 'Оставить как в оригинале',
    glossaryModel: 'Flash',
    translateModel: 'Flash',
    glossaryPrompt: 'Извлеки из главы названия и научные термины. Сохраняй принятую терминологию.',
    translatePrompt: 'Переводи на русский. Сохраняй точность фактов, чисел и ссылок.',
    revision: false,
    readerCheck: true,
  },
]
const originalGlossary: Glossary = {
  version: 3,
  entries: [
    { source: 'Северный предел', target: 'North Frontier' },
    { source: 'Ледяной тракт', target: 'Ice Road' },
    { source: 'Дом Вейна', target: 'House of Vane' },
  ],
}
export const demoImport = [
  { source: 'Северный предел', target: 'Northern Reach' },
  { source: 'Ледяной тракт', target: 'Ice Road' },
  { source: 'Белая Гряда', target: 'White Ridge' },
  { source: 'Каменный мост', target: 'Stone Bridge' },
]
const key = (id: string) => 'globoox:prototype:editor:v1:' + id
function read<T>(id: string, initial: T): T {
  if (typeof window === 'undefined') return initial
  try {
    const raw = window.localStorage.getItem(key(id))
    if (!raw) return initial
    const value = JSON.parse(raw)
    return value && typeof value === 'object' && Number.isInteger(value.version) ? value : initial
  } catch {
    return initial
  }
}
export function readRecipe(id: string): Recipe {
  const base = recipes.find((r) => r.id === id) || recipes[0]
  return read(base.id, base)
}
export function readGlossary() {
  return read('series-north', originalGlossary)
}
export function saveRecipe(recipe: Recipe) {
  if (readRecipe(recipe.id).version !== recipe.version)
    throw Error('Рецепт изменён в другой вкладке. Откройте его заново.')
  localStorage.setItem(key(recipe.id), JSON.stringify({ ...recipe, version: recipe.version + 1 }))
}
export function saveGlossary(previousVersion: number, entries: Entry[]) {
  if (readGlossary().version !== previousVersion)
    throw Error('Словарь изменён в другой вкладке. Загрузите актуальную версию.')
  localStorage.setItem(key('series-north'), JSON.stringify({ version: previousVersion + 1, entries }))
}

// Only public recipe fields are copied into a new mock project.
export function readAuthorRecipe(genre: string, source: string, target: string, seriesTitle?: string) {
  const match = recipes.find((r) => r.genre === genre && r.source === source && r.target === target)
  if (!match) return null
  const { units, version } = readRecipe(match.id)
  const glossary =
    match.id === 'litrpg' && seriesTitle?.trim() === seriesName ? readGlossary().entries : []
  return { units, version, glossary }
}

export function entryKey(value: string) {
  return value.normalize('NFC').trim().toLocaleLowerCase('ru')
}

export function parseEntries(raw: string): Entry[] {
  let value
  try {
    value = JSON.parse(raw)
  } catch {
    throw Error('Проверьте синтаксис JSON.')
  }
  let rows: unknown[]
  if (Array.isArray(value)) rows = value
  else if (
    value &&
    typeof value === 'object' &&
    (Array.isArray(value.terminology) || Array.isArray(value.named_entities))
  ) {
    for (const group of [value.terminology, value.named_entities]) {
      if (group !== undefined && !Array.isArray(group)) {
        throw Error('Поля terminology и named_entities должны содержать массивы записей.')
      }
    }
    rows = [...(value.terminology ?? []), ...(value.named_entities ?? [])]
  } else
    throw Error('Нужен массив пар source / target или объект глоссария с terminology и named_entities.')
  const unique = new Map<string, Entry>()
  rows.forEach((row, i) => {
    const r = row && typeof row === 'object' ? (row as Record<string, unknown>) : {}
    const source = r.source ?? r.source_term ?? r.entity
    const target = r.target ?? r.preferred_translation ?? r.preferred_target
    if (typeof source !== 'string' || !source.trim() || typeof target !== 'string' || !target.trim()) {
      throw Error('В записи ' + (i + 1) + ' нужны исходное слово и перевод.')
    }
    const id = entryKey(source)
    if (unique.has(id) && unique.get(id)?.target !== target.trim()) {
      throw Error('В импортируемом списке два варианта для «' + source.trim() + '». Оставьте один.')
    }
    unique.set(id, { source: source.trim(), target: target.trim() })
  })
  if (!unique.size) throw Error('В списке нет записей для импорта.')
  return [...unique.values()]
}
