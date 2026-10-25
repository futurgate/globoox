'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ShieldAlert, RefreshCw, Save, RotateCcw, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PageHeader from '@/components/ui/PageHeader';
import { useAuth } from '@/lib/hooks/useAuth';
import { listServerPrompts, saveServerPrompt, resetServerPrompt, type ServerPrompt } from '@/lib/api';

const GROUP_LABEL: Record<string, string> = {
  translate: 'Translation',
  glossary: 'Glossary build',
  revise: 'Revision (Pass 2)',
  'reader-check': 'Reader-check',
};
const GROUP_ORDER = ['translate', 'glossary', 'revise', 'reader-check'];

/** Placeholders ({UPPER_CASE}) in the shipped prompt that the draft dropped. */
function missingPlaceholders(shipped: string, draft: string): string[] {
  const required = new Set<string>();
  for (const m of shipped.matchAll(/\{[A-Z0-9_]+\}/g)) required.add(m[0]);
  return [...required].filter((p) => !draft.includes(p));
}

export default function AdminPromptsPage() {
  const router = useRouter();
  const { isAdmin, loading: authLoading, isAuthenticated } = useAuth();

  const [prompts, setPrompts] = useState<ServerPrompt[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [openName, setOpenName] = useState<string | null>(null);
  const [busyName, setBusyName] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await listServerPrompts();
      setPrompts(list);
      // Seed drafts from effective content (only for prompts not currently edited).
      setDrafts((prev) => {
        const next = { ...prev };
        for (const p of list) if (!(p.name in next)) next[p.name] = p.content;
        return next;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load prompts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    void load();
  }, [isAdmin, load]);

  const onSave = useCallback(async (p: ServerPrompt) => {
    const content = drafts[p.name] ?? p.content;
    const missing = missingPlaceholders(p.shipped, content);
    if (missing.length > 0) {
      setError(`${p.name}: missing required placeholder(s): ${missing.join(', ')}. Keep them in the prompt.`);
      return;
    }
    setBusyName(p.name);
    setError(null);
    try {
      await saveServerPrompt(p.name, content);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setBusyName(null);
    }
  }, [drafts, load]);

  const onReset = useCallback(async (p: ServerPrompt) => {
    setBusyName(p.name);
    setError(null);
    try {
      await resetServerPrompt(p.name);
      // Drop the local draft so the reloaded (shipped) content seeds it afresh.
      setDrafts((prev) => { const n = { ...prev }; delete n[p.name]; return n; });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to reset');
    } finally {
      setBusyName(null);
    }
  }, [load]);

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
        <Button variant="outline" size="sm" onClick={() => router.push('/settings')}>Back to settings</Button>
      </div>
    );
  }

  const groups = GROUP_ORDER
    .map((g) => ({ group: g, items: prompts.filter((p) => p.group === g) }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pt-[calc(1rem+env(safe-area-inset-top)+76px)] pb-24">
      <div className="flex items-start justify-between gap-3">
        <PageHeader title="Server prompts" />
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`mr-2 h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <p className="mt-1 text-sm text-[var(--app-text-muted)]">
        These prompts are used by <strong>real</strong> pipeline runs (translation, glossary, revision, reader-check).
        A saved edit is stored on the server and takes effect on the next run — for cached stages (translate/revise),
        re-run with <em>Overwrite</em> to re-generate. Keep the template placeholders (e.g. <code>{'{SOURCE_TEXT}'}</code>,
        <code>{' {GLOSSARY}'}</code>, <code>{' {CHAPTER_TEXT}'}</code>) intact.
      </p>

      {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

      {loading && prompts.length === 0 && (
        <div className="mt-6 flex items-center gap-2 text-sm text-[var(--app-text-muted)]">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      )}

      <div className="mt-6 space-y-6">
        {groups.map(({ group, items }) => (
          <div key={group}>
            <h2 className="mb-2 text-sm font-semibold">{GROUP_LABEL[group] ?? group}</h2>
            <div className="space-y-2">
              {items.map((p) => {
                const open = openName === p.name;
                const draft = drafts[p.name] ?? p.content;
                const dirty = draft !== p.content;
                const busy = busyName === p.name;
                const missing = missingPlaceholders(p.shipped, draft);
                return (
                  <div key={p.name} className="rounded-[var(--radius)] border border-[var(--separator-opaque)]">
                    <button
                      type="button"
                      onClick={() => setOpenName(open ? null : p.name)}
                      className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
                    >
                      <span className="flex items-center gap-2 text-sm">
                        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        <span className="font-medium">{p.label}</span>
                        <code className="text-xs text-[var(--app-text-muted)]">{p.name}</code>
                      </span>
                      <span className="flex items-center gap-2 text-xs">
                        {dirty && <span className="text-amber-600 dark:text-amber-500">unsaved</span>}
                        {p.overridden && (
                          <span className="rounded-full bg-[var(--app-accent)]/15 px-2 py-0.5 text-[var(--app-accent)]">overridden</span>
                        )}
                      </span>
                    </button>

                    {open && (
                      <div className="space-y-2 border-t border-[var(--separator-opaque)] p-3">
                        <textarea
                          value={draft}
                          onChange={(e) => setDrafts((prev) => ({ ...prev, [p.name]: e.target.value }))}
                          spellCheck={false}
                          rows={16}
                          disabled={busy}
                          className="w-full resize-y rounded-[var(--radius)] border border-[var(--separator-opaque)] bg-[var(--app-surface-bg)] p-3 font-mono text-xs leading-relaxed outline-none focus:border-[var(--app-accent)]"
                        />
                        {missing.length > 0 && (
                          <p className="text-xs text-red-500">
                            Missing placeholder(s): {missing.join(', ')} — keep them or Save is blocked.
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-2">
                          <Button size="sm" onClick={() => onSave(p)} disabled={busy || !dirty || missing.length > 0}>
                            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Save (used by real runs)
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDrafts((prev) => ({ ...prev, [p.name]: p.content }))}
                            disabled={busy || !dirty}
                            title="Discard unsaved edits in this editor"
                          >
                            Revert edits
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onReset(p)}
                            disabled={busy || !p.overridden}
                            title="Delete the server override and use the shipped file"
                          >
                            <RotateCcw className="mr-2 h-4 w-4" />
                            Reset to shipped
                          </Button>
                          {p.updatedAt && (
                            <span className="text-xs text-[var(--app-text-muted)]">
                              overridden {new Date(p.updatedAt).toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
