import type { ContentBlock } from '@/lib/api'
import { hasTargetLangText } from '@/lib/translationState'
import { carryBlockEmphasis } from '@/lib/inlineMarks'

export function mergeDisplayBlocksPreservingTranslations(
  prev: ContentBlock[],
  next: ContentBlock[],
  options?: { preserve?: boolean },
): ContentBlock[] {
  if (options?.preserve === false) return next
  if (!prev.length) return next
  const prevById = new Map(prev.map((b) => [b.id, b]))

  return next.map((block) => {
    const prior = prevById.get(block.id)
    if (!prior) return block

    if (!hasTargetLangText(prior)) return block
    if (hasTargetLangText(block)) return block

    if (block.type === 'paragraph' || block.type === 'quote' || block.type === 'heading') {
      const priorText = (prior as typeof block).text
      if (typeof priorText === 'string' && priorText.length > 0) {
        const marks = carryBlockEmphasis(block.text, block.marks, priorText)
        return { ...block, text: priorText, marks, targetLangReady: true, isTranslated: true, is_pending: false }
      }
      return block
    }

    if (block.type === 'list') {
      const priorItems = (prior as typeof block).items
      if (Array.isArray(priorItems) && priorItems.length > 0) {
        return { ...block, items: priorItems, targetLangReady: true, isTranslated: true, is_pending: false }
      }
      return block
    }

    return block
  })
}
