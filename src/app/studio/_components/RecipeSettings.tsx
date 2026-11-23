'use client';

import { useEffect, useRef, useState } from 'react';
import { RecipePromptPicker } from './RecipePromptPicker';
import { StudioDraftActions, withStudioDraftGuard } from './StudioDraftActions';
import { PendingText } from './RequestFeedback';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import IOSSettingsRow from '@/components/ui/ios-settings-row';
import { CopyableTextarea } from '@/components/ui/copy-text';
import { listPersonalPrompts, type PersonalPrompt } from '@/lib/translationPromptVariants';
import { studioErrorMessage, studioFetch } from '@/lib/studioFetch';
import { omitEmptyValues, recipeEndpoint, recipeGenres, recipeUnits, recipeSourceNames,
  type RecipeLocator, type RecipeSettings, type RecipeValues } from '@/lib/studioRecipe';
import { bookGet, useBookData } from './bookRequests';

interface EditorProps {
  locator: RecipeLocator;
  ownerId: string;
  admin: boolean;
  models?: readonly string[];
  variants?: readonly PersonalPrompt[];
  onPromptSaved?: (item: PersonalPrompt) => void;
  onResolved?: (settings: RecipeSettings) => void;
  onReadyToRun?: (ready: boolean) => void;
}

function previousBrief(owner: string, book: string, lang: string) {
  try {
    const raw = localStorage.getItem(['globoox','translation-brief','v1',owner,book,lang].join(':'));
    if (!raw) return null;
    const old = JSON.parse(raw);
    const units: Record<string, string> = { imperial: 'us', preserve: 'keep', metric: 'metric' };
    const genre = recipeGenres.find(g => g.id === old.genre)?.id;
    const values = omitEmptyValues({ wishes: typeof old.wishes === 'string' ? old.wishes : '', units: units[old.units] });
    return genre || Object.keys(values).length ? { genre, values } : null;
  } catch { return null; }
}

function storedGenre(data: RecipeSettings) {
  return data.genreInherited && data.scope === 'book' ? '' : data.genre;
}

function inheritanceLabel(settings: RecipeSettings, field: keyof RecipeValues) {
  const source = settings.inheritedSources?.[field];
  return source === 'project' ? 'Из проекта' : source === 'series' ? 'Из серии' : source === 'account' ? 'Из аккаунта' : 'По рецепту';
}

export function ModelChoice({ label, value, inherited, inheritedLabel = 'По рецепту', models, onChange, disabled }: {
  label: string; value?: string; inherited?: string; inheritedLabel?: string; models: readonly string[]; onChange: (v: string) => void; disabled?: boolean;
}) {
  const ids = [...new Set([value, inherited, ...models].filter((id): id is string => Boolean(id)))];
  return <IOSSettingsRow label={label} value={value || ''} onChange={onChange} disabled={disabled}
    options={[{ id: '', label: inherited ? inheritedLabel + ' · ' + inherited : inheritedLabel }, ...ids.map(id => ({ id, label: id }))]} />;
}

export function RecipeEditor({ locator, ownerId, admin, models, variants, onPromptSaved, onResolved, onReadyToRun }: EditorProps) {
  const url = recipeEndpoint(locator);
  const [reload, setReload] = useState(0);
  const [settings, setSettings] = useState<RecipeSettings | null>(null);
  const [values, setValues] = useState<RecipeValues>({});
  const [genre, setGenre] = useState('');
  const [technical, setTechnical] = useState(locator.scope === 'account');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [working, setWorking] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [old, setOld] = useState<ReturnType<typeof previousBrief>>(null);
  const [ownPrompts, setOwnPrompts] = useState<PersonalPrompt[]>([]);
  const [promptsLoading, setPromptsLoading] = useState(false);
  const [promptError, setPromptError] = useState('');
  const saveController = useRef<AbortController | null>(null);
  const [promptReload, retryPrompts] = useState(0);
  const getOptions = admin && technical;
  const modelList = useBookData<{ models: string[] }>(getOptions && !models ? '/api/admin/models' : null, promptReload);
  const modelOptions = models ?? modelList?.data?.models ?? [];
  const promptOptions = variants ?? ownPrompts;
  useEffect(() => {
    const c = new AbortController();
    setError(''); setNotice(''); setConflict(false); setSettings(null);
    bookGet<RecipeSettings>(url, c.signal).then(data => {
      if (c.signal.aborted) return;
      if (!data.values || !data.effective || typeof data.revision !== 'number') throw Error('Сервер не подтвердил параметры перевода.');
      setSettings(data); setValues(data.values); setGenre(storedGenre(data)); onResolved?.(data);
      setOld(data.scope === 'book' && data.scopeId && !data.revision ? previousBrief(ownerId, data.scopeId, data.targetLang) : null);
    }).catch(e => { if (!c.signal.aborted) setError(studioErrorMessage(e, 'Не удалось загрузить параметры перевода.')); });
    return () => { c.abort(); saveController.current?.abort(); };
  }, [url, ownerId, reload, onResolved]);
  useEffect(() => {
    if (!getOptions || variants) return;
    const c = new AbortController();
    setPromptsLoading(true);
    listPersonalPrompts(c.signal).then(items => { if (!c.signal.aborted) { setOwnPrompts(items); setPromptError(''); } })
      .catch(() => { if (!c.signal.aborted) setPromptError('Не удалось загрузить личные шаблоны.'); })
      .finally(() => { if (!c.signal.aborted) setPromptsLoading(false); });
    return () => c.abort();
  }, [getOptions, variants, promptReload]);
  const optionsLoading = (!variants && promptsLoading) || (!models && (!modelList || modelList.refreshing));
  function savedPrompt(item: PersonalPrompt) {
    setOwnPrompts(current => [...current.filter(v => v.id !== item.id), item]);
    onPromptSaved?.(item);
  }
  function change(field: keyof RecipeValues, value: string) {
    setNotice(''); setError(''); setValues(current => omitEmptyValues({ ...current, [field]: value }));
  }
  async function save() {
    if (!settings || saveController.current || conflict) return;
    const c = new AbortController();
    saveController.current = c; setWorking(true); setError(''); setNotice('');
    try {
      const response = await studioFetch(url, { method: 'PUT', signal: c.signal,
        headers: { 'Content-Type': 'application/json', 'X-Workspace-Account': ownerId },
        body: JSON.stringify({ ...locator, genre: genre || undefined, ...(locator.scope === 'book' && !genre && { inheritGenre: true }), values: omitEmptyValues(values), revision: settings.revision }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 409) setConflict(true);
        throw Error(studioErrorMessage(data.message || data.error, 'Не удалось сохранить параметры.', response.status));
      }
      if (!data.effective || typeof data.revision !== 'number') throw Error('Сервер не подтвердил сохранение параметров.');
      if (!c.signal.aborted) {
        setValues(data.values); setSettings(data); setGenre(storedGenre(data)); setOld(null); setNotice('Параметры сохранены.'); onResolved?.(data);
      }
    } catch (e) { if (!c.signal.aborted) setError(studioErrorMessage(e, 'Не удалось сохранить параметры.')); }
    finally { saveController.current = null; if (!c.signal.aborted) setWorking(false); }
  }
  const title = locator.scope === 'account' ? 'Параметры рецепта' : locator.scope === 'book' ? 'Параметры книги' : locator.scope === 'project' ? 'Параметры проекта' : 'Параметры серии';
  const changed = settings && (genre !== storedGenre(settings) ||
    (Object.keys({ ...settings.values, ...values }) as (keyof RecipeValues)[]).some(key => values[key] !== settings.values[key]));
  const unitName = recipeUnits.find(item => item.id === settings?.inherited?.units)?.label;
  useEffect(() => {
    onReadyToRun?.(Boolean(settings && !changed && !working && !conflict && !error));
    return () => onReadyToRun?.(false);
  }, [onReadyToRun, settings, changed, working, conflict, error]);
  return <Card className="p-5 gap-3">
    <h3>{title}</h3>
    {error && <p role="alert" className="pt-callout">{error}</p>}
    {!settings && !error && <p role="status">Загружаем параметры…</p>}
    {((!settings && error) || conflict) && <Button className="self-start" variant="outline" onClick={() => setReload(n => n + 1)}>Загрузить сохранённые параметры</Button>}
    {settings && <>
      <p className="pt-muted">{locator.sourceLang} → {locator.targetLang} · {locator.scope === 'account' ? 'Ваши настройки для новых запусков книг этого жанра' : 'Для новых запусков перевода'}</p>
      {old && <div><Button variant="outline" onClick={() => { setValues(v => ({ ...v, ...old.values })); if (old.genre) setGenre(old.genre); setOld(null); }}>Подставить прежний черновик с этого устройства</Button></div>}
      {settings.genreSource === 'suggestion' && locator.scope === 'book' && <p className="pt-muted text-sm">Жанр предложен по данным книги. При сохранении будет использован ваш выбор.</p>}
      {locator.scope !== 'account' && <IOSSettingsRow label="Жанр" value={genre}
        options={settings.inheritedGenre ? [{ id: '', label: 'Наследовать · ' + (recipeGenres.find(g => g.id === settings.inheritedGenre)?.label ?? settings.inheritedGenre) }, ...recipeGenres] : recipeGenres} onChange={v => { setGenre(v); setNotice(''); }} disabled={working}/>}
      <IOSSettingsRow label="Единицы измерения" value={values.units ?? ''} onChange={v => change('units',v)} disabled={working}
        options={[{ id:'', label: unitName ? inheritanceLabel(settings,'units') + ' · ' + unitName : inheritanceLabel(settings,'units') }, ...recipeUnits]}/>
      <CopyableTextarea fieldClassName="pt-field" label="Указания по стилю перевода" aria-describedby="studio-wishes-help" rows={3} maxLength={4000} value={values.wishes ?? ''} disabled={working}
        placeholder={settings.inherited?.wishes || 'Например, сохранить иронию рассказчика и обращения на «вы»'} onChange={e => change('wishes', e.target.value)}/>
      <p id="studio-wishes-help" className="pt-muted text-sm">
        В новых запусках эти указания получит модель при составлении глоссария и переводе текста.
        {settings.inherited?.wishes && ' Оставьте поле пустым, чтобы использовать унаследованные указания.'}
      </p>
      {admin && <details open={technical} onToggle={e => setTechnical(e.currentTarget.open)}>
        <summary className="cursor-pointer font-medium">Модели и шаблоны этапов</summary>
        {technical && <div className="grid gap-4 pt-3">
          {optionsLoading && <PendingText>Загружаем модели и шаблоны этапов…</PendingText>}
          {!optionsLoading && (promptError || modelList?.error) && <p role="alert">{promptError || modelList?.error} <Button variant="ghost" onClick={() => retryPrompts(n => n+1)}>Повторить</Button></p>}
          {(['glossary','translate'] as const).map(stage => {
            const modelField = stage === 'glossary' ? 'glossaryModel' : 'translateModel';
            const promptField = stage === 'glossary' ? 'glossaryPromptId' : 'translatePromptId';
            const choices = promptOptions.filter(p => p.template === settings.templates?.[stage] && !p.deletedAt);
            const inherited = choices.find(p => p.id === settings.inherited?.[promptField]);
            const source = settings.sources?.[modelField];
            return <div className="grid gap-2 border-t pt-3" key={stage}>
              <h4 className="font-medium">{stage === 'glossary' ? 'Глоссарий' : 'Перевод текста'}</h4>
              <ModelChoice label={stage === 'glossary' ? 'Модель глоссария' : 'Модель перевода'} value={values[modelField]} inherited={settings.inherited?.[modelField]}
                inheritedLabel={inheritanceLabel(settings,modelField)} models={modelOptions} disabled={working} onChange={v => change(modelField, v)}/>
              <RecipePromptPicker ownerId={ownerId} label={stage === 'glossary' ? 'Шаблон глоссария' : 'Шаблон перевода'}
                name={settings.templates?.[stage]} value={values[promptField] ?? ''} inherited={inherited} inheritedLabel={inheritanceLabel(settings,promptField)} choices={choices}
                onChange={v => change(promptField, v)} onSaved={savedPrompt} disabled={working}/>
              {source && !changed && <p className="pt-muted text-sm">Модель для запуска · {settings.effective[modelField]} · {recipeSourceNames[source]}</p>}
            </div>;
          })}
        </div>}
      </details>}
      {locator.scope === 'book' && settings.projectId && (genre !== '' || Object.keys(values).length > 0) &&
        <Button variant="outline" className="self-start" disabled={working} onClick={() => {
          setGenre(''); setValues({}); setError(''); setNotice('');
        }}>Вернуть значения проекта</Button>}
      {!changed && settings.genreSource === 'suggestion' && !settings.revision &&
        <Button variant="outline" disabled={working || conflict} onClick={() => { if (locator.scope === 'book' && !genre) setGenre(settings.genre); else void save(); }}>Принять предложенный жанр</Button>}
      <StudioDraftActions dirty={Boolean(changed)} busy={working} disabled={conflict}
        saveLabel="Сохранить параметры" onSave={() => void save()} onReset={() => {
          setValues(settings.values); setGenre(storedGenre(settings)); setError(''); setNotice('');
          if (conflict) setReload(n => n + 1);
        }}/>
      {notice && <span role="status" className="pt-muted">{notice}</span>}
    </>}
  </Card>;
}

interface CatalogRecipe { id: string; name: string; genre: string; sourceLang: string; targetLang: string }
export function AccountRecipes({ ownerId, variants, onPromptSaved }: {
  ownerId: string; variants?: readonly PersonalPrompt[]; onPromptSaved: (item: PersonalPrompt) => void;
}) {
  const [selected, setSelected] = useState('');
  const [version, setVersion] = useState(0);
  const catalog = useBookData<{ recipes: CatalogRecipe[] }>('/api/studio/recipes', version);
  const recipes = catalog?.data?.recipes ?? [];
  const recipe = recipes.find(r => r.id === selected) ?? recipes[0];
  if (catalog?.error) return <p role="alert">{catalog.error} <Button variant="ghost" onClick={() => setVersion(n => n+1)}>Загрузить рецепты</Button></p>;
  if (!recipe) return <p role="status">{catalog ? 'В каталоге пока нет рецептов.' : 'Загружаем рецепты…'}</p>;
  return <section className="pt-stack">
    <IOSSettingsRow label="Базовый рецепт" value={recipe.id} options={recipes.map(r => ({ id:r.id, label:r.name }))} onChange={value => withStudioDraftGuard(() => setSelected(value))}/>
    <RecipeEditor key={recipe.id} ownerId={ownerId} admin variants={variants} onPromptSaved={onPromptSaved}
      locator={{ scope: 'account', genre: recipe.genre, sourceLang: recipe.sourceLang, targetLang: recipe.targetLang }}/>
  </section>;
}
