'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Loader2,
  Play,
  Plus,
  X,
  ShieldAlert,
  RefreshCw,
  Download,
  Trash2,
  Maximize2,
  Sparkles,
  Copy,
  Check,
  GitCompare,
  BookOpen,
  Upload as UploadIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import PageHeader from '@/components/ui/PageHeader';
import IOSDialog from '@/components/ui/ios-dialog';
import UploadBookModal from '@/components/UploadBookModal';
import { useAuth } from '@/lib/hooks/useAuth';
import {
  runTranslationPlayground,
  fetchPlaygroundModels,
  fetchTranslationPrompt,
  runFictionFlowPlaygroundStream,
  fetchFictionFlowPrompts,
  generateFictionFlowPrompt,
  fetchBooks,
  fetchChapters,
  fetchContent,
  type PlaygroundResult,
  type PlaygroundResponse,
  type PlaygroundPromptVariant,
  type PlaygroundMode,
  type FictionFlowResponse,
  type FictionFlowResult,
  type FictionFlowRevisionBlock,
  type ApiBook,
  type ApiChapter,
  type ContentBlock,
} from '@/lib/api';

const LANGS = ['EN', 'FR', 'ES', 'RU'] as const;
// Fiction targets the playground offers. EN/FR ship built-in translate prompts
// (Russian source). RU is available in the full-flow tester too — there is no
// built-in fiction translate prompt into Russian yet, so the translate-stage
// editor seeds blank and the admin types their own; glossary/revision prompts are
// language-parameterised and work as-is.
const FICTION_LANGS = ['EN', 'FR', 'RU'] as const;

// The playground's stage selector. 'flow' is a page-local tab (a separate
// endpoint that chains all fiction stages), not a translation-playground mode.
type Tab = PlaygroundMode | 'flow';

const MODES: { id: Tab; label: string; blurb: string }[] = [
  {
    id: 'translate',
    label: 'Translate',
    blurb:
      'Compare how models and system prompts translate the same passage via the real production translate flow, optionally scored by the MQM judge.',
  },
  {
    id: 'glossary',
    label: 'Glossary',
    blurb:
      'Test the fiction glossary / style-bible generation prompt: feed a chapter (and the glossary built so far) and compare the merged JSON each model emits.',
  },
  {
    id: 'revision',
    label: 'Revision',
    blurb:
      'Test the fiction stylistic-revision prompt: feed source + machine-translated draft segments and compare how each model polishes the draft.',
  },
  {
    id: 'flow',
    label: 'Full flow',
    blurb:
      'Run the whole fiction pipeline end-to-end (glossary → translate → revision) on one chapter, per model, with a custom prompt for each stage.',
  },
];

// Placeholders each mode fills at run time — shown in the prompt-variant help.
const MODE_PLACEHOLDERS: Record<Tab, string[]> = {
  translate: ['{{LANGUAGE}}', '{{SOURCE_TEXT}}', '{{CONTEXT_SECTION}}'],
  glossary: ['{SOURCE_LANG}', '{TARGET_LANG}', '{EXISTING_GLOSSARY}', '{SOURCE_TEXT}'],
  revision: [
    '{TARGET_LANGUAGE}',
    '{GLOSSARY}',
    '{PRECEDING_CONTEXT}',
    '{FOLLOWING_CONTEXT}',
    '{SOURCE_NUMBERED}',
    '{DRAFT_NUMBERED}',
  ],
  flow: [],
};

// Full-flow stage editors: one custom prompt per pipeline stage.
const FLOW_STAGES: { key: 'glossary' | 'translate' | 'revision'; label: string; placeholders: string }[] = [
  { key: 'glossary', label: '1 · Glossary prompt', placeholders: '{SOURCE_LANG} {TARGET_LANG} {EXISTING_GLOSSARY} {SOURCE_TEXT}' },
  { key: 'translate', label: '2 · Translate prompt', placeholders: '{SOURCE_TEXT} {GLOSSARY}' },
  { key: 'revision', label: '3 · Revision prompt', placeholders: '{TARGET_LANGUAGE} {GLOSSARY} {SOURCE_NUMBERED} {DRAFT_NUMBERED}' },
];

const VARIANT_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
const MAX_VARIANTS = 6;

interface PromptVariantDraft {
  label: string;
  template: string; // blank = production default
}

function defaultVariant(i: number): PromptVariantDraft {
  return { label: `Variant ${VARIANT_LETTERS[i] ?? i + 1}`, template: '' };
}

// The model chips are discovered at runtime from GET /api/admin/models (the
// backend lists whatever the active provider — Vertex or AI Studio — exposes),
// so a newly-released Gemini text model appears here automatically. This static
// list is only a fallback shown until discovery resolves or if it fails.
const FALLBACK_MODELS = [
  'gemini-3.5-flash',
  'gemini-3.1-pro-preview',
  'gemini-2.5-pro',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
];

// Pre-selected on first load (intersected with what's actually available).
const PREFERRED_SELECTION = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-3.5-flash'];

function fmtCost(v?: number | null): string {
  if (v == null) return '—';
  return v < 0.01 ? `$${v.toFixed(5)}` : `$${v.toFixed(4)}`;
}

function scoreColor(overall: number): string {
  if (overall >= 85) return 'text-emerald-600 dark:text-emerald-400';
  if (overall >= 70) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

/** A content block's plain source text, or null for non-text blocks (image/hr). */
function blockToSourceText(b: ContentBlock): string | null {
  switch (b.type) {
    case 'paragraph':
    case 'heading':
    case 'quote':
      return b.text;
    case 'list':
      return b.items.join('\n');
    default:
      return null; // image, hr — no source text
  }
}

/**
 * Assemble a chapter's source text from its content blocks the way the playground
 * expects: ordered by position, one block per paragraph, blocks separated by a
 * blank line. (fetchContent without a lang returns the original/source text.)
 */
function assembleChapterSource(blocks: ContentBlock[]): string {
  return [...blocks]
    .sort((a, b) => a.position - b.position)
    .map(blockToSourceText)
    .filter((t): t is string => t != null && t.trim().length > 0)
    .join('\n\n');
}

export default function TranslationPlaygroundPage() {
  const router = useRouter();
  const { isAdmin, loading: authLoading, isAuthenticated } = useAuth();

  const [mode, setMode] = useState<Tab>('translate');
  const [sourceText, setSourceText] = useState('');
  const [sourceLanguage, setSourceLanguage] = useState<string>('EN');
  const [targetLanguage, setTargetLanguage] = useState<string>('RU');
  const [models, setModels] = useState<string[]>(PREFERRED_SELECTION);
  const [customModel, setCustomModel] = useState('');
  const [judge, setJudge] = useState(true);
  const [judgeModel, setJudgeModel] = useState('gemini-2.5-flash');
  const [reference, setReference] = useState('');

  // Fiction-mode inputs.
  const [existingGlossary, setExistingGlossary] = useState('{}'); // glossary mode
  const [draftText, setDraftText] = useState(''); // revision mode: machine-translated draft
  const [glossary, setGlossary] = useState(''); // revision mode: flattened glossary block (optional)
  const [precedingContext, setPrecedingContext] = useState('');
  const [followingContext, setFollowingContext] = useState('');
  // Blocks per Pass-2 call. Shared by revision stage + flow modes (both feed the
  // revision stage). Blank → backend default (12). Prod is fixed at 12.
  const [revisionBatchSize, setRevisionBatchSize] = useState('12');

  // ── "Load from book" picker: upload / pick a book + chapters → source text ──
  const [bookLoaderOpen, setBookLoaderOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [pickerBooks, setPickerBooks] = useState<ApiBook[]>([]);
  const [pickerBooksLoading, setPickerBooksLoading] = useState(false);
  const [pickBookId, setPickBookId] = useState('');
  const [pickerChapters, setPickerChapters] = useState<ApiChapter[]>([]);
  const [pickerChaptersLoading, setPickerChaptersLoading] = useState(false);
  const [selectedChapterIds, setSelectedChapterIds] = useState<string[]>([]);
  const [chapterLoadError, setChapterLoadError] = useState<string | null>(null);
  const [loadingSource, setLoadingSource] = useState(false);

  // Full-flow (end-to-end) inputs — one editable prompt per pipeline stage.
  const [flowUseGlossary, setFlowUseGlossary] = useState(true);
  const [flowExistingGlossary, setFlowExistingGlossary] = useState('{}');
  const [flowPrompts, setFlowPrompts] = useState<{ glossary: string; translate: string; revision: string }>({
    glossary: '',
    translate: '',
    revision: '',
  });
  // Per-stage sampling temperature as raw strings; blank → model default for that stage.
  const [flowTemperatures, setFlowTemperatures] = useState<{ glossary: string; translate: string; revision: string }>({
    glossary: '',
    translate: '',
    revision: '',
  });
  const [flowLoadingPrompts, setFlowLoadingPrompts] = useState(false);
  // Which stage prompt is currently being auto-generated (null = none).
  const [flowGenerating, setFlowGenerating] = useState<'glossary' | 'translate' | 'revision' | null>(null);
  const [flowRunning, setFlowRunning] = useState(false);
  const [flowResponse, setFlowResponse] = useState<FictionFlowResponse | null>(null);
  // Live progress while the flow streams: completed stages / total stages.
  const [flowProgress, setFlowProgress] = useState<{ done: number; total: number } | null>(null);

  // Switching stage resets stale results and, for fiction stages, pins the
  // target to the supported RU→EN/FR coverage.
  const changeMode = (m: Tab) => {
    setMode(m);
    setResponse(null);
    setFlowResponse(null);
    setError(null);
    if (m !== 'translate') {
      let nextTarget = targetLanguage;
      if (!FICTION_LANGS.includes(targetLanguage as (typeof FICTION_LANGS)[number])) {
        nextTarget = 'EN';
        setTargetLanguage('EN');
      }
      // Fiction source is Russian by default; when translating INTO Russian the
      // source can't also be RU, so fall back to EN.
      setSourceLanguage(nextTarget === 'RU' ? 'EN' : 'RU');
    }
  };

  // System-prompt variants to compare. A blank template = production default.
  const [variants, setVariants] = useState<PromptVariantDraft[]>([defaultVariant(0)]);
  const [loadingPromptIdx, setLoadingPromptIdx] = useState<number | null>(null);
  const [promptError, setPromptError] = useState<string | null>(null);

  // Full-screen viewer for reading long prompts / source text comfortably.
  const [viewer, setViewer] = useState<{ title: string; content: string } | null>(null);
  const openViewer = (title: string, content: string) => setViewer({ title, content });

  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<PlaygroundResponse | null>(null);

  // Provider-discovered model list (falls back to the static list until loaded).
  const [availableModels, setAvailableModels] = useState<string[]>(FALLBACK_MODELS);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsMeta, setModelsMeta] = useState<{ provider: string; fallback?: boolean } | null>(null);

  const loadModels = async (refresh = false) => {
    setModelsLoading(true);
    try {
      const res = await fetchPlaygroundModels();
      if (res.models.length) {
        setAvailableModels(res.models);
        setModelsMeta({ provider: res.provider, fallback: res.fallback });
        // On first load, keep only preferred picks that actually exist.
        if (!refresh) {
          setModels((prev) => {
            const preferred = PREFERRED_SELECTION.filter((m) => res.models.includes(m));
            return preferred.length ? preferred : prev.filter((m) => res.models.includes(m));
          });
        }
      }
    } catch {
      // Keep the static fallback list already in state.
      setModelsMeta({ provider: 'unknown', fallback: true });
    } finally {
      setModelsLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) loadModels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const toggleModel = (m: string) => {
    setModels((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));
  };

  const addCustomModel = () => {
    const m = customModel.trim();
    if (m && !models.includes(m)) setModels((prev) => [...prev, m]);
    setCustomModel('');
  };

  // ── Prompt variants ─────────────────────────────────────────────────────────
  const updateVariant = (idx: number, patch: Partial<PromptVariantDraft>) => {
    setVariants((prev) => prev.map((v, i) => (i === idx ? { ...v, ...patch } : v)));
  };

  const addVariant = () => {
    setVariants((prev) => (prev.length >= MAX_VARIANTS ? prev : [...prev, defaultVariant(prev.length)]));
  };

  const removeVariant = (idx: number) => {
    setVariants((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)));
  };

  // Seed a variant with the exact production prompt for the current target
  // language, so tweaks start from what the live flow actually ships.
  const loadProdPrompt = async (idx: number) => {
    setLoadingPromptIdx(idx);
    setPromptError(null);
    try {
      const stage = mode === 'glossary' || mode === 'revision' ? mode : undefined;
      const res = await fetchTranslationPrompt(targetLanguage, stage);
      updateVariant(idx, { template: res.template });
    } catch (e: unknown) {
      setPromptError(e instanceof Error ? e.message : 'Failed to load production prompt');
    } finally {
      setLoadingPromptIdx(null);
    }
  };

  const canRun =
    mode !== 'flow' &&
    sourceText.trim().length > 0 &&
    models.length > 0 &&
    !running &&
    (mode !== 'revision' || draftText.trim().length > 0);
  const canRunFlow = mode === 'flow' && sourceText.trim().length > 0 && models.length > 0 && !flowRunning;
  const cellCount = models.length * variants.length;

  const handleRun = async () => {
    // canRun already excludes 'flow', so mode narrows to a translation-playground mode here.
    if (!canRun) return;
    setRunning(true);
    setError(null);
    setResponse(null);
    try {
      const promptVariants: PlaygroundPromptVariant[] = variants.map((v) => ({
        label: v.label,
        template: v.template,
      }));
      const res = await runTranslationPlayground({
        mode,
        sourceText: sourceText.trim(),
        targetLanguage,
        models,
        promptVariants,
        // translate: source lang is a judge hint; glossary: it's {SOURCE_LANG}.
        ...(mode !== 'revision' ? { sourceLanguage } : {}),
        // judge: translate (non-fiction prompt) or revision (fiction prompt by blocks)
        ...(mode === 'translate' || mode === 'revision'
          ? { judge, judgeModel, ...(mode === 'translate' ? { reference: reference.trim() || undefined } : {}) }
          : {}),
        // glossary-only
        ...(mode === 'glossary' ? { existingGlossary: existingGlossary.trim() || '{}' } : {}),
        // revision-only
        ...(mode === 'revision'
          ? {
              draftText: draftText.trim(),
              glossary: glossary.trim() || undefined,
              precedingContext: precedingContext.trim() || undefined,
              followingContext: followingContext.trim() || undefined,
              batchSize: parseBatchSize(revisionBatchSize),
            }
          : {}),
      });
      setResponse(res);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setRunning(false);
    }
  };

  // ── Full flow ─────────────────────────────────────────────────────────────
  // Seed all three stage editors from the live production prompts in one call.
  const loadFlowPrompts = async () => {
    setFlowLoadingPrompts(true);
    setPromptError(null);
    try {
      const res = await fetchFictionFlowPrompts(targetLanguage, flowUseGlossary);
      setFlowPrompts({ glossary: res.glossary, translate: res.translate, revision: res.revision });
    } catch (e: unknown) {
      setPromptError(e instanceof Error ? e.message : 'Failed to load production prompts');
    } finally {
      setFlowLoadingPrompts(false);
    }
  };

  const updateFlowPrompt = (stage: 'glossary' | 'translate' | 'revision', value: string) => {
    setFlowPrompts((prev) => ({ ...prev, [stage]: value }));
  };

  // Auto-draft a prompt for this stage by LLM-adapting an existing-language
  // prompt to the current target language. Useful when the target (e.g. RU) has
  // no built-in prompt, so the editor would otherwise start blank.
  const generateFlowPrompt = async (stage: 'glossary' | 'translate' | 'revision') => {
    setFlowGenerating(stage);
    setPromptError(null);
    try {
      const res = await generateFictionFlowPrompt({
        stage,
        targetLanguage,
        useGlossary: flowUseGlossary,
      });
      setFlowPrompts((prev) => ({ ...prev, [stage]: res.prompt }));
    } catch (e: unknown) {
      setPromptError(e instanceof Error ? e.message : 'Failed to generate prompt');
    } finally {
      setFlowGenerating(null);
    }
  };

  const updateFlowTemperature = (stage: 'glossary' | 'translate' | 'revision', value: string) => {
    setFlowTemperatures((prev) => ({ ...prev, [stage]: value }));
  };

  // Blank/invalid/out-of-range → undefined (backend then uses the model default).
  const parseTemp = (s: string): number | undefined => {
    const t = s.trim();
    if (!t) return undefined;
    const n = Number(t);
    return Number.isFinite(n) && n >= 0 && n <= 2 ? n : undefined;
  };

  // Blank/invalid/out-of-range → undefined (backend then uses the default, 12).
  const parseBatchSize = (s: string): number | undefined => {
    const t = s.trim();
    if (!t) return undefined;
    const n = Number(t);
    return Number.isInteger(n) && n >= 1 && n <= 100 ? n : undefined;
  };

  // ── "Load from book" picker ────────────────────────────────────────────────
  const loadPickerBooks = async () => {
    setPickerBooksLoading(true);
    setChapterLoadError(null);
    try {
      setPickerBooks(await fetchBooks());
    } catch (e: unknown) {
      setChapterLoadError(e instanceof Error ? e.message : 'Failed to load books');
    } finally {
      setPickerBooksLoading(false);
    }
  };

  const toggleBookLoader = () => {
    setBookLoaderOpen((open) => {
      const next = !open;
      if (next && pickerBooks.length === 0 && !pickerBooksLoading) void loadPickerBooks();
      return next;
    });
  };

  // When the chosen book changes, load its chapters (ordered) and reset selection.
  useEffect(() => {
    if (!pickBookId) {
      setPickerChapters([]);
      setSelectedChapterIds([]);
      return;
    }
    let cancelled = false;
    setPickerChaptersLoading(true);
    setChapterLoadError(null);
    setSelectedChapterIds([]);
    fetchChapters(pickBookId)
      .then((chs) => {
        if (!cancelled) setPickerChapters([...chs].sort((a, b) => a.index - b.index));
      })
      .catch((e: unknown) => {
        if (!cancelled) setChapterLoadError(e instanceof Error ? e.message : 'Failed to load chapters');
      })
      .finally(() => {
        if (!cancelled) setPickerChaptersLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [pickBookId]);

  const toggleChapter = (id: string) => {
    setSelectedChapterIds((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id],
    );
  };

  const allChaptersSelected =
    pickerChapters.length > 0 && selectedChapterIds.length === pickerChapters.length;
  const toggleAllChapters = () => {
    setSelectedChapterIds(allChaptersSelected ? [] : pickerChapters.map((c) => c.id));
  };

  // Fetch the selected chapters' SOURCE blocks (no lang → original), assemble each
  // into blank-line-separated paragraphs, join chapters in reading order, and drop
  // the result into the source textarea.
  const loadSelectedIntoSource = async () => {
    const ordered = pickerChapters.filter((c) => selectedChapterIds.includes(c.id));
    if (ordered.length === 0) return;
    setLoadingSource(true);
    setChapterLoadError(null);
    try {
      const parts = await Promise.all(
        ordered.map((c) => fetchContent(c.id).then(assembleChapterSource)),
      );
      setSourceText(parts.filter((t) => t.trim().length > 0).join('\n\n'));
      setBookLoaderOpen(false);
    } catch (e: unknown) {
      setChapterLoadError(e instanceof Error ? e.message : 'Failed to load chapter content');
    } finally {
      setLoadingSource(false);
    }
  };

  const handleBookUploaded = (bookId: string) => {
    setUploadOpen(false);
    void loadPickerBooks().then(() => setPickBookId(bookId));
  };

  const handleRunFlow = async () => {
    if (!canRunFlow) return;
    setFlowRunning(true);
    setError(null);
    setFlowResponse(null);
    setFlowProgress({ done: 0, total: 0 });
    // Track stages completed per model so a failed model (which never emits all
    // its stage events) still tops out the bar via its `model` event.
    const perModel: Record<string, number> = {};
    let stagesPerModel = 0;
    const recompute = () => {
      const done = Object.values(perModel).reduce((a, b) => a + b, 0);
      setFlowProgress({ done, total: models.length * stagesPerModel });
    };
    try {
      const res = await runFictionFlowPlaygroundStream(
        {
          sourceText: sourceText.trim(),
          targetLanguage,
          sourceLanguage,
          models,
          useGlossary: flowUseGlossary,
          existingGlossary: flowUseGlossary ? flowExistingGlossary.trim() || '{}' : undefined,
          prompts: {
            glossary: flowPrompts.glossary.trim() || undefined,
            translate: flowPrompts.translate.trim() || undefined,
            revision: flowPrompts.revision.trim() || undefined,
          },
          temperatures: {
            glossary: parseTemp(flowTemperatures.glossary),
            translate: parseTemp(flowTemperatures.translate),
            revision: parseTemp(flowTemperatures.revision),
          },
          revisionBatchSize: parseBatchSize(revisionBatchSize),
          judge,
          judgeModel,
        },
        (ev) => {
          if (ev.type === 'start') {
            stagesPerModel = ev.stagesPerModel;
            setFlowProgress({ done: 0, total: ev.totalModels * ev.stagesPerModel });
          } else if (ev.type === 'stage') {
            perModel[ev.model] = (perModel[ev.model] ?? 0) + 1;
            recompute();
          } else if (ev.type === 'model') {
            perModel[ev.result.model] = stagesPerModel;
            recompute();
          }
        },
      );
      setFlowResponse(res);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setFlowRunning(false);
      setFlowProgress(null);
    }
  };

  // ── Access control ─────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--app-text-muted)]" />
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 px-6 text-center">
        <ShieldAlert className="w-10 h-10 text-[var(--app-text-muted)]" />
        <p className="text-lg font-medium">Admins only</p>
        <p className="text-sm text-[var(--app-text-muted)]">
          You don’t have access to the translation playground.
        </p>
        <Button variant="outline" size="sm" onClick={() => router.push('/settings')}>
          Back to settings
        </Button>
      </div>
    );
  }

  const inputCls =
    'w-full rounded-[var(--radius)] border border-[var(--separator-opaque)] bg-[var(--app-surface-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--app-accent)]';

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pt-[calc(1rem+env(safe-area-inset-top)+76px)] pb-24">
      <PageHeader title="Translation Playground" />

      {/* ── Stage tabs ── */}
      <div className="mb-3 inline-flex rounded-[var(--radius)] border border-[var(--separator-opaque)] p-0.5">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => changeMode(m.id)}
            className={
              'rounded-[calc(var(--radius)-2px)] px-3 py-1.5 text-sm font-medium transition-colors ' +
              (mode === m.id
                ? 'bg-[var(--app-accent)] text-white'
                : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)]')
            }
          >
            {m.label}
          </button>
        ))}
      </div>

      <p className="mb-5 text-sm text-[var(--app-text-muted)]">
        {MODES.find((m) => m.id === mode)?.blurb}
      </p>

      {/* ── Input form ── */}
      <div className="space-y-4 rounded-[var(--radius)] border border-[var(--separator-opaque)] p-4">
        <div>
          <div className="mb-1 flex items-center justify-between gap-2">
            <label className="block text-xs font-medium uppercase tracking-wide text-[var(--app-text-muted)]">
              {mode === 'glossary'
                ? 'Chapter source text'
                : mode === 'revision'
                  ? 'Source segments (blank line between blocks)'
                  : mode === 'flow'
                    ? 'Chapter source text (blocks separated by blank lines)'
                    : 'Source text'}
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={toggleBookLoader}
                title="Load source text from an uploaded book's chapters"
                className={
                  'inline-flex items-center gap-1 text-xs hover:text-[var(--app-accent)] ' +
                  (bookLoaderOpen ? 'text-[var(--app-accent)]' : 'text-[var(--app-text-muted)]')
                }
              >
                <BookOpen className="h-3.5 w-3.5" /> From book
              </button>
              <button
                type="button"
                onClick={() => openViewer('Source text', sourceText)}
                disabled={!sourceText.trim()}
                title="View full source text"
                className="inline-flex items-center gap-1 text-xs text-[var(--app-text-muted)] hover:text-[var(--app-accent)] disabled:opacity-40"
              >
                <Maximize2 className="h-3.5 w-3.5" /> View
              </button>
            </div>
          </div>
          <textarea
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            rows={5}
            placeholder={
              mode === 'glossary'
                ? 'Paste the chapter plain text to analyse…'
                : mode === 'revision'
                  ? 'Paste the source segments — one block per paragraph, separated by a blank line…'
                  : mode === 'flow'
                    ? 'Paste the chapter — one block per paragraph, separated by a blank line…'
                    : 'Paste the passage to translate…'
            }
            className={inputCls + ' resize-y font-[inherit]'}
          />

          {/* Load source text from an uploaded book's chapters. */}
          {bookLoaderOpen && (
            <div className="mt-2 space-y-3 rounded-[var(--radius)] border border-[var(--separator-opaque)] bg-[var(--app-surface-bg)] p-3">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--app-text-muted)]">
                    Book
                  </label>
                  <select
                    value={pickBookId}
                    onChange={(e) => setPickBookId(e.target.value)}
                    disabled={pickerBooksLoading}
                    className={inputCls}
                  >
                    <option value="">
                      {pickerBooksLoading
                        ? 'Loading books…'
                        : pickerBooks.length === 0
                          ? 'No books — upload one'
                          : 'Select a book…'}
                    </option>
                    {pickerBooks.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.title}
                        {b.author ? ` — ${b.author}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setUploadOpen(true)}
                  title="Upload a new book"
                >
                  <UploadIcon className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void loadPickerBooks()}
                  disabled={pickerBooksLoading}
                  title="Refresh book list"
                >
                  <RefreshCw className={'h-4 w-4' + (pickerBooksLoading ? ' animate-spin' : '')} />
                </Button>
              </div>

              {pickBookId && (
                <div>
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <label className="block text-xs font-medium uppercase tracking-wide text-[var(--app-text-muted)]">
                      Chapters
                      {selectedChapterIds.length > 0 && ` (${selectedChapterIds.length} selected)`}
                    </label>
                    {pickerChapters.length > 0 && (
                      <button
                        type="button"
                        onClick={toggleAllChapters}
                        className="text-xs text-[var(--app-text-muted)] hover:text-[var(--app-accent)]"
                      >
                        {allChaptersSelected ? 'Clear all' : 'Select all'}
                      </button>
                    )}
                  </div>
                  {pickerChaptersLoading ? (
                    <p className="flex items-center gap-2 text-xs text-[var(--app-text-muted)]">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading chapters…
                    </p>
                  ) : pickerChapters.length === 0 ? (
                    <p className="text-xs text-[var(--app-text-muted)]">No chapters in this book.</p>
                  ) : (
                    <ul className="max-h-48 space-y-0.5 overflow-y-auto rounded-[var(--radius)] border border-[var(--separator-opaque)] p-1">
                      {pickerChapters.map((c) => (
                        <li key={c.id}>
                          <label
                            className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-black/5 dark:hover:bg-white/5"
                            style={{ paddingLeft: `${8 + (c.depth ?? 0) * 14}px` }}
                          >
                            <input
                              type="checkbox"
                              checked={selectedChapterIds.includes(c.id)}
                              onChange={() => toggleChapter(c.id)}
                            />
                            <span className="truncate">{c.title || `Chapter ${c.index + 1}`}</span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {chapterLoadError && (
                <p className="text-xs text-red-600 dark:text-red-400">{chapterLoadError}</p>
              )}

              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-[var(--app-text-muted)]">
                  Replaces the source text with the selected chapters&apos; original text.
                </p>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void loadSelectedIntoSource()}
                  disabled={selectedChapterIds.length === 0 || loadingSource}
                >
                  {loadingSource ? (
                    <>
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" /> Loading…
                    </>
                  ) : (
                    'Copy to source text'
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Revision: the machine-translated draft to polish */}
        {mode === 'revision' && (
          <div>
            <div className="mb-1 flex items-center justify-between gap-2">
              <label className="block text-xs font-medium uppercase tracking-wide text-[var(--app-text-muted)]">
                Draft translation to revise (blank line between blocks)
              </label>
              <button
                type="button"
                onClick={() => openViewer('Draft translation', draftText)}
                disabled={!draftText.trim()}
                title="View full draft"
                className="inline-flex items-center gap-1 text-xs text-[var(--app-text-muted)] hover:text-[var(--app-accent)] disabled:opacity-40"
              >
                <Maximize2 className="h-3.5 w-3.5" /> View
              </button>
            </div>
            <textarea
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              rows={5}
              placeholder="Paste the machine-translated draft — same number of blocks as the source, one per blank-line group…"
              className={inputCls + ' resize-y font-[inherit]'}
            />
            <p className="mt-1 text-xs text-[var(--app-text-muted)]">
              Source and draft are numbered [1], [2], … in order — keep the same block count in both.
            </p>
          </div>
        )}

        {/* Glossary: the merged glossary built from earlier chapters */}
        {mode === 'glossary' && (
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--app-text-muted)]">
              Existing glossary JSON (from earlier chapters — {'{}'} for the first)
            </label>
            <textarea
              value={existingGlossary}
              onChange={(e) => setExistingGlossary(e.target.value)}
              rows={3}
              placeholder="{}"
              className={inputCls + ' resize-y font-mono text-xs leading-relaxed'}
            />
          </div>
        )}

        {/* Revision: optional glossary + seam context */}
        {mode === 'revision' && (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--app-text-muted)]">
                Glossary block (optional)
              </label>
              <textarea
                value={glossary}
                onChange={(e) => setGlossary(e.target.value)}
                rows={2}
                placeholder="Flattened glossary (STYLE / NAMES / TERMS lines) — leave blank for “(no glossary)”…"
                className={inputCls + ' resize-y font-mono text-xs leading-relaxed'}
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--app-text-muted)]">
                  Preceding context (optional)
                </label>
                <textarea
                  value={precedingContext}
                  onChange={(e) => setPrecedingContext(e.target.value)}
                  rows={2}
                  placeholder="Already-translated neighbor before this batch…"
                  className={inputCls + ' resize-y'}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--app-text-muted)]">
                  Following context (optional)
                </label>
                <textarea
                  value={followingContext}
                  onChange={(e) => setFollowingContext(e.target.value)}
                  rows={2}
                  placeholder="Neighbor after this batch…"
                  className={inputCls + ' resize-y'}
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--app-text-muted)]">
                Batch size (blocks per Pass-2 call)
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={revisionBatchSize}
                onChange={(e) => setRevisionBatchSize(e.target.value)}
                placeholder="12"
                className={inputCls + ' w-28'}
              />
              <p className="mt-1 text-xs text-[var(--app-text-muted)]">
                Segments are split into contiguous batches of this size (default 12, as in production). Blank → 12.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {mode !== 'revision' && (
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--app-text-muted)]">
                From
              </label>
              <select
                value={sourceLanguage}
                onChange={(e) => setSourceLanguage(e.target.value)}
                className={inputCls}
              >
                {LANGS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--app-text-muted)]">
              To
            </label>
            <select
              value={targetLanguage}
              onChange={(e) => {
                const next = e.target.value;
                setTargetLanguage(next);
                // Keep source ≠ target in fiction modes (the From select is hidden
                // for revision, so only guard when it's shown).
                if (mode !== 'translate' && mode !== 'revision' && next === sourceLanguage) {
                  setSourceLanguage(next === 'RU' ? 'EN' : 'RU');
                }
              }}
              className={inputCls}
            >
              {(mode === 'translate' ? LANGS : FICTION_LANGS).map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Models */}
        <div>
          <div className="mb-1.5 flex items-center gap-2">
            <label className="block text-xs font-medium uppercase tracking-wide text-[var(--app-text-muted)]">
              Models to compare
            </label>
            <button
              type="button"
              onClick={() => loadModels(true)}
              disabled={modelsLoading}
              title="Refresh available models"
              className="inline-flex items-center gap-1 text-xs text-[var(--app-text-muted)] hover:text-[var(--app-accent)] disabled:opacity-50"
            >
              <RefreshCw className={'h-3 w-3' + (modelsLoading ? ' animate-spin' : '')} />
              {modelsMeta?.provider && modelsMeta.provider !== 'unknown'
                ? `${modelsMeta.provider}${modelsMeta.fallback ? ' · fallback' : ''}`
                : 'refresh'}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {[...new Set([...availableModels, ...models])].map((m) => {
              const active = models.includes(m);
              const discovered = availableModels.includes(m);
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => toggleModel(m)}
                  className={
                    'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ' +
                    (active
                      ? 'border-[var(--app-accent)] bg-[var(--app-accent)]/10 text-[var(--app-accent)]'
                      : 'border-[var(--separator-opaque)] text-[var(--app-text-muted)] hover:bg-[var(--app-surface-bg)]')
                  }
                >
                  {m}
                  {active && !discovered && <X className="h-3 w-3" />}
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex gap-2">
            <input
              value={customModel}
              onChange={(e) => setCustomModel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addCustomModel();
                }
              }}
              placeholder="Add a custom model id…"
              className={inputCls + ' max-w-xs'}
            />
            <Button type="button" variant="outline" size="sm" onClick={addCustomModel}>
              <Plus className="h-4 w-4" /> Add
            </Button>
          </div>
        </div>

        {/* Full flow: run+customise every pipeline stage */}
        {mode === 'flow' && (
          <div className="space-y-4 border-t border-[var(--separator-opaque)] pt-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={flowUseGlossary}
                  onChange={(e) => setFlowUseGlossary(e.target.checked)}
                />
                Build &amp; use a glossary (Pass 0 → injected into translate + revision)
              </label>
              <button
                type="button"
                onClick={loadFlowPrompts}
                disabled={flowLoadingPrompts}
                className="inline-flex items-center gap-1 text-xs text-[var(--app-text-muted)] hover:text-[var(--app-accent)] disabled:opacity-50"
                title="Seed all stage prompts from the production templates"
              >
                {flowLoadingPrompts ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                Load prod prompts
              </button>
            </div>

            {flowUseGlossary && (
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--app-text-muted)]">
                  Seed glossary JSON (from earlier chapters — {'{}'} for the first)
                </label>
                <textarea
                  value={flowExistingGlossary}
                  onChange={(e) => setFlowExistingGlossary(e.target.value)}
                  rows={2}
                  placeholder="{}"
                  className={inputCls + ' resize-y font-mono text-xs leading-relaxed'}
                />
              </div>
            )}

            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--app-text-muted)]">
                Revision batch size (blocks per Pass-2 call)
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={revisionBatchSize}
                onChange={(e) => setRevisionBatchSize(e.target.value)}
                placeholder="12"
                className={inputCls + ' w-28'}
              />
              <p className="mt-1 text-xs text-[var(--app-text-muted)]">
                Pass 2 splits the chapter into contiguous batches of this size (default 12, as in production). Blank → 12.
              </p>
            </div>

            <p className="text-xs text-[var(--app-text-muted)]">
              Each model runs the full chain (glossary → translate → revision) on the chapter above.
              Leave a stage prompt blank to use the live production template, or load and tweak it.
            </p>

            <div className="space-y-3">
              {FLOW_STAGES.filter((s) => flowUseGlossary || s.key !== 'glossary').map((s) => {
                const value = flowPrompts[s.key];
                return (
                  <div key={s.key} className="rounded-[var(--radius)] border border-[var(--separator-opaque)] p-3">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="text-sm font-medium">{s.label}</span>
                      <button
                        type="button"
                        onClick={() =>
                          openViewer(
                            s.label,
                            value.trim()
                              ? value
                              : '(blank — the production prompt is used at run time. Click “Load prod prompts” to view and edit the real template.)',
                          )
                        }
                        title="View this prompt"
                        className="inline-flex items-center gap-1 text-xs text-[var(--app-text-muted)] hover:text-[var(--app-accent)]"
                      >
                        <Maximize2 className="h-3.5 w-3.5" /> View
                      </button>
                      <button
                        type="button"
                        onClick={() => generateFlowPrompt(s.key)}
                        disabled={flowGenerating !== null}
                        title={`Auto-draft this prompt for ${targetLanguage} by adapting the existing-language prompt with an LLM`}
                        className="inline-flex items-center gap-1 text-xs text-[var(--app-text-muted)] hover:text-[var(--app-accent)] disabled:opacity-50"
                      >
                        {flowGenerating === s.key ? (
                          <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating…</>
                        ) : (
                          <><Sparkles className="h-3.5 w-3.5" /> Generate</>
                        )}
                      </button>
                      <span className="ml-auto text-xs text-[var(--app-text-muted)]">
                        {value.trim() ? `${value.length} chars` : 'prod default'}
                      </span>
                    </div>
                    <div className="mb-2 flex items-center gap-2">
                      <label className="text-xs text-[var(--app-text-muted)]">Temperature</label>
                      <input
                        type="number"
                        min={0}
                        max={2}
                        step={0.1}
                        value={flowTemperatures[s.key]}
                        onChange={(e) => updateFlowTemperature(s.key, e.target.value)}
                        placeholder="default"
                        className="w-24 rounded-[var(--radius)] border border-[var(--separator-opaque)] bg-transparent px-2 py-1 text-xs"
                      />
                      <span className="text-xs text-[var(--app-text-muted)]">blank = model default · range 0–2</span>
                    </div>
                    <textarea
                      value={value}
                      onChange={(e) => updateFlowPrompt(s.key, e.target.value)}
                      rows={value.trim() ? 8 : 3}
                      placeholder="Blank = production prompt. Click “Load prod prompts” to edit the real template…"
                      className={inputCls + ' resize-y font-mono text-xs leading-relaxed'}
                    />
                    <p className="mt-1 text-xs text-[var(--app-text-muted)]">
                      Placeholders: <span className="font-mono">{s.placeholders}</span>
                    </p>
                  </div>
                );
              })}
            </div>
            {promptError && <p className="text-sm text-red-600 dark:text-red-400">{promptError}</p>}
          </div>
        )}

        {/* System-prompt variants (hidden for the full-flow stage) */}
        {mode !== 'flow' && (
        <div className="border-t border-[var(--separator-opaque)] pt-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <label className="block text-xs font-medium uppercase tracking-wide text-[var(--app-text-muted)]">
              System prompts to compare
            </label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addVariant}
              disabled={variants.length >= MAX_VARIANTS}
            >
              <Plus className="h-4 w-4" /> Add prompt
            </Button>
          </div>
          <p className="mb-3 text-xs text-[var(--app-text-muted)]">
            Each prompt runs against every selected model. Leave a prompt blank to use the live
            production{' '}
            {mode === 'translate' ? (
              <>
                prompt for <span className="font-mono">{targetLanguage}</span>
              </>
            ) : (
              <>{mode} prompt</>
            )}
            , or load it and tweak. Placeholders filled at run time:{' '}
            {MODE_PLACEHOLDERS[mode].map((p, i) => (
              <span key={p}>
                {i > 0 && ' '}
                <span className="font-mono">{p}</span>
              </span>
            ))}
            .
          </p>

          <div className="space-y-3">
            {variants.map((v, idx) => (
              <div
                key={idx}
                className="rounded-[var(--radius)] border border-[var(--separator-opaque)] p-3"
              >
                <div className="mb-2 flex items-center gap-2">
                  <input
                    value={v.label}
                    onChange={(e) => updateVariant(idx, { label: e.target.value })}
                    placeholder="Prompt label"
                    className={inputCls + ' max-w-[220px] py-1 font-medium'}
                  />
                  <button
                    type="button"
                    onClick={() => loadProdPrompt(idx)}
                    disabled={loadingPromptIdx === idx}
                    className="inline-flex items-center gap-1 text-xs text-[var(--app-text-muted)] hover:text-[var(--app-accent)] disabled:opacity-50"
                    title="Load the production prompt for the current target language"
                  >
                    {loadingPromptIdx === idx ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Download className="h-3.5 w-3.5" />
                    )}
                    Load prod prompt
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      openViewer(
                        v.label,
                        v.template.trim()
                          ? v.template
                          : '(blank — the production prompt for the target language is used at run time. Click “Load prod prompt” to view and edit the real template.)',
                      )
                    }
                    title="View this prompt"
                    className="inline-flex items-center gap-1 text-xs text-[var(--app-text-muted)] hover:text-[var(--app-accent)]"
                  >
                    <Maximize2 className="h-3.5 w-3.5" /> View
                  </button>
                  <span className="ml-auto text-xs text-[var(--app-text-muted)]">
                    {v.template.trim() ? `${v.template.length} chars` : 'prod default'}
                  </span>
                  {variants.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeVariant(idx)}
                      className="text-[var(--app-text-muted)] hover:text-red-600 dark:hover:text-red-400"
                      title="Remove this prompt"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <textarea
                  value={v.template}
                  onChange={(e) => updateVariant(idx, { template: e.target.value })}
                  rows={v.template.trim() ? 8 : 3}
                  placeholder="Blank = production prompt. Click “Load prod prompt” to edit the real template…"
                  className={inputCls + ' resize-y font-mono text-xs leading-relaxed'}
                />
              </div>
            ))}
          </div>
          {promptError && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">{promptError}</p>
          )}
        </div>
        )}

        {/* Judge options (translate mode only) */}
        {(mode === 'translate' || mode === 'revision' || mode === 'flow') && (
          <>
            <div className="flex flex-wrap items-center gap-4 border-t border-[var(--separator-opaque)] pt-4">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input type="checkbox" checked={judge} onChange={(e) => setJudge(e.target.checked)} />
                Score quality (MQM judge{mode === 'translate' ? '' : ' · fiction'})
              </label>
              {judge && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-[var(--app-text-muted)]">Judge model</span>
                  <select
                    value={judgeModel}
                    onChange={(e) => setJudgeModel(e.target.value)}
                    className={inputCls + ' w-auto py-1'}
                  >
                    {[...new Set([judgeModel, ...availableModels])].map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {judge && mode === 'translate' && (
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--app-text-muted)]">
                  Reference translation (optional — anchors the judge)
                </label>
                <textarea
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  rows={2}
                  placeholder="Human gold translation, if you have one…"
                  className={inputCls + ' resize-y'}
                />
              </div>
            )}
          </>
        )}

        <div className="flex items-center gap-3">
          {mode === 'flow' ? (
            <Button onClick={handleRunFlow} disabled={!canRunFlow}>
              {flowRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {flowRunning
                ? 'Running flow…'
                : `Run flow (${models.length} model${models.length === 1 ? '' : 's'})`}
            </Button>
          ) : (
            <Button onClick={handleRun} disabled={!canRun}>
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {running
                ? 'Running…'
                : variants.length > 1
                  ? `Run (${cellCount} runs)`
                  : `Run (${models.length} model${models.length === 1 ? '' : 's'})`}
            </Button>
          )}
          {error && <span className="text-sm text-red-600 dark:text-red-400">{error}</span>}
        </div>

        {/* Live progress while the full flow streams stage-by-stage. */}
        {mode === 'flow' && flowRunning && flowProgress && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-[var(--app-text-muted)]">
              <span>Running full flow…</span>
              <span>
                {flowProgress.done}/{flowProgress.total || '…'} stages
                {flowProgress.total > 0
                  ? ` · ${Math.round((flowProgress.done / flowProgress.total) * 100)}%`
                  : ''}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--separator-opaque)]">
              <div
                className="h-full rounded-full bg-[var(--app-accent)] transition-[width] duration-300"
                style={{
                  width: `${flowProgress.total > 0 ? Math.round((flowProgress.done / flowProgress.total) * 100) : 5}%`,
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Full-flow results ── */}
      {flowResponse && (
        <div className="mt-6">
          <div className="mb-3 text-xs text-[var(--app-text-muted)]">
            full flow · {flowResponse.sourceLanguage} → {flowResponse.targetLanguage} ·{' '}
            {flowResponse.blockCount} block{flowResponse.blockCount === 1 ? '' : 's'}
            {flowResponse.useGlossary ? ' · with glossary' : ' · no glossary'}
          </div>
          <div className="space-y-4">
            {flowResponse.results.map((r) => (
              <FlowResultCard key={r.model} result={r} onView={openViewer} />
            ))}
          </div>
        </div>
      )}

      {/* ── Results ── */}
      {response && (() => {
        const multiVariant = (response.variants?.length ?? 1) > 1;
        // Group by model so prompt variants for the same model sit side by side.
        const modelOrder = [...new Set(response.results.map((r) => r.model))];
        return (
          <div className="mt-6">
            <div className="mb-3 text-xs text-[var(--app-text-muted)]">
              {response.mode && response.mode !== 'translate' && `${response.mode} · `}
              {response.sourceLanguage ?? '—'} → {response.targetLanguage}
              {multiVariant && ` · ${response.variants!.length} prompts`}
              {response.judged && ` · judged by ${response.judgeModel}`}
              {response.referenceUsed && ' · reference-anchored'}
            </div>

            {multiVariant ? (
              <div className="space-y-6">
                {modelOrder.map((model) => {
                  const cards = response.results
                    .filter((r) => r.model === model)
                    .sort((a, b) => (a.variantIndex ?? 0) - (b.variantIndex ?? 0));
                  return (
                    <div key={model}>
                      <h3 className="mb-2 font-mono text-sm font-semibold">{model}</h3>
                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {cards.map((r) => (
                          <ResultCard
                            key={`${r.variantIndex}::${r.model}`}
                            result={r}
                            showVariant
                            onView={openViewer}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {response.results.map((r) => (
                  <ResultCard key={r.model} result={r} onView={openViewer} />
                ))}
              </div>
            )}
          </div>
        );
      })()}

      <TextViewerModal viewer={viewer} onClose={() => setViewer(null)} />

      <UploadBookModal
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUploaded={handleBookUploaded}
      />
    </div>
  );
}

/** Read-only full-screen viewer for long prompts / source / translated text. */
function TextViewerModal({
  viewer,
  onClose,
}: {
  viewer: { title: string; content: string } | null;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(t);
  }, [copied]);

  const copy = async () => {
    if (!viewer) return;
    try {
      await navigator.clipboard.writeText(viewer.content);
      setCopied(true);
    } catch {
      // Clipboard blocked (insecure context / permissions) — ignore silently.
    }
  };

  return (
    <IOSDialog
      open={!!viewer}
      onOpenChange={(o) => !o && onClose()}
      className="sm:max-w-3xl"
    >
      <div className="flex max-h-[80vh] flex-col">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--separator-opaque)] px-5 py-3">
          <h2 className="truncate text-sm font-semibold">{viewer?.title}</h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={copy}
              title="Copy to clipboard"
              className="inline-flex items-center gap-1 rounded-[var(--radius)] px-2 py-1 text-xs text-[var(--app-text-muted)] hover:bg-[var(--app-surface-bg)] hover:text-[var(--app-accent)]"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button
              type="button"
              onClick={onClose}
              title="Close"
              className="rounded-full p-1 text-[var(--app-text-muted)] hover:bg-[var(--app-surface-bg)] hover:text-[var(--app-text)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="overflow-y-auto px-5 py-4">
          <pre className="whitespace-pre-wrap break-words font-mono text-sm leading-relaxed text-[var(--app-text)]">
            {viewer?.content}
          </pre>
        </div>
      </div>
    </IOSDialog>
  );
}

function ResultCard({
  result: r,
  showVariant = false,
  onView,
}: {
  result: PlaygroundResult;
  showVariant?: boolean;
  onView?: (title: string, content: string) => void;
}) {
  // Grouped-by-model view labels each card by its prompt variant; the flat view
  // labels by model (single-prompt runs).
  const heading = showVariant ? r.variantLabel ?? 'Variant' : r.model;
  const viewTitle = showVariant ? `${r.model} · ${r.variantLabel ?? 'Variant'}` : r.model;
  return (
    <div className="flex flex-col rounded-[var(--radius)] border border-[var(--separator-opaque)] p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="truncate text-sm font-medium">{heading}</span>
        <div className="flex shrink-0 items-center gap-2">
          {r.ok && r.translatedText && onView && (
            <button
              type="button"
              onClick={() => onView(viewTitle, r.translatedText ?? '')}
              title="View full translation"
              className="inline-flex items-center gap-1 text-xs text-[var(--app-text-muted)] hover:text-[var(--app-accent)]"
            >
              <Maximize2 className="h-3.5 w-3.5" /> View
            </button>
          )}
          {r.ok && r.verdict && (
            <span className={'text-lg font-bold tabular-nums ' + scoreColor(r.verdict.overall)}>
              {r.verdict.overall}
            </span>
          )}
        </div>
      </div>

      {!r.ok ? (
        <p className="text-sm text-red-600 dark:text-red-400">{r.error || 'Failed'}</p>
      ) : (
        <>
          {r.actualModel && r.actualModel !== r.model && (
            <p className="mb-1 text-xs text-amber-600 dark:text-amber-400">
              served by {r.actualModel}
            </p>
          )}
          <p className="max-h-64 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed">
            {r.translatedText}
          </p>

          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--app-text-muted)]">
            <span>{r.latencyMs != null ? `${(r.latencyMs / 1000).toFixed(1)}s` : '—'}</span>
            <span>{fmtCost(r.costUsd)}</span>
            <span>
              {r.tokensIn ?? 0}→{r.tokensOut ?? 0} tok
            </span>
          </div>

          {r.verdict && (
            <div className="mt-3 border-t border-[var(--separator-opaque)] pt-3">
              <div className="flex flex-wrap gap-4 text-xs">
                <span>A {r.verdict.adequacy}/5</span>
                <span>F {r.verdict.fluency}/5</span>
                <span>S {r.verdict.style}/5</span>
                {r.verdict.dialogue != null && <span>D {r.verdict.dialogue}/5</span>}
                {r.mqmPenalty != null && <span>MQM −{r.mqmPenalty}</span>}
                {r.mqmPer1k != null && <span className="text-[var(--app-text-muted)]">({r.mqmPer1k}/1k)</span>}
              </div>
              {r.verdict.summary && (
                <p className="mt-2 text-xs text-[var(--app-text-muted)]">{r.verdict.summary}</p>
              )}
              {r.verdict.errors.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {r.verdict.errors.map((err, i) => (
                    <li key={i} className="text-xs">
                      <span
                        className={
                          'font-medium ' +
                          (err.severity === 'critical'
                            ? 'text-red-600 dark:text-red-400'
                            : err.severity === 'major'
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-[var(--app-text-muted)]')
                        }
                      >
                        [{err.severity}] {err.category}
                      </span>
                      {err.block != null && <span className="text-[var(--app-text-muted)]"> [{err.block}]</span>}
                      {err.span && <span className="text-[var(--app-text-muted)]"> · “{err.span}”</span>}
                      {err.explanation && <span> — {err.explanation}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {r.judgeError && (
            <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">judge: {r.judgeError}</p>
          )}
        </>
      )}
    </div>
  );
}

// ── Revision diff (draft → final) ────────────────────────────────────────────
// A word-level diff so a reviewer can see exactly what the Revision stage fixed.

type DiffSeg = { type: 'equal' | 'add' | 'del'; text: string };

// Split into words AND the whitespace between them, so segments re-join with the
// original spacing intact.
function tokenizeWords(s: string): string[] {
  return s.match(/\s+|[^\s]+/g) ?? [];
}

// Word-level LCS diff → merged segments. Blocks are short, so O(n·m) is fine.
function diffWords(before: string, after: string): DiffSeg[] {
  const a = tokenizeWords(before);
  const b = tokenizeWords(after);
  const n = a.length;
  const m = b.length;
  const lcs: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }
  const raw: DiffSeg[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) { raw.push({ type: 'equal', text: a[i] }); i++; j++; }
    else if (lcs[i + 1][j] >= lcs[i][j + 1]) { raw.push({ type: 'del', text: a[i] }); i++; }
    else { raw.push({ type: 'add', text: b[j] }); j++; }
  }
  while (i < n) raw.push({ type: 'del', text: a[i++] });
  while (j < m) raw.push({ type: 'add', text: b[j++] });
  // Merge adjacent same-type segments (incl. the whitespace tokens between them).
  const merged: DiffSeg[] = [];
  for (const seg of raw) {
    const last = merged[merged.length - 1];
    if (last && last.type === seg.type) last.text += seg.text;
    else merged.push({ ...seg });
  }
  return merged;
}

/** Inline unified diff: removed text struck through in red, added text in green. */
function InlineDiff({ before, after }: { before: string; after: string }) {
  const segs = diffWords(before, after);
  return (
    <p className="whitespace-pre-wrap text-sm leading-relaxed">
      {segs.map((s, i) => {
        if (s.type === 'equal') return <span key={i}>{s.text}</span>;
        if (s.type === 'add') {
          return (
            <span key={i} className="rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
              {s.text}
            </span>
          );
        }
        return (
          <span key={i} className="rounded bg-red-500/15 text-red-600 line-through dark:text-red-400">
            {s.text}
          </span>
        );
      })}
    </p>
  );
}

/** Small one-click copy-to-clipboard button with a transient "Copied" state. */
function CopyButton({
  text,
  label = 'Copy',
  title,
}: {
  text: string;
  label?: string;
  title?: string;
}) {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable (insecure context / denied) — no-op */
    }
  };
  return (
    <button
      type="button"
      onClick={onCopy}
      title={title ?? label}
      className="inline-flex items-center gap-1 hover:text-[var(--app-accent)]"
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {copied ? 'Copied' : label}
    </button>
  );
}

/**
 * Render a revision's changed blocks as a plain-text change log (draft → final),
 * so the whole diff can be copied in one click and pasted into a doc or ticket.
 */
function buildChangeLog(model: string, blocks: FictionFlowRevisionBlock[]): string {
  const changed = blocks
    .map((b, i) => ({ ...b, n: i + 1 }))
    .filter((b) => b.changed);
  const header = `Change log — ${model} — ${changed.length}/${blocks.length} blocks changed`;
  if (changed.length === 0) return `${header}\n(no changes)`;
  const body = changed
    .map((b) => `Block ${b.n}\n--- draft\n${b.draft}\n+++ final\n${b.final}`)
    .join('\n\n');
  return `${header}\n\n${body}`;
}

/** The Revision stage's per-block changes, changed blocks first (toggle for the rest). */
function FlowRevisionDiff({ blocks }: { blocks: FictionFlowRevisionBlock[] }) {
  const [showUnchanged, setShowUnchanged] = useState(false);
  const changedCount = blocks.filter((b) => b.changed).length;

  if (changedCount === 0) {
    return (
      <p className="mt-2 rounded-[var(--radius)] border border-[var(--separator-opaque)] p-3 text-xs text-[var(--app-text-muted)]">
        Revision left every block unchanged.
      </p>
    );
  }

  return (
    <div className="mt-2 space-y-2 rounded-[var(--radius)] border border-[var(--separator-opaque)] bg-[var(--app-surface-bg)] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--app-text-muted)]">
        <span className="flex items-center gap-1">
          <span className="rounded bg-emerald-500/20 px-1 text-emerald-700 dark:text-emerald-300">added</span>
          <span className="rounded bg-red-500/15 px-1 text-red-600 line-through dark:text-red-400">removed</span>
        </span>
        <label className="flex cursor-pointer items-center gap-1">
          <input
            type="checkbox"
            checked={showUnchanged}
            onChange={(e) => setShowUnchanged(e.target.checked)}
          />
          Show unchanged
        </label>
      </div>
      <ol className="space-y-2">
        {blocks.map((b, idx) => {
          if (!showUnchanged && !b.changed) return null;
          return (
            <li key={idx} className="rounded-[var(--radius)] border border-[var(--separator-opaque)] p-2">
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--app-text-muted)]">
                Block {idx + 1}
                {!b.changed && ' · unchanged'}
              </div>
              {b.changed ? (
                <InlineDiff before={b.draft} after={b.final} />
              ) : (
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--app-text-muted)]">
                  {b.final}
                </p>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** One model's full-flow run: final translation + per-stage outputs and metrics. */
function FlowResultCard({
  result: r,
  onView,
}: {
  result: FictionFlowResult;
  onView: (title: string, content: string) => void;
}) {
  const [showDiff, setShowDiff] = useState(false);
  if (!r.ok) {
    return (
      <div className="rounded-[var(--radius)] border border-[var(--separator-opaque)] p-4">
        <span className="font-mono text-sm font-semibold">{r.model}</span>
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{r.error || 'Flow failed'}</p>
      </div>
    );
  }

  const g = r.glossary;
  const t = r.translate;
  const rev = r.revision;
  const secs = (ms?: number) => (ms != null ? `${(ms / 1000).toFixed(1)}s` : '—');
  const revBlocks = rev?.blocks ?? [];

  return (
    <div className="rounded-[var(--radius)] border border-[var(--separator-opaque)] p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span className="font-mono text-sm font-semibold">{r.model}</span>
        <span className="text-xs text-[var(--app-text-muted)]">
          total {fmtCost(r.totalCostUsd)} · {secs(r.totalLatencyMs)}
        </span>
      </div>

      {/* Final polished translation — the flow's output. */}
      {rev && (
        <div className="mb-3">
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-[var(--app-text-muted)]">
              Final (revised)
            </span>
            <button
              type="button"
              onClick={() => onView(`${r.model} · final`, rev.finalText)}
              className="inline-flex items-center gap-1 text-xs text-[var(--app-text-muted)] hover:text-[var(--app-accent)]"
            >
              <Maximize2 className="h-3.5 w-3.5" /> View
            </button>
          </div>
          <p className="max-h-64 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed">
            {rev.finalText}
          </p>
        </div>
      )}

      {/* LLM-judge of the final revised text (optional). */}
      {r.judge && (
        <div className="mb-3 border-t border-[var(--separator-opaque)] pt-3">
          {r.judge.error ? (
            <p className="text-xs text-amber-600 dark:text-amber-400">judge: {r.judge.error}</p>
          ) : r.judge.verdict ? (
            <>
              <div className="flex flex-wrap gap-4 text-xs">
                <span className={'font-bold ' + scoreColor(r.judge.verdict.overall)}>{r.judge.verdict.overall}/100</span>
                <span>A {r.judge.verdict.adequacy}/5</span>
                <span>F {r.judge.verdict.fluency}/5</span>
                <span>S {r.judge.verdict.style}/5</span>
                {r.judge.verdict.dialogue != null && <span>D {r.judge.verdict.dialogue}/5</span>}
                {r.judge.mqmPenalty != null && <span>MQM −{r.judge.mqmPenalty}</span>}
                {r.judge.mqmPer1k != null && <span className="text-[var(--app-text-muted)]">({r.judge.mqmPer1k}/1k)</span>}
              </div>
              {r.judge.verdict.summary && (
                <p className="mt-1 text-xs text-[var(--app-text-muted)]">{r.judge.verdict.summary}</p>
              )}
              {r.judge.verdict.errors.length > 0 && (
                <ul className="mt-1 space-y-0.5">
                  {r.judge.verdict.errors.slice(0, 20).map((err, i) => (
                    <li key={i} className="text-xs">
                      <span className={err.severity === 'critical' ? 'text-red-600 dark:text-red-400' : err.severity === 'major' ? 'text-amber-600 dark:text-amber-400' : 'text-[var(--app-text-muted)]'}>
                        [{err.severity}] {err.category}
                      </span>
                      {err.block != null && <span className="text-[var(--app-text-muted)]"> [{err.block}]</span>}
                      {err.explanation && <span> — {err.explanation}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : null}
        </div>
      )}

      {/* Per-stage diagnostics. */}
      <div className="space-y-1 border-t border-[var(--separator-opaque)] pt-3 text-xs text-[var(--app-text-muted)]">
        {g && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-medium text-[var(--app-text)]">Glossary</span>
            <span
              className={
                g.parsedOk
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-red-600 dark:text-red-400'
              }
            >
              {g.parsedOk ? (g.entriesUsed ? 'parsed, used' : 'parsed, empty') : 'parse failed'}
            </span>
            <span>{fmtCost(g.costUsd)}</span>
            <span>{secs(g.latencyMs)}</span>
            <span>{g.tokensIn}→{g.tokensOut} tok</span>
            <button
              type="button"
              onClick={() => onView(`${r.model} · glossary JSON`, g.text)}
              className="inline-flex items-center gap-1 hover:text-[var(--app-accent)]"
            >
              <Maximize2 className="h-3 w-3" /> JSON
            </button>
            {g.parseError && <span className="text-amber-600 dark:text-amber-400">· {g.parseError}</span>}
          </div>
        )}
        {t && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-medium text-[var(--app-text)]">Translate</span>
            <span className={t.parsedCount === t.blockCount ? '' : 'text-amber-600 dark:text-amber-400'}>
              {t.parsedCount}/{t.blockCount} blocks
            </span>
            <span>{fmtCost(t.costUsd)}</span>
            <span>{secs(t.latencyMs)}</span>
            <span>{t.tokensIn}→{t.tokensOut} tok</span>
            <button
              type="button"
              onClick={() => onView(`${r.model} · draft`, t.draftText)}
              className="inline-flex items-center gap-1 hover:text-[var(--app-accent)]"
            >
              <Maximize2 className="h-3 w-3" /> draft
            </button>
          </div>
        )}
        {rev && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-medium text-[var(--app-text)]">Revision</span>
            <span className={rev.changedCount > 0 ? '' : 'text-[var(--app-text-muted)]'}>
              {rev.changedCount}/{revBlocks.length} changed
            </span>
            <span>{fmtCost(rev.costUsd)}</span>
            <span>{secs(rev.latencyMs)}</span>
            <span>{rev.tokensIn}→{rev.tokensOut} tok</span>
            {revBlocks.length > 0 && (
              <button
                type="button"
                onClick={() => setShowDiff((s) => !s)}
                className="inline-flex items-center gap-1 hover:text-[var(--app-accent)]"
              >
                <GitCompare className="h-3 w-3" /> {showDiff ? 'Hide changes' : 'Show changes'}
              </button>
            )}
            {revBlocks.length > 0 && (
              <CopyButton
                text={buildChangeLog(r.model, revBlocks)}
                label="Copy change log"
                title="Copy the per-block draft → final change log"
              />
            )}
          </div>
        )}
      </div>

      {/* Revision diff — what the Revision stage changed, highlighted per block. */}
      {rev && showDiff && <FlowRevisionDiff blocks={revBlocks} />}
    </div>
  );
}
