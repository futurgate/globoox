import { describe, expect, it } from 'vitest'
import { readReviewText, writeReviewText, type ReviewRun } from '@/lib/studio/reviewText'

describe('visual review text', () => {
  it('opens legacy EPUB emphasis and preserves the original wire format for simple edits', () => {
    const value = 'Я **снова** вижу *море*.'
    expect(writeReviewText(readReviewText(value))).toBe(value)
    expect(readReviewText('2 * 3 и a*b*c')).toEqual([{ text: '2 * 3 и a*b*c' }])
  })

  it.each<[string, ReviewRun[]]>([
    ['literal asterisks', [{ text: '*не курсив* и **не жирный** &' }]],
    ['mixed selection', [{ text: '🎶по' }, { text: 'пе', italic: true }, { text: 'ре', bold: true, italic: true }, { text: 'к', bold: true }]],
    ['multiline', [{ text: 'a\n' }, { text: '**b**' }]],
    ['escaped text', [{ text: '<img> & &lt; **слово**', bold: true, italic: true }]],
    ['untrusted tag-like text', [{ text: '<p data-studio-inline="1"><em>Hi</em></p>' }]],
  ])('round-trips %s', (_, runs) => {
    const value = writeReviewText(runs)
    const restored = readReviewText(value)
    expect(writeReviewText(restored)).toBe(value)
    expect(restored.map(run => run.text).join('')).toBe(runs.map(run => run.text).join(''))
    if (!value.includes('\n')) expect(restored).toEqual(runs)
  })

  it('treats unrecognised input as text', () => {
    const value = '<p data-studio-inline="1"><a href="#">link</a></p>'
    expect(readReviewText(value)).toEqual([{ text: value }])
  })
})
