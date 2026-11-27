import type { ReaderCheckJournalItem } from './api'

/** Keep the public CSV columns stable for both translation workspaces. */
export function readerCheckJournalRows(items: readonly ReaderCheckJournalItem[]): string[][] {
  return [
    ['Chapter #', 'Chapter', 'Variant', 'Severity', 'Outcome', 'Reason', 'Quote', 'Problem', 'Before', 'After', 'Change', 'Match', 'Score'],
    ...items.map(item => [
      String(item.chapterNumber ?? ''), item.chapterTitle ?? '', item.variant, item.severity, item.outcome,
      item.rejectReason ?? '', item.quote, item.problem, item.before ?? '', item.after ?? '',
      item.changeNote ?? '', item.matchType ?? '', String(item.matchScore ?? ''),
    ]),
  ]
}
