'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Play, Plus, X, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PageHeader from '@/components/ui/PageHeader';
import { useAuth } from '@/lib/hooks/useAuth';
import {
  runTranslationPlayground,
  type PlaygroundResult,
  type PlaygroundResponse,
} from '@/lib/api';

const LANGS = ['EN', 'FR', 'ES', 'RU'] as const;

// Curated to the Gemini 2.5 GA line — the only ids served on both surfaces the
// backend actually runs: AI Studio (2.5-pro is closed to new keys, so it may
// 404 there) and Vertex/globoox-ai, which only publishes the 2.5 line on
// us-central1 (3.x ids like gemini-3.5-flash / gemini-3.1-pro are NOT enabled
// for this project and 404). Admins can still type any other id in the
// free-text box; enable 3.x in Vertex Model Garden first if you want it.
const DEFAULT_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.5-pro',
];

const JUDGE_MODELS = ['gemini-2.5-flash', 'gemini-2.5-pro'];

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
  const [models, setModels] = useState<string[]>(['gemini-2.5-flash', 'gemini-2.5-pro']);
  const [customModel, setCustomModel] = useState('');
  const [judge, setJudge] = useState(true);
  const [judgeModel, setJudgeModel] = useState('gemini-2.5-flash');
  const [reference, setReference] = useState('');

  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<PlaygroundResponse | null>(null);

  const toggleModel = (m: string) => {
    setModels((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));
  };

  const addCustomModel = () => {
    const m = customModel.trim();
    if (m && !models.includes(m)) setModels((prev) => [...prev, m]);
    setCustomModel('');
  };

  const canRun = sourceText.trim().length > 0 && models.length > 0 && !running;

  const handleRun = async () => {
    if (!canRun) return;
    setRunning(true);
    setError(null);
    setResponse(null);
    try {
      const res = await runTranslationPlayground({
        sourceText: sourceText.trim(),
        targetLanguage,
        sourceLanguage,
        models,
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
        Compare how different LLM models translate the same passage, and optionally score each
        output with the MQM quality judge.
      </p>

      {/* ── Input form ── */}
      <div className="space-y-4 rounded-[var(--radius)] border border-[var(--separator-opaque)] p-4">
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--app-text-muted)]">
            Source text
          </label>
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
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-[var(--app-text-muted)]">
            Models to compare
          </label>
          <div className="flex flex-wrap gap-2">
            {[...new Set([...DEFAULT_MODELS, ...models])].map((m) => {
              const active = models.includes(m);
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
                  {active && !DEFAULT_MODELS.includes(m) && <X className="h-3 w-3" />}
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
                {JUDGE_MODELS.map((m) => (
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
            {running ? 'Running…' : `Run (${models.length} model${models.length === 1 ? '' : 's'})`}
          </Button>
          {error && <span className="text-sm text-red-600 dark:text-red-400">{error}</span>}
        </div>
      </div>

      {/* ── Results ── */}
      {response && (
        <div className="mt-6">
          <div className="mb-3 text-xs text-[var(--app-text-muted)]">
            {response.sourceLanguage ?? '—'} → {response.targetLanguage}
            {response.judged && ` · judged by ${response.judgeModel}`}
            {response.referenceUsed && ' · reference-anchored'}
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {response.results.map((r) => (
              <ResultCard key={r.model} result={r} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ResultCard({ result: r }: { result: PlaygroundResult }) {
  return (
    <div className="flex flex-col rounded-[var(--radius)] border border-[var(--separator-opaque)] p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="truncate font-mono text-sm font-medium">{r.model}</span>
        {r.ok && r.verdict && (
          <span className={'text-lg font-bold tabular-nums ' + scoreColor(r.verdict.overall)}>
            {r.verdict.overall}
          </span>
        )}
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
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{r.translatedText}</p>

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
