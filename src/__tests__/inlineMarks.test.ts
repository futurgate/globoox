import { describe, expect, it } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { InlineMark } from '@/lib/api'
import { renderInlineMarks, wholeBlockEmphasis, carryBlockEmphasis } from '@/lib/inlineMarks'

function html(text: string, marks?: InlineMark[]): string {
  const markup = renderToStaticMarkup(
    React.createElement('div', null, renderInlineMarks(text, marks))
  )
  return markup.replace(/^<div>/, '').replace(/<\/div>$/, '')
}

describe('renderInlineMarks', () => {
  it('returns plain text when there are no marks', () => {
    expect(html('just text')).toBe('just text')
  })

  it('renders an emphasis span', () => {
    expect(html('Hello world!', [{ t: 'em', s: 6, e: 11 }])).toBe('Hello <em>world</em>!')
  })

  it('renders strong', () => {
    expect(html('A B', [{ t: 'strong', s: 0, e: 1 }])).toBe('<strong>A</strong> B')
  })

  it('renders nested spans in valid order', () => {
    expect(html('a b c', [{ t: 'em', s: 0, e: 5 }, { t: 'strong', s: 2, e: 3 }]))
      .toBe('<em>a <strong>b</strong> c</em>')
  })

  it('renders a line break', () => {
    expect(html('Line oneLine two', [{ t: 'br', o: 8 }])).toBe('Line one<br/>Line two')
  })

  it('does not inject HTML from the text (escapes)', () => {
    expect(html('<script>', [{ t: 'em', s: 0, e: 8 }])).toBe('<em>&lt;script&gt;</em>')
  })
})

describe('wholeBlockEmphasis', () => {
  it('detects block-spanning emphasis', () => {
    expect(wholeBlockEmphasis('whole', [{ t: 'em', s: 0, e: 5 }])).toBe('em')
  })
  it('ignores partial spans', () => {
    expect(wholeBlockEmphasis('a b c', [{ t: 'em', s: 2, e: 3 }])).toBeNull()
  })
})

describe('carryBlockEmphasis (text-swap safety)', () => {
  it('re-bases whole-block emphasis to the new text length', () => {
    // original fully italic → new (translated) text keeps italic across its own length
    expect(carryBlockEmphasis('mysl', [{ t: 'em', s: 0, e: 4 }], 'мысль целиком'))
      .toEqual([{ t: 'em', s: 0, e: 13 }])
  })
  it('drops partial spans on a swap (no misalignment)', () => {
    expect(carryBlockEmphasis('a word here', [{ t: 'em', s: 2, e: 6 }], 'translated')).toBeUndefined()
  })
  it('returns undefined when the source had no marks (old books)', () => {
    expect(carryBlockEmphasis('plain', undefined, 'plain2')).toBeUndefined()
  })
})
