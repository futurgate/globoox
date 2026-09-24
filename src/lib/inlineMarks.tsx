import React from 'react'
import type { InlineMark } from './api'

/**
 * When the whole block is a single emphasis (e.g. an italic epigraph), return
 * its tag. Used to carry block-level emphasis onto a live translation, where the
 * original offset marks no longer apply. Mirrors the backend helper of the same
 * name. Ignores br marks.
 */
export function wholeBlockEmphasis(text: string, marks?: InlineMark[] | null): 'em' | 'strong' | null {
  if (!marks || !text) return null
  const len = text.length
  for (const m of marks) {
    if (m.t !== 'br' && m.s <= 0 && m.e >= len) return m.t
  }
  return null
}

/**
 * Marks to keep when a block's text is replaced (translation, typographic
 * normalization, pagination split). Offset marks index the *old* text and can't
 * be mapped onto the new one, so we keep only block-level emphasis (re-based to
 * the new length) and drop partial spans. Whole, unchanged text keeps its exact
 * marks via the caller's normal spread — this is only for the swap.
 */
export function carryBlockEmphasis(
  sourceText: string,
  sourceMarks: InlineMark[] | undefined | null,
  newText: string,
): InlineMark[] | undefined {
  const emph = wholeBlockEmphasis(sourceText, sourceMarks)
  return emph && newText ? [{ t: emph, s: 0, e: newText.length }] : undefined
}

/**
 * Render a block's plain text plus inline marks (em/strong/br) as React nodes.
 *
 * Marks are structured data with offsets into `text` — never HTML — so there is
 * no HTML-injection surface (no dangerouslySetInnerHTML). Span marks come from a
 * DOM subtree upstream, so they are well-nested; we rebuild that nesting with a
 * small event stack. Pagination keeps measuring `text.length` (marks add none).
 */
export function renderInlineMarks(text: string, marks?: InlineMark[] | null): React.ReactNode {
  if (!marks || marks.length === 0) return text

  const len = text.length
  type Ev = { off: number; kind: 'open' | 'close' | 'br'; tag?: 'em' | 'strong'; s?: number; e?: number }
  const events: Ev[] = []
  for (const m of marks) {
    if (m.t === 'br') {
      if (m.o > 0 && m.o < len) events.push({ off: m.o, kind: 'br' })
    } else if (m.e > m.s && m.s >= 0 && m.e <= len) {
      events.push({ off: m.s, kind: 'open', tag: m.t, s: m.s, e: m.e })
      events.push({ off: m.e, kind: 'close', tag: m.t, s: m.s, e: m.e })
    }
  }
  if (events.length === 0) return text

  // At the same offset: close spans first, then <br/>, then open spans.
  // Opens: outer (larger end) first. Closes: inner (later start) first.
  const rank = { close: 0, br: 1, open: 2 }
  events.sort((a, b) =>
    a.off - b.off ||
    rank[a.kind] - rank[b.kind] ||
    (a.kind === 'open' ? (b.e! - a.e!) : a.kind === 'close' ? (b.s! - a.s!) : 0)
  )

  type Frame = { tag: 'em' | 'strong' | null; children: React.ReactNode[] }
  const stack: Frame[] = [{ tag: null, children: [] }]
  let cursor = 0
  let key = 0

  const emitText = (upTo: number) => {
    if (upTo > cursor) {
      stack[stack.length - 1].children.push(text.slice(cursor, upTo))
      cursor = upTo
    }
  }

  for (const ev of events) {
    emitText(ev.off)
    const top = stack[stack.length - 1]
    if (ev.kind === 'br') {
      top.children.push(<br key={`b${key++}`} />)
    } else if (ev.kind === 'open') {
      stack.push({ tag: ev.tag!, children: [] })
    } else {
      const frame = stack.pop()!
      const Tag = frame.tag === 'strong' ? 'strong' : 'em'
      stack[stack.length - 1].children.push(
        <Tag key={`m${key++}`}>{frame.children}</Tag>
      )
    }
  }
  emitText(len)

  // Any unbalanced frames (shouldn't happen) collapse into their content.
  while (stack.length > 1) {
    const frame = stack.pop()!
    stack[stack.length - 1].children.push(...frame.children)
  }
  return stack[0].children
}
