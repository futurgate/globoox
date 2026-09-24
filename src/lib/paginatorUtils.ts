import { ContentBlock, ParagraphBlock } from './api'
import { carryBlockEmphasis as fragmentMarks } from './inlineMarks'
import { getLineHeightMultiplier, getLineHeightStyle } from './readerTypography'
import { READER_THEME_CONFIGS, type ReaderThemeConfig, getReaderHeadingTypography, getReaderWeightClass, type ReaderThemeId } from './readerTheme'

const PAGE_HEIGHT_BUFFER_PX = 6
const PARAGRAPH_FRAGMENT_LAST_CLASS = 'mb-2'
const PARAGRAPH_FRAGMENT_MIDDLE_CLASS = 'mb-0'
const MIN_PARAGRAPH_LINES_AT_PAGE_BOTTOM = 2
const MIN_PARAGRAPH_LINES_AT_PAGE_TOP = 3
const MIN_LIST_ITEMS_AT_PAGE_BOTTOM = 2
const PAGINATION_TRACE_LIMIT = 200
const PARAGRAPH_KEEP_WITH_NEXT_TYPES = new Set<ContentBlock['type']>(['hr', 'list', 'quote'])

type PaginationHeadingTraceEvent = {
  ts: number
  pageSize: number
  headingId: string
  headingLevel?: number
  nextType?: string
  nextLevel?: number
  action: string
  note?: string
}

function pushHeadingTrace(event: PaginationHeadingTraceEvent): void {
  if (process.env.NODE_ENV !== 'development') return
  if (typeof window === 'undefined') return
  const w = window as Window & { __PAGINATION_HEADING_TRACE__?: PaginationHeadingTraceEvent[] }
  const arr = w.__PAGINATION_HEADING_TRACE__ ?? []
  arr.push(event)
  if (arr.length > PAGINATION_TRACE_LIMIT) {
    arr.splice(0, arr.length - PAGINATION_TRACE_LIMIT)
  }
  w.__PAGINATION_HEADING_TRACE__ = arr
}

interface SplitResult {
  firstPart: string
  restPart: string
}

export interface ComputedPagesResult {
  pages: string[][]
  finalBlocks: ContentBlock[]
  fragmentMap: Map<string, string>
}

type MeasuredBlockRoots = Map<string, HTMLElement>

export function normalizeBlocks(blocks: ContentBlock[]): ContentBlock[] {
  const result: ContentBlock[] = []
  for (const block of blocks) {
    if (block.type === 'list') {
      block.items.forEach((item, index) => {
        result.push({
          id: `${block.id}-item-${index}`,
          type: 'list',
          position: block.position,
          ordered: block.ordered,
          items: [item],
          parentId: block.id,
          partIndex: index,
          isFirstPart: index === 0,
          isLastPart: index === block.items.length - 1,
          targetLangReady: block.targetLangReady,
          isTranslated: block.isTranslated,
          is_pending: block.is_pending,
        })
      })
    } else {
      result.push(block)
    }
  }
  return result
}

export function splitSentences(text: string): string[] {
  const protected_ = text.replace(/\b(Mr|Mrs|Ms|Dr|Prof|Sr|Jr|vs|etc|e\.g|i\.e|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\./gi, '$1\x00')
  const sentences: string[] = []
  const parts = protected_.split(/(?<=[.!?])\s+/)
  for (const part of parts) {
    const s = part.replace(/\x00/g, '.').trim()
    if (s) sentences.push(s)
  }
  return sentences.length > 0 ? sentences : [text]
}

function applyParagraphStyles(
  el: HTMLElement,
  fontSize: number,
  lang: string,
  isLastPart: boolean,
  lineHeightScale: number,
  bodyWeightClass: string,
) {
  el.className = `${isLastPart ? PARAGRAPH_FRAGMENT_LAST_CLASS : PARAGRAPH_FRAGMENT_MIDDLE_CLASS} ${bodyWeightClass}`
  if (fontSize) el.style.fontSize = `${fontSize}px`
  el.style.lineHeight = getLineHeightStyle(fontSize, lineHeightScale)
  el.setAttribute('lang', lang)
  el.style.hyphens = 'auto'
  el.style.setProperty('-webkit-hyphens', 'auto')
}

function createBlockElement(
  block: ContentBlock,
  fontSize: number,
  lang: string,
  lineHeightScale: number,
  readerThemeConfig: ReaderThemeConfig,
): HTMLElement {
  const bodyWeightClass = getReaderWeightClass(readerThemeConfig.typography.bodyWeight)
  switch (block.type) {
    case 'paragraph': {
      const el = document.createElement('p')
      applyParagraphStyles(el, fontSize, lang, block.isLastPart ?? true, lineHeightScale, bodyWeightClass)
      el.textContent = block.text
      return el
    }
    case 'heading': {
      const normalizedLevel = Math.max(1, Math.min(6, Number(block.level) || 1))
      const tag = `h${normalizedLevel}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
      const headingTypography = getReaderHeadingTypography(normalizedLevel, readerThemeConfig)
      const el = document.createElement(tag)
      el.className = headingTypography.className
      if (fontSize) el.style.fontSize = `${fontSize * headingTypography.sizeScale}px`
      if (headingTypography.italic) el.style.fontStyle = 'italic'
      el.textContent = block.text
      return el
    }
    case 'quote': {
      const el = document.createElement('blockquote')
      el.className = `border-l-1 border-primary pl-3 my-4 italic text-foreground/80 ${bodyWeightClass}`
      if (fontSize) el.style.fontSize = `${fontSize}px`
      el.textContent = block.text
      return el
    }
    case 'list': {
      const tag = block.ordered ? 'ol' : 'ul'
      const el = document.createElement(tag)
      el.className = `${block.ordered ? 'list-decimal' : 'list-disc'} pl-6 ${(block.isLastPart ?? true) ? 'mb-3' : 'mb-1'} space-y-1 ${bodyWeightClass}`
      if (fontSize) el.style.fontSize = `${fontSize}px`
      if (block.ordered && block.partIndex !== undefined) {
        el.setAttribute('start', String(block.partIndex + 1))
      }
      for (const item of block.items) {
        const li = document.createElement('li')
        li.style.lineHeight = getLineHeightStyle(fontSize, lineHeightScale)
        li.style.hyphens = 'auto'
        li.style.setProperty('-webkit-hyphens', 'auto')
        li.textContent = item
        el.appendChild(li)
      }
      return el
    }
    case 'image': {
      const el = document.createElement('figure')
      el.className = 'my-4'
      return el
    }
    case 'hr': {
      const el = document.createElement('hr')
      el.className = 'my-5 border-border'
      return el
    }
  }
}

function wrapMeasuredElement(child: HTMLElement): HTMLDivElement {
  const wrapper = document.createElement('div')
  wrapper.className = 'flow-root'
  wrapper.appendChild(child)
  return wrapper
}

function cloneMeasuredWrapper(
  blockId: string,
  measuredBlockRoots?: MeasuredBlockRoots,
): HTMLDivElement | null {
  const source = measuredBlockRoots?.get(blockId)
  if (!source) return null
  return source.cloneNode(true) as HTMLDivElement
}

function createMeasuredWrapper(
  block: ContentBlock,
  fontSize: number,
  lang: string,
  lineHeightScale: number,
  readerThemeConfig: ReaderThemeConfig,
  measuredBlockRoots?: MeasuredBlockRoots,
): HTMLDivElement {
  return cloneMeasuredWrapper(block.id, measuredBlockRoots) ?? wrapMeasuredElement(createBlockElement(block, fontSize, lang, lineHeightScale, readerThemeConfig))
}

function createParagraphMeasuredWrapper(
  sourceBlockId: string,
  text: string,
  fontSize: number,
  lang: string,
  isLastPart: boolean,
  lineHeightScale: number,
  bodyWeightClass: string,
  measuredBlockRoots?: MeasuredBlockRoots,
): HTMLDivElement {
  const clone = cloneMeasuredWrapper(sourceBlockId, measuredBlockRoots)
  if (clone) {
    const paragraph = clone.querySelector('p')
    if (paragraph) {
      applyParagraphStyles(paragraph, fontSize, lang, isLastPart, lineHeightScale, bodyWeightClass)
      paragraph.textContent = text
      return clone
    }
  }

  const paragraph = document.createElement('p')
  applyParagraphStyles(paragraph, fontSize, lang, isLastPart, lineHeightScale, bodyWeightClass)
  paragraph.textContent = text
  return wrapMeasuredElement(paragraph)
}

interface ProbeHandle {
  host: HTMLDivElement
  page: HTMLDivElement
}

function createProbe(
  containerRef: HTMLElement,
  effectiveHeight: number,
  lang: string,
  pageWidthPx?: number,
  pageShellClassName = 'reader-page container max-w-2xl mx-auto px-4 h-full',
): ProbeHandle {
  const doc = containerRef.ownerDocument
  const host = doc.createElement('div')
  host.style.position = 'fixed'
  host.style.left = '0'
  host.style.right = '0'
  host.style.top = '-20000px'
  host.style.visibility = 'hidden'
  host.style.pointerEvents = 'none'
  host.style.zIndex = '-1'
  host.style.overflow = 'hidden'

  const page = doc.createElement('div')
  page.className = pageShellClassName
  page.setAttribute('lang', lang)
  page.style.height = `${effectiveHeight}px`
  if (pageWidthPx && pageWidthPx > 0) {
    page.style.width = `${pageWidthPx}px`
  }
  page.style.overflowY = 'hidden'
  page.style.overflowX = 'hidden'

  host.appendChild(page)
  doc.body.appendChild(host)
  return { host, page }
}

function fitsProbe(probe: HTMLElement, effectiveHeight: number): boolean {
  const lastChild = probe.lastElementChild as HTMLElement | null
  const fitsByScroll = probe.scrollHeight <= effectiveHeight + 0.5
  if (!lastChild) return fitsByScroll
  const probeRect = probe.getBoundingClientRect()
  const lastRect = lastChild.getBoundingClientRect()
  const fitsByRect = lastRect.bottom <= probeRect.top + effectiveHeight + 0.5
  return fitsByRect && fitsByScroll
}

function isWhitespace(char: string): boolean {
  return /\s/.test(char)
}

function trimSplitParts(text: string, splitIndex: number): SplitResult {
  return {
    firstPart: text.slice(0, splitIndex).trimEnd(),
    restPart: text.slice(splitIndex).trimStart(),
  }
}

function findSafeWordBoundary(text: string, preferredIndex: number): number {
  if (preferredIndex <= 0 || preferredIndex >= text.length) {
    return preferredIndex
  }

  let boundary = preferredIndex
  while (boundary > 0 && !isWhitespace(text[boundary - 1]!)) {
    boundary--
  }

  if (boundary <= 0) return preferredIndex

  const minAcceptedBoundary = Math.max(16, Math.floor(preferredIndex * 0.65))
  return boundary >= minAcceptedBoundary ? boundary : preferredIndex
}

function isTinyParagraphFragment(text: string): boolean {
  const trimmed = text.trim()
  if (!trimmed) return true
  const words = trimmed.split(/\s+/).filter(Boolean)
  return words.length <= 2 || trimmed.length < 24
}

function countRenderedLines(el: HTMLElement): number {
  const computed = getComputedStyle(el)
  const lineHeight = Number.parseFloat(computed.lineHeight || '')
  const height = el.getBoundingClientRect().height
  if (!Number.isFinite(lineHeight) || lineHeight <= 0) return 1
  return Math.max(1, Math.round(height / lineHeight))
}

function measureParagraphLinesInProbe(
  probe: HTMLElement,
  sourceBlockId: string,
  text: string,
  fontSize: number,
  lang: string,
  isLastPart: boolean,
  lineHeightScale: number,
  bodyWeightClass: string,
  measuredBlockRoots?: MeasuredBlockRoots,
): number {
  const wrapper = createParagraphMeasuredWrapper(
    sourceBlockId,
    text,
    fontSize,
    lang,
    isLastPart,
    lineHeightScale,
    bodyWeightClass,
    measuredBlockRoots,
  )
  probe.appendChild(wrapper)
  const paragraph = wrapper.querySelector('p') as HTMLParagraphElement | null
  const lines = paragraph ? countRenderedLines(paragraph) : 1
  probe.removeChild(wrapper)
  return lines
}

function violatesParagraphWidowOrphan(
  probe: HTMLElement,
  sourceBlockId: string,
  firstText: string,
  restText: string,
  fontSize: number,
  lang: string,
  lineHeightScale: number,
  bodyWeightClass: string,
  measuredBlockRoots?: MeasuredBlockRoots,
): boolean {
  if (!restText.trim()) return false
  const firstLines = measureParagraphLinesInProbe(
    probe,
    sourceBlockId,
    firstText,
    fontSize,
    lang,
    false,
    lineHeightScale,
    bodyWeightClass,
    measuredBlockRoots,
  )
  const restLines = measureParagraphLinesInProbe(
    probe,
    sourceBlockId,
    restText,
    fontSize,
    lang,
    false,
    lineHeightScale,
    bodyWeightClass,
    measuredBlockRoots,
  )
  return firstLines < MIN_PARAGRAPH_LINES_AT_PAGE_BOTTOM || restLines < MIN_PARAGRAPH_LINES_AT_PAGE_TOP
}

function fitParagraphByDom(
  text: string,
  probe: HTMLElement,
  effectiveHeight: number,
  fontSize: number,
  lang: string,
  lineHeightScale: number,
  sourceBlockId: string,
  bodyWeightClass: string,
  measuredBlockRoots?: MeasuredBlockRoots,
): SplitResult {
  const normalizedText = text.trim()
  if (!normalizedText) {
    return { firstPart: '', restPart: '' }
  }

  const wrapper = createParagraphMeasuredWrapper(sourceBlockId, '', fontSize, lang, false, lineHeightScale, bodyWeightClass, measuredBlockRoots)
  const candidate = wrapper.querySelector('p') as HTMLParagraphElement | null
  if (!candidate) {
    return { firstPart: '', restPart: normalizedText }
  }
  probe.appendChild(wrapper)

  const fitsText = (candidateText: string, isLastPart = false): boolean => {
    candidate.className = `${isLastPart ? PARAGRAPH_FRAGMENT_LAST_CLASS : PARAGRAPH_FRAGMENT_MIDDLE_CLASS} ${bodyWeightClass}`
    candidate.textContent = candidateText
    return fitsProbe(probe, effectiveHeight)
  }

  let low = 1
  let high = normalizedText.length
  let bestSplit = 0

  while (low <= high) {
    const mid = Math.floor((low + high) / 2)
    const testText = normalizedText.slice(0, mid).trimEnd()
    if (!testText) {
      low = mid + 1
      continue
    }
    if (fitsText(testText, mid >= normalizedText.length)) {
      bestSplit = mid
      low = mid + 1
    } else {
      high = mid - 1
    }
  }

  if (bestSplit <= 0) {
    probe.removeChild(wrapper)
    return { firstPart: '', restPart: normalizedText }
  }

  let bestResult = trimSplitParts(normalizedText, bestSplit)
  const safeBoundary = findSafeWordBoundary(normalizedText, bestSplit)
  if (safeBoundary > 0 && safeBoundary < normalizedText.length) {
    const safeResult = trimSplitParts(normalizedText, safeBoundary)
    if (safeResult.firstPart && fitsText(safeResult.firstPart, false)) {
      bestResult = safeResult
    }
  }

  if (!bestResult.restPart) {
    probe.removeChild(wrapper)
    return bestResult
  }

  // Manual intra-word hyphen split between pages is disabled.
  // Line-level hyphenation remains browser-driven via CSS (`hyphens: auto`).

  probe.removeChild(wrapper)
  return bestResult
}

function computePagesDom(
  blocks: ContentBlock[],
  pageHeight: number,
  containerRef: HTMLElement,
  fontSize: number,
  lang: string,
  lineHeightScale: number,
  minBlocksPerPage: number,
  readerThemeConfig: ReaderThemeConfig,
  measuredBlockRoots?: MeasuredBlockRoots,
  pageWidthPx?: number,
  pageShellClassName?: string,
): ComputedPagesResult {
  const bodyWeightClass = getReaderWeightClass(readerThemeConfig.typography.bodyWeight)
  const effectiveHeight = Math.max(1, pageHeight - PAGE_HEIGHT_BUFFER_PX)
  const pages: string[][] = []
  const finalBlocks: ContentBlock[] = []
  const fragmentMap = new Map<string, string>()
  const probeHandle = createProbe(containerRef, effectiveHeight, lang, pageWidthPx, pageShellClassName)
  const probe = probeHandle.page

  let currentPage: string[] = []

  const resetProbe = () => {
    probe.replaceChildren()
  }

  const pushCurrentPage = () => {
    if (currentPage.length > 0) {
      pages.push(currentPage)
      currentPage = []
      resetProbe()
    }
  }

  try {
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i]
      const prevBlock = i > 0 ? blocks[i - 1] : undefined
      const isHeadingRunStart = block.type === 'heading' && (!prevBlock || prevBlock.type !== 'heading')
      const nextBlock = i + 1 < blocks.length ? blocks[i + 1] : undefined

      // Rule: each heading run starts on a new page.
      // Apply only before the first heading in consecutive heading chains.
      if (isHeadingRunStart && currentPage.length > 0) {
        pushHeadingTrace({
          ts: Date.now(),
          pageSize: currentPage.length,
          headingId: block.id,
          headingLevel: block.type === 'heading' ? block.level : undefined,
          nextType: nextBlock?.type,
          nextLevel: nextBlock?.type === 'heading' ? nextBlock.level : undefined,
          action: 'forced_page_break_before_heading_run',
        })
        pushCurrentPage()
      }

      // Special case: h1 followed by h2 starts a chapter section.
      // Keep h1 on its own centered page by forcing a break right after h1.
      if (
        isHeadingRunStart &&
        block.type === 'heading' &&
        block.level === 1 &&
        nextBlock &&
        nextBlock.type === 'heading' &&
        nextBlock.level === 2
      ) {
        const h1Node = createMeasuredWrapper(block, fontSize, lang, lineHeightScale, readerThemeConfig, measuredBlockRoots)
        probe.appendChild(h1Node)
        if (!fitsProbe(probe, effectiveHeight)) {
          probe.removeChild(h1Node)
          pushCurrentPage()
          probe.appendChild(h1Node)
        }
        currentPage.push(block.id)
        finalBlocks.push(block)
        pushCurrentPage()
        continue
      }

      // Atomic heading-run placement: if 2+ consecutive headings fit, place them as a package.
      if (isHeadingRunStart) {
        let runEnd = i
        while (runEnd + 1 < blocks.length && blocks[runEnd + 1].type === 'heading') {
          runEnd++
        }
        if (runEnd > i) {
          const runNodes: HTMLDivElement[] = []
          let runFits = true
          for (let j = i; j <= runEnd; j++) {
            const headingNode = createMeasuredWrapper(blocks[j], fontSize, lang, lineHeightScale, readerThemeConfig, measuredBlockRoots)
            probe.appendChild(headingNode)
            runNodes.push(headingNode)
            if (!fitsProbe(probe, effectiveHeight)) {
              runFits = false
              break
            }
          }

          if (runFits) {
            pushHeadingTrace({
              ts: Date.now(),
              pageSize: currentPage.length,
              headingId: block.id,
              headingLevel: block.type === 'heading' ? block.level : undefined,
              nextType: nextBlock?.type,
              nextLevel: nextBlock?.type === 'heading' ? nextBlock.level : undefined,
              action: 'heading_run_atomic_fit',
              note: `run=${runEnd - i + 1}`,
            })
            for (let j = i; j <= runEnd; j++) {
              currentPage.push(blocks[j].id)
              finalBlocks.push(blocks[j])
            }
            i = runEnd
            continue
          }

          // Cleanup and fallback to regular single-block logic below.
          pushHeadingTrace({
            ts: Date.now(),
            pageSize: currentPage.length,
            headingId: block.id,
            headingLevel: block.type === 'heading' ? block.level : undefined,
            nextType: nextBlock?.type,
            nextLevel: nextBlock?.type === 'heading' ? nextBlock.level : undefined,
            action: 'heading_run_atomic_not_fit',
            note: `run=${runEnd - i + 1}`,
          })
          for (const node of runNodes) {
            if (node.parentElement === probe) probe.removeChild(node)
          }
        }
      }

      if (block.type !== 'paragraph') {
        const node = createMeasuredWrapper(block, fontSize, lang, lineHeightScale, readerThemeConfig, measuredBlockRoots)
        probe.appendChild(node)
        if (fitsProbe(probe, effectiveHeight) || currentPage.length < minBlocksPerPage) {
          // List lookahead: avoid starting list at page bottom with a single list item.
          if (block.type === 'list' && currentPage.length >= minBlocksPerPage) {
            const blockParentId = block.parentId ?? block.id
            const prevId = currentPage[currentPage.length - 1]
            const prevBlock = finalBlocks.length > 0 ? finalBlocks[finalBlocks.length - 1] : undefined
            const startsNewListOnPage = !prevId || !prevBlock || prevBlock.type !== 'list' || (prevBlock.parentId ?? prevBlock.id) !== blockParentId
            const nextBlock = blocks[i + 1]
            const nextSameList = !!nextBlock && nextBlock.type === 'list' && (nextBlock.parentId ?? nextBlock.id) === blockParentId
            if (startsNewListOnPage && nextSameList && MIN_LIST_ITEMS_AT_PAGE_BOTTOM > 1) {
              const nextNode = createMeasuredWrapper(nextBlock!, fontSize, lang, lineHeightScale, readerThemeConfig, measuredBlockRoots)
              probe.appendChild(nextNode)
              const nextFits = fitsProbe(probe, effectiveHeight)
              probe.removeChild(nextNode)
              if (!nextFits) {
                probe.removeChild(node)
                pushCurrentPage()
                probe.appendChild(node)
              }
            }
          }

          // Keep consecutive headings together.
          if (block.type === 'heading') {
            // 1) Keep consecutive headings on the same page.
            let lookaheadIndex = i + 1
            while (lookaheadIndex < blocks.length && blocks[lookaheadIndex].type === 'heading') {
              const nextHeadingNode = createMeasuredWrapper(
                blocks[lookaheadIndex],
                fontSize,
                lang,
                lineHeightScale,
                readerThemeConfig,
                measuredBlockRoots,
              )
              probe.appendChild(nextHeadingNode)
              const headingFits = fitsProbe(probe, effectiveHeight)
              probe.removeChild(nextHeadingNode)
              if (!headingFits) {
                const lookaheadBlock = blocks[lookaheadIndex]
                const lookaheadHeadingLevel = lookaheadBlock && lookaheadBlock.type === 'heading' ? lookaheadBlock.level : undefined
                pushHeadingTrace({
                  ts: Date.now(),
                  pageSize: currentPage.length,
                  headingId: block.id,
                  headingLevel: block.type === 'heading' ? block.level : undefined,
                  nextType: lookaheadBlock?.type,
                  nextLevel: lookaheadHeadingLevel,
                  action: 'heading_lookahead_not_fit',
                })
                probe.removeChild(node)
                pushCurrentPage()
                probe.appendChild(node)
                break
              }
              lookaheadIndex++
            }
          }
          if (block.type === 'heading') {
            const nextHeadingLevel = nextBlock && nextBlock.type === 'heading' ? nextBlock.level : undefined
            pushHeadingTrace({
              ts: Date.now(),
              pageSize: currentPage.length,
              headingId: block.id,
              headingLevel: block.level,
              nextType: nextBlock?.type,
              nextLevel: nextHeadingLevel,
              action: 'heading_added_to_page',
            })
          }
          currentPage.push(block.id)
          finalBlocks.push(block)
          continue
        }

        probe.removeChild(node)
        if (block.type === 'heading') {
          pushHeadingTrace({
            ts: Date.now(),
            pageSize: currentPage.length,
            headingId: block.id,
            headingLevel: block.level,
            nextType: nextBlock?.type,
            nextLevel: nextBlock?.type === 'heading' ? nextBlock.level : undefined,
            action: 'heading_overflow_new_page',
          })
        }
        pushCurrentPage()
        probe.appendChild(node)
        currentPage.push(block.id)
        finalBlocks.push(block)
        continue
      }

      let remainingText = block.text
      let partIndex = block.partIndex ?? 0
      const allSentences = splitSentences(block.text)

      while (remainingText.trim()) {
        const wholeNode = createParagraphMeasuredWrapper(
          block.id,
          remainingText,
          fontSize,
          lang,
          block.isLastPart ?? true,
          lineHeightScale,
          bodyWeightClass,
          measuredBlockRoots,
        )
        probe.appendChild(wholeNode)
        if (fitsProbe(probe, effectiveHeight)) {
          // Keep paragraph with the immediately following structural block
          // (hr/list/quote) to avoid awkward page starts.
          const nextBlock = blocks[i + 1]
          const shouldKeepWithNext =
            !!nextBlock &&
            PARAGRAPH_KEEP_WITH_NEXT_TYPES.has(nextBlock.type) &&
            currentPage.length >= minBlocksPerPage
          if (shouldKeepWithNext) {
            const nextNode = createMeasuredWrapper(nextBlock!, fontSize, lang, lineHeightScale, readerThemeConfig, measuredBlockRoots)
            probe.appendChild(nextNode)
            const nextFits = fitsProbe(probe, effectiveHeight)
            probe.removeChild(nextNode)
            if (!nextFits) {
              probe.removeChild(wholeNode)
              pushCurrentPage()
              continue
            }
          }

          const finalId = partIndex === (block.partIndex ?? 0) ? block.id : `${block.id}-part-${partIndex}`
          const isFirstPart = (block.isFirstPart ?? true) && partIndex === (block.partIndex ?? 0)
          const finalBlock: ParagraphBlock & { sentenceIndex: number } = {
            ...block,
            id: finalId,
            text: remainingText,
            marks: fragmentMarks(block.text, block.marks, remainingText),
            parentId: block.parentId ?? block.id,
            partIndex,
            isFirstPart,
            isLastPart: true,
            sentenceIndex: Math.min(allSentences.length - 1, 0),
          }
          if (finalId !== block.id) {
            fragmentMap.set(finalId, finalBlock.parentId!)
          }
          currentPage.push(finalBlock.id)
          finalBlocks.push(finalBlock)
          remainingText = ''
          break
        }
        probe.removeChild(wholeNode)

        const split = fitParagraphByDom(
          remainingText,
          probe,
          effectiveHeight,
          fontSize,
          lang,
          lineHeightScale,
          block.id,
          bodyWeightClass,
          measuredBlockRoots,
        )
        const forcedFirstWord = !split.firstPart.trim()
        const firstText = forcedFirstWord
          ? remainingText.split(/\s+/).slice(0, 1).join(' ')
          : split.firstPart.trim()
        const restText = forcedFirstWord
          ? remainingText.split(/\s+/).slice(1).join(' ')
          : split.restPart.trim()

        if (!firstText) {
          pushCurrentPage()
          continue
        }

        if (currentPage.length > 0 && restText && isTinyParagraphFragment(firstText)) {
          pushCurrentPage()
          continue
        }

        if (
          currentPage.length > 0 &&
          restText &&
          violatesParagraphWidowOrphan(
            probe,
            block.id,
            firstText,
            restText,
            fontSize,
            lang,
            lineHeightScale,
            bodyWeightClass,
            measuredBlockRoots,
          )
        ) {
          pushCurrentPage()
          continue
        }

        const isFirstPart = (block.isFirstPart ?? true) && partIndex === (block.partIndex ?? 0)
        const isLastPart = (block.isLastPart ?? true) && !restText
        const fragmentId = `${block.id}-part-${partIndex}`

        const offsetInBlock = block.text.length - remainingText.length
        let sentenceIndex = 0
        let runningLen = 0
        for (let si = 0; si < allSentences.length; si++) {
          if (runningLen >= offsetInBlock) {
            sentenceIndex = si
            break
          }
          runningLen += allSentences[si].length + 1
          sentenceIndex = si + 1
        }
        sentenceIndex = Math.min(sentenceIndex, allSentences.length - 1)

        const fragmentBlock: ParagraphBlock & { sentenceIndex: number } = {
          ...block,
          id: fragmentId,
          text: firstText,
          marks: fragmentMarks(block.text, block.marks, firstText),
          parentId: block.parentId ?? block.id,
          partIndex,
          isFirstPart,
          isLastPart,
          sentenceIndex,
        }

        const fragmentNode = createParagraphMeasuredWrapper(
          block.id,
          fragmentBlock.text,
          fontSize,
          lang,
          fragmentBlock.isLastPart ?? false,
          lineHeightScale,
          bodyWeightClass,
          measuredBlockRoots,
        )
        probe.appendChild(fragmentNode)
        currentPage.push(fragmentId)
        finalBlocks.push(fragmentBlock)
        fragmentMap.set(fragmentId, fragmentBlock.parentId!)

        if (restText) {
          pushCurrentPage()
        }

        remainingText = restText
        partIndex++
      }
    }

    if (currentPage.length > 0) {
      pages.push(currentPage)
    }

    return { pages, finalBlocks, fragmentMap }
  } finally {
    probeHandle.host.remove()
  }
}

function measureTextHeight(text: string, tempEl: HTMLElement): number {
  tempEl.textContent = text
  return tempEl.offsetHeight
}

function measureParagraphFragmentHeight(
  text: string,
  fontSize: number,
  lang: string,
  lineHeightScale: number,
  containerRef: HTMLElement,
  isLastPart: boolean,
  bodyWeightClass: string,
): number {
  const temp = document.createElement('p')
  applyParagraphStyles(temp, fontSize, lang, isLastPart, lineHeightScale, bodyWeightClass)
  temp.style.position = 'absolute'
  temp.style.visibility = 'hidden'
  temp.style.width = '100%'
  containerRef.appendChild(temp)
  const height = measureTextHeight(text, temp)
  containerRef.removeChild(temp)
  return height
}

function splitParagraphByHeight(
  text: string,
  availableHeight: number,
  fontSize: number,
  lang: string,
  lineHeightScale: number,
  containerRef: HTMLElement,
  bodyWeightClass: string,
): SplitResult {
  const words = text.split(/\s+/)
  if (words.length <= 1) {
    return { firstPart: text, restPart: '' }
  }

  const temp = document.createElement('p')
  applyParagraphStyles(temp, fontSize, lang, false, lineHeightScale, bodyWeightClass)
  temp.style.position = 'absolute'
  temp.style.visibility = 'hidden'
  temp.style.width = '100%'
  containerRef.appendChild(temp)

  let low = 0
  let high = words.length
  let best = 0

  while (low <= high) {
    const mid = Math.floor((low + high) / 2)
    const testText = words.slice(0, mid).join(' ')
    temp.className = `${mid === words.length ? PARAGRAPH_FRAGMENT_LAST_CLASS : PARAGRAPH_FRAGMENT_MIDDLE_CLASS} ${bodyWeightClass}`
    const h = measureTextHeight(testText, temp)

    if (h <= availableHeight) {
      best = mid
      low = mid + 1
    } else {
      high = mid - 1
    }
  }

  const firstPart = words.slice(0, best).join(' ')
  const restWords = words.slice(best)

  // Manual intra-word hyphen split is disabled in fallback mode too.

  containerRef.removeChild(temp)
  return { firstPart, restPart: restWords.join(' ') }
}

function computePagesFallback(
  blocks: ContentBlock[],
  blockHeights: Map<string, number>,
  pageHeight: number,
  containerRef: HTMLElement | null,
  fontSize: number,
  lang: string,
  lineHeightScale: number,
  minBlocksPerPage: number,
  readerThemeConfig: ReaderThemeConfig,
): ComputedPagesResult {
  const bodyWeightClass = getReaderWeightClass(readerThemeConfig.typography.bodyWeight)
  const effectiveHeight = containerRef ? Math.max(1, pageHeight - PAGE_HEIGHT_BUFFER_PX) : pageHeight
  const pages: string[][] = []
  let currentPage: string[] = []
  let currentHeight = 0
  const finalBlocks: ContentBlock[] = []
  const fragmentMap = new Map<string, string>()
  const lineHeightPx = fontSize * getLineHeightMultiplier(fontSize, lineHeightScale)
  const estimateLinesByHeight = (height: number) => Math.max(1, Math.round(height / lineHeightPx))

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]
    const prevBlock = i > 0 ? blocks[i - 1] : undefined
    const isHeadingRunStart = block.type === 'heading' && (!prevBlock || prevBlock.type !== 'heading')
    const nextBlock = i + 1 < blocks.length ? blocks[i + 1] : undefined

    // Rule: each heading run starts on a new page.
    if (isHeadingRunStart && currentPage.length > 0) {
      pages.push(currentPage)
      currentPage = []
      currentHeight = 0
    }

    if (
      isHeadingRunStart &&
      block.type === 'heading' &&
      block.level === 1 &&
      nextBlock &&
      nextBlock.type === 'heading' &&
      nextBlock.level === 2
    ) {
      const h = blockHeights.get(block.id) ?? 48
      currentPage.push(block.id)
      finalBlocks.push(block)
      currentHeight = h
      pages.push(currentPage)
      currentPage = []
      currentHeight = 0
      continue
    }

    if (isHeadingRunStart) {
      let runEnd = i
      while (runEnd + 1 < blocks.length && blocks[runEnd + 1].type === 'heading') {
        runEnd++
      }
      if (runEnd > i && currentHeight === 0) {
        let runHeight = 0
        for (let j = i; j <= runEnd; j++) {
          runHeight += blockHeights.get(blocks[j].id) ?? 48
        }
        if (runHeight <= effectiveHeight) {
          for (let j = i; j <= runEnd; j++) {
            const hb = blocks[j]
            currentPage.push(hb.id)
            finalBlocks.push(hb)
            currentHeight += blockHeights.get(hb.id) ?? 48
          }
          i = runEnd
          continue
        }
      }
    }

    const h = blockHeights.get(block.id) ?? 48

    if (block.type === 'heading' && i < blocks.length - 1) {
      // Keep consecutive headings together in fallback mode too.
      let headingRunHeight = h
      let j = i + 1
      while (j < blocks.length && blocks[j].type === 'heading') {
        headingRunHeight += blockHeights.get(blocks[j].id) ?? 48
        j++
      }
      if (headingRunHeight > h && currentHeight + headingRunHeight > effectiveHeight && currentPage.length > 0) {
        pages.push(currentPage)
        currentPage = []
        currentHeight = 0
      }

      const nextBlock = blocks[i + 1]
      let nextH = blockHeights.get(nextBlock.id) ?? 48
      if (nextBlock.type === 'paragraph' && containerRef) {
        nextH = Math.min(nextH, 60)
      }
      if (currentHeight + h + nextH > effectiveHeight && currentPage.length > 0) {
        pages.push(currentPage)
        currentPage = []
        currentHeight = 0
      }
    }

    const wouldOverflow = currentHeight + h > effectiveHeight
    const canStartNewPage = currentPage.length >= minBlocksPerPage

    if (!wouldOverflow || !canStartNewPage) {
      if (
        block.type === 'paragraph' &&
        currentPage.length >= minBlocksPerPage
      ) {
        const nextBlock = blocks[i + 1]
        if (nextBlock && PARAGRAPH_KEEP_WITH_NEXT_TYPES.has(nextBlock.type)) {
          const nextH = blockHeights.get(nextBlock.id) ?? 48
          if (currentHeight + h + nextH > effectiveHeight) {
            pages.push(currentPage)
            currentPage = []
            currentHeight = 0
          }
        }
      }

      if (block.type === 'list' && currentPage.length > 0) {
        const blockParentId = block.parentId ?? block.id
        const prevId = currentPage[currentPage.length - 1]
        const prevBlock = finalBlocks.length > 0 ? finalBlocks[finalBlocks.length - 1] : undefined
        const startsNewListOnPage = !prevId || !prevBlock || prevBlock.type !== 'list' || (prevBlock.parentId ?? prevBlock.id) !== blockParentId
        const nextBlock = blocks[i + 1]
        const nextSameList = !!nextBlock && nextBlock.type === 'list' && (nextBlock.parentId ?? nextBlock.id) === blockParentId
        const nextH = nextBlock ? (blockHeights.get(nextBlock.id) ?? 48) : 0
        const secondItemWouldOverflow = nextSameList && (currentHeight + h + nextH > effectiveHeight)
        if (startsNewListOnPage && secondItemWouldOverflow) {
          pages.push(currentPage)
          currentPage = []
          currentHeight = 0
        }
      }
      currentPage.push(block.id)
      finalBlocks.push(block)
      currentHeight += h
      continue
    }

    if (block.type === 'paragraph' && containerRef) {
      let remainingText = block.text
      let partIndex = block.partIndex ?? 0
      const allSentences = splitSentences(block.text)

      while (remainingText.trim()) {
        if (effectiveHeight - currentHeight <= 0 && currentPage.length > 0) {
          pages.push(currentPage)
          currentPage = []
          currentHeight = 0
        }

        const split = splitParagraphByHeight(
          remainingText,
          effectiveHeight - currentHeight,
          fontSize,
          lang,
          lineHeightScale,
          containerRef,
          bodyWeightClass,
        )

        if (!split.firstPart.trim() && currentPage.length > 0) {
          pages.push(currentPage)
          currentPage = []
          currentHeight = 0
          continue
        }

        const forcedFirstWord = !split.firstPart.trim()
        const firstText = split.firstPart.trim() || remainingText.split(/\s+/).slice(0, 1).join(' ')
        const restText = forcedFirstWord ? remainingText.split(/\s+/).slice(1).join(' ') : split.restPart.trim()

        if (currentPage.length > 0 && restText && isTinyParagraphFragment(firstText)) {
          pages.push(currentPage)
          currentPage = []
          currentHeight = 0
          continue
        }

        if (currentPage.length > 0 && restText) {
          const firstHeight = measureParagraphFragmentHeight(firstText, fontSize, lang, lineHeightScale, containerRef, false, bodyWeightClass)
          const restHeight = measureParagraphFragmentHeight(restText, fontSize, lang, lineHeightScale, containerRef, false, bodyWeightClass)
          const firstLines = estimateLinesByHeight(firstHeight)
          const restLines = estimateLinesByHeight(restHeight)
          if (
            firstLines < MIN_PARAGRAPH_LINES_AT_PAGE_BOTTOM ||
            restLines < MIN_PARAGRAPH_LINES_AT_PAGE_TOP
          ) {
            pages.push(currentPage)
            currentPage = []
            currentHeight = 0
            continue
          }
        }

        const fragmentId = `${block.id}-part-${partIndex}`
        const isFirstPart = (block.isFirstPart ?? true) && partIndex === 0
        const isLastPart = (block.isLastPart ?? true) && !restText

        const offsetInBlock = block.text.length - remainingText.length
        let sentenceIndex = 0
        let runningLen = 0
        for (let si = 0; si < allSentences.length; si++) {
          if (runningLen >= offsetInBlock) {
            sentenceIndex = si
            break
          }
          runningLen += allSentences[si].length + 1
          sentenceIndex = si + 1
        }
        sentenceIndex = Math.min(sentenceIndex, allSentences.length - 1)

        const fragmentBlock: ParagraphBlock & { sentenceIndex: number } = {
          ...block,
          id: fragmentId,
          text: firstText,
          marks: fragmentMarks(block.text, block.marks, firstText),
          parentId: block.parentId ?? block.id,
          partIndex,
          isFirstPart,
          isLastPart,
          sentenceIndex,
        }

        fragmentMap.set(fragmentId, fragmentBlock.parentId!)
        finalBlocks.push(fragmentBlock)
        currentPage.push(fragmentId)

        if (restText) {
          pages.push(currentPage)
          currentPage = []
          currentHeight = 0
        } else {
          currentHeight += measureParagraphFragmentHeight(firstText, fontSize, lang, lineHeightScale, containerRef, isLastPart, bodyWeightClass)
        }

        remainingText = restText
        partIndex++
      }
    } else {
      pages.push(currentPage)
      currentPage = [block.id]
      finalBlocks.push(block)
      currentHeight = h
    }
  }

  if (currentPage.length > 0) {
    pages.push(currentPage)
  }

  return { pages, finalBlocks, fragmentMap }
}

export function computePages(
  blocks: ContentBlock[],
  blockHeights: Map<string, number>,
  pageHeight: number,
  containerRef: HTMLElement | null,
  fontSize: number,
  lang: string,
  lineHeightScale = 1,
  minBlocksPerPage = 1,
  readerThemeId: ReaderThemeId = 'light',
  measuredBlockRoots?: MeasuredBlockRoots,
  pageWidthPx?: number,
  pageShellClassName?: string,
): ComputedPagesResult {
  const readerThemeConfig = READER_THEME_CONFIGS[readerThemeId] ?? READER_THEME_CONFIGS.light
  if (blocks.length === 0 || pageHeight <= 0) {
    return { pages: [], finalBlocks: [], fragmentMap: new Map() }
  }

  if (containerRef) {
    return computePagesDom(
      blocks,
      pageHeight,
      containerRef,
      fontSize,
      lang,
      lineHeightScale,
      minBlocksPerPage,
      readerThemeConfig,
      measuredBlockRoots,
      pageWidthPx,
      pageShellClassName,
    )
  }

  return computePagesFallback(blocks, blockHeights, pageHeight, containerRef, fontSize, lang, lineHeightScale, minBlocksPerPage, readerThemeConfig)
}

export function findPageForBlockAndSentence(
  pages: string[][],
  finalBlocks: ContentBlock[],
  blockId: string,
  targetSentenceIndex: number,
  fragmentMap?: Map<string, string>,
): number {
  const sentenceMap = new Map<string, number>()
  for (const block of finalBlocks) {
    const parentId = block.parentId ?? block.id
    const sentenceIndex = 'sentenceIndex' in block ? block.sentenceIndex : undefined
    if (parentId === blockId && typeof sentenceIndex === 'number') {
      sentenceMap.set(block.id, sentenceIndex)
    }
  }

  if (sentenceMap.size === 0) {
    return findPageForBlock(pages, blockId, fragmentMap)
  }

  let bestPage = -1
  let bestSentIdx = -1
  for (let i = 0; i < pages.length; i++) {
    for (const id of pages[i]) {
      const sIdx = sentenceMap.get(id)
      if (sIdx == null) continue
      if (sIdx <= targetSentenceIndex && sIdx > bestSentIdx) {
        bestSentIdx = sIdx
        bestPage = i
      }
    }
  }

  if (bestPage >= 0) return bestPage
  return findPageForBlock(pages, blockId, fragmentMap)
}

export function findPageForBlock(
  pages: string[][],
  blockId: string,
  fragmentMap?: Map<string, string>,
): number {
  for (let i = 0; i < pages.length; i++) {
    if (pages[i].includes(blockId)) return i
  }

  if (fragmentMap) {
    for (let i = 0; i < pages.length; i++) {
      for (const id of pages[i]) {
        if (fragmentMap.get(id) === blockId || fragmentMap.get(id) === fragmentMap.get(blockId)) {
          return i
        }
      }
    }
  }

  return -1
}

export function findPageByBlockPosition(
  pages: string[][],
  blocks: ContentBlock[],
  targetPosition: number,
): number {
  const posMap = new Map(blocks.map((b) => [b.id, b.position]))

  let bestPage = 0
  for (let i = 0; i < pages.length; i++) {
    const firstId = pages[i][0]
    const pos = posMap.get(firstId) ?? -1
    if (pos <= targetPosition) {
      bestPage = i
    } else {
      break
    }
  }

  return bestPage
}
