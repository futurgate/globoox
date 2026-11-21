export type RecipeScope = 'account' | 'series' | 'book'
export type RecipeLocator = { scope: RecipeScope; scopeId?: string; sourceLang: string; targetLang: string; genre?: string }
export type RecipeValues = Partial<Record<'glossaryModel' | 'translateModel' | 'glossaryPromptId' | 'translatePromptId' | 'wishes' | 'units', string>>
export type RecipeSource = RecipeScope | 'default' | 'run'
export type RecipeSettings = RecipeLocator & {
  genre: string
  genreSource?: string
  values: RecipeValues
  inherited: RecipeValues
  effective: RecipeValues
  sources: Partial<Record<keyof RecipeValues, RecipeSource>>
  inheritedSources: Partial<Record<keyof RecipeValues, RecipeSource>>
  templates: { glossary?: string; translate?: string }
  revision: number
}

export const recipeGenres = [
  { id: 'litrpg', label: 'ЛитРПГ' }, { id: 'nonfiction', label: 'Нон-фикшн' }, { id: 'other', label: 'Другой жанр' },
]
export const recipeUnits = [
  { id: 'keep', label: 'Как в оригинале' }, { id: 'metric', label: 'Метрические' }, { id: 'us', label: 'Американские' },
]
export const recipeSourceNames: Record<RecipeSource, string> = {
  default: 'базовый рецепт', account: 'мой аккаунт', series: 'серия', book: 'книга', run: 'этот запуск',
}

export function recipeEndpoint(locator: RecipeLocator) {
  const params = new URLSearchParams({ scope: locator.scope, sourceLang: locator.sourceLang, targetLang: locator.targetLang })
  if (locator.scopeId) params.set('scopeId', locator.scopeId)
  if (locator.genre) params.set('genre', locator.genre)
  return '/api/studio/recipe-settings?' + params
}

export function omitEmptyValues(values: RecipeValues): RecipeValues {
  return Object.fromEntries(Object.entries(values).filter(([, value]) => typeof value === 'string' && value.trim()))
}

export type RunStageState = { status: 'running' | 'done' | 'stopped' | 'error'; attempt: number; startedAt: string; finishedAt?: string | null }
export type StudioRun = {
  id: string; groupId?: string; seriesId?: string | null; createdAt: string; bookId: string; operation: 'glossary' | 'translate' | 'series';
  stages: { glossary?: RunStageState; translate?: RunStageState }
}
export function runsEndpoint(bookId: string, lang: string) {
  return '/api/studio/recipe-runs?' + new URLSearchParams({ bookId, targetLang: lang })
}

export interface FrozenRecipe {
  units: string; wishes: string; recipeId: string;
  glossary: { model: string; prompt: string; template: string };
  translate: { model: string; prompt: string; template: string };
  sources: Partial<Record<'translateModel' | 'glossaryModel', RecipeSource>>;
  options?: { useGlossary?: boolean; fresh?: boolean; seedFromBookId?: string; seedStarterGenre?: string };
}

export function runEndpoint(bookId: string, lang: string, runId: string) {
  return '/api/studio/recipe-run?' + new URLSearchParams({ bookId, targetLang: lang, runId })
}

// A newer series run may also have written the book. Only the most recent
// applicable run can be resumed from a manual stage card.
export function resumableStage(runs: readonly StudioRun[], stage: 'glossary' | 'translate') {
  const latest = runs.find(run => run.operation === stage || run.operation === 'series')
  const status = latest?.stages?.[stage]?.status
  return latest?.operation === stage && (status === 'stopped' || status === 'error') ? latest.id : undefined
}
