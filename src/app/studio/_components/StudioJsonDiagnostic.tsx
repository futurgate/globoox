import { TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { JsonIssue } from '@/lib/studioJsonDraft';

export function StudioJsonDiagnostic({ issue, raw, id, onOpenJson, showingPrevious }: {
  issue: JsonIssue; raw: string; id: string; onOpenJson?: () => void; showingPrevious?: boolean;
}) {
  const at = issue.offset;
  return <div className="pt-callout grid gap-2" role="alert" id={id}>
    <div className="flex items-start gap-2"><TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true"/>
      <span>{issue.path && <strong>{issue.path}. </strong>}{issue.message}</span></div>
    {!onOpenJson && at != null && <code className="max-w-full overflow-x-auto whitespace-pre text-sm" aria-label="Место ошибки в JSON">
      {raw.slice(Math.max(0,at - 45),at)}<mark className="rounded-sm bg-red-100 text-red-900 underline decoration-wavy">{raw[at] && raw[at].trim() ? raw[at] : '▏'}</mark>{raw.slice(at + 1,at + 46)}
    </code>}
    {onOpenJson && <div className="flex flex-wrap items-center gap-2">
      {showingPrevious && <span>Показана последняя корректная версия.</span>}
      <Button variant="link" size="sm" onClick={onOpenJson}>Исправить JSON</Button>
    </div>}
  </div>;
}
