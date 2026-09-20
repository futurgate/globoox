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
  Copy,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import PageHeader from '@/components/ui/PageHeader';
import IOSDialog from '@/components/ui/ios-dialog';
import { useAuth } from '@/lib/hooks/useAuth';
import {
  runTranslationPlayground,
  fetchPlaygroundModels,
  fetchTranslationPrompt,
  type PlaygroundResult,
  type PlaygroundResponse,
  type PlaygroundPromptVariant,
} from '@/lib/api';

const LANGS = ['EN', 'FR', 'ES', 'RU'] as const;

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

export default function TranslationPlaygroundPage() {
  const router = useRouter();
  const { isAdmin, loading: authLoading, isAuthenticated } = useAuth();

  const [sourceText, setSourceText] = useState('');
  const [sourceLanguage, setSourceLanguage] = useState<string>('EN');
  const [targetLanguage, setTargetLanguage] = useState<string>('RU');
  const [models, setModels] = useState<string[]>(PREFERRED_SELECTION);
  const [customModel, setCustomModel] = useState('');
  const [judge, setJudge] = useState(true);
  const [judgeModel, setJudgeModel] = useState('gemini-2.5-flash');
  const [reference, setReference] = useState('');

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
      const res = await fetchTranslationPrompt(targetLanguage);
      updateVariant(idx, { template: res.template });
    } catch (e: unknown) {
      setPromptError(e instanceof Error ? e.message : 'Failed to load production prompt');
    } finally {
      setLoadingPromptIdx(null);
    }
  };

  const canRun = sourceText.trim().length > 0 && models.length > 0 && !running;
  const cellCount = models.length * variants.length;

  const handleRun = async () => {
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
        sourceText: sourceText.trim(),
        targetLanguage,
        sourceLanguage,
        models,
        promptVariants,
        judge,
        judgeModel,
        reference: reference.trim() || undefined,
      });
      setResponse(res);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setRunning(false);
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
    <div className="mx-auto w-full max-w-6xl px-4 pb-24">
      <PageHeader title="Translation Playground" />

      <p className="mb-5 text-sm text-[var(--app-text-muted)]">
        Compare how different LLM models — and different system prompts — translate the same
        passage, using the real production translate flow, and optionally score each output with the
        MQM quality judge.
      </p>

      {/* ── Input form ── */}
      <div className="space-y-4 rounded-[var(--radius)] border border-[var(--separator-opaque)] p-4">
        <div>
          <div className="mb-1 flex items-center justify-between gap-2">
            <label className="block text-xs font-medium uppercase tracking-wide text-[var(--app-text-muted)]">
              Source text
            </label>
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
          <textarea
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            rows={5}
            placeholder="Paste the passage to translate…"
            className={inputCls + ' resize-y font-[inherit]'}
          />
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
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
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--app-text-muted)]">
              To
            </label>
            <select
              value={targetLanguage}
              onChange={(e) => setTargetLanguage(e.target.value)}
              className={inputCls}
            >
              {LANGS.map((l) => (
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

        {/* System-prompt variants */}
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
            production prompt for <span className="font-mono">{targetLanguage}</span>, or load it and
            tweak. Placeholders <span className="font-mono">{'{{LANGUAGE}}'}</span> and{' '}
            <span className="font-mono">{'{{SOURCE_TEXT}}'}</span> are filled at run time;{' '}
            <span className="font-mono">{'{{CONTEXT_SECTION}}'}</span> is blanked (single passage).
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

        {/* Judge options */}
        <div className="flex flex-wrap items-center gap-4 border-t border-[var(--separator-opaque)] pt-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" checked={judge} onChange={(e) => setJudge(e.target.checked)} />
            Score quality (MQM judge)
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

        {judge && (
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

        <div className="flex items-center gap-3">
          <Button onClick={handleRun} disabled={!canRun}>
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            {running
              ? 'Running…'
              : variants.length > 1
                ? `Run (${cellCount} translations)`
                : `Run (${models.length} model${models.length === 1 ? '' : 's'})`}
          </Button>
          {error && <span className="text-sm text-red-600 dark:text-red-400">{error}</span>}
        </div>
      </div>

      {/* ── Results ── */}
      {response && (() => {
        const multiVariant = (response.variants?.length ?? 1) > 1;
        // Group by model so prompt variants for the same model sit side by side.
        const modelOrder = [...new Set(response.results.map((r) => r.model))];
        return (
          <div className="mt-6">
            <div className="mb-3 text-xs text-[var(--app-text-muted)]">
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
              <div className="flex gap-4 text-xs">
                <span>A {r.verdict.adequacy}/5</span>
                <span>F {r.verdict.fluency}/5</span>
                <span>S {r.verdict.style}/5</span>
                {r.mqmPenalty != null && <span>MQM −{r.mqmPenalty}</span>}
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
