/** Only this restricted, escaped fragment is emitted by the visual text editor.
 * Legacy strings continue to use the existing translation emphasis syntax.
 * Parse tags as data. Unknown markup never reaches the DOM as HTML.
 */
export type ReviewRun = { text: string; bold?: true; italic?: true }

export const reviewParagraphStart = '<p data-studio-inline="1">'

export function appendReviewRun(runs: ReviewRun[], text: string, bold: boolean, italic: boolean) {
  if (!text) return
  const last = runs.at(-1)
  if (last && !!last.bold === bold && !!last.italic === italic) last.text += text
  else runs.push({ text, ...(bold && { bold: true }), ...(italic && { italic: true }) })
}

export function parseStudioParagraph(value: string): ReviewRun[] | null {
  if (!value.startsWith(reviewParagraphStart) || !value.endsWith('</p>')) return null
  const body = value.slice(reviewParagraphStart.length, -4)
  const tokens = /[^<&]+|&amp;|&lt;|&gt;|<strong>|<em>|<\/strong>|<\/em>/gy
  const stack: string[] = []
  const runs: ReviewRun[] = []
  const entities: Record<string, string> = { '&amp;': '&', '&lt;': '<', '&gt;': '>' }
  while (tokens.lastIndex < body.length) {
    const token = tokens.exec(body)?.[0]
    if (!token) return null
    if (token === '<strong>' || token === '<em>') {
      if (stack.includes(token)) return null
      stack.push(token)
    } else if (token.startsWith('</')) {
      if (stack.pop() !== '<' + token.slice(2)) return null
    } else {
      appendReviewRun(runs, token.startsWith('&') ? entities[token] : token, stack.includes('<strong>'), stack.includes('<em>'))
    }
  }
  return stack.length ? null : runs
}

// Keep the legacy branch aligned with parseEmphasisMarkdown in the EPUB exporter.
const emphasis = /\*\*(?=\S)([^*\n]+?)(?<=\S)\*\*|(?<![*\p{L}\p{N}_])\*(?=\S)([^*\n]+?)(?<=\S)\*(?![*\p{L}\p{N}_])/gu

function readReviewLine(value: string): ReviewRun[] {
  const structured = parseStudioParagraph(value)
  if (structured) return structured
  const runs: ReviewRun[] = []
  let last = 0
  for (const match of value.matchAll(emphasis)) {
    appendReviewRun(runs, value.slice(last, match.index), false, false)
    appendReviewRun(runs, match[1] ?? match[2], match[1] !== undefined, match[2] !== undefined)
    last = match.index + match[0].length
  }
  appendReviewRun(runs, value.slice(last), false, false)
  return runs
}

export function readReviewText(value: string): ReviewRun[] {
  const runs: ReviewRun[] = []
  for (const [index, line] of value.split('\n').entries()) {
    if (index) appendReviewRun(runs, '\n', false, false)
    for (const run of readReviewLine(line)) appendReviewRun(runs, run.text, !!run.bold, !!run.italic)
  }
  return runs
}

export function writeReviewText(input: ReviewRun[]): string {
  const lines: ReviewRun[][] = [[]]
  for (const run of input) {
    for (const [index, segment] of run.text.split('\n').entries()) {
      if (index) lines.push([])
      appendReviewRun(lines[lines.length - 1], segment, !!run.bold, !!run.italic)
    }
  }
  return lines.map(writeReviewLine).join('\n')
}

function writeReviewLine(input: ReviewRun[]): string {
  const runs: ReviewRun[] = []
  for (const run of input) appendReviewRun(runs, run.text, !!run.bold, !!run.italic)
  const simple = runs.map(run => {
    const delimiter = (run.bold ? '**' : '') + (run.italic ? '*' : '')
    return delimiter + run.text + delimiter
  }).join('')
  // Most edits can still be read verbatim by older Studio and API clients.
  const roundTrip = readReviewLine(simple)
  if (runs.length === roundTrip.length && runs.every((run, i) =>
    run.text === roundTrip[i].text && run.bold === roundTrip[i].bold && run.italic === roundTrip[i].italic,
  )) return simple

  const markup = runs.map(run => {
    let value = run.text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    if (run.italic) value = '<em>' + value + '</em>'
    if (run.bold) value = '<strong>' + value + '</strong>'
    return value
  }).join('')
  return reviewParagraphStart + markup + '</p>'
}
