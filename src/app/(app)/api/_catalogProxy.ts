import { NextResponse } from 'next/server'

class ActivityBodyTooLarge extends Error {}

async function readActivityBody(request: Request, signal: AbortSignal): Promise<string> {
  if (Number(request.headers.get('content-length')) > 16384) throw new ActivityBodyTooLarge()
  const reader = request.body?.getReader()
  if (!reader) return ''
  const abort = () => { void reader.cancel().catch(() => {}) }
  signal.addEventListener('abort', abort, { once: true })
  let size = 0
  let body = ''
  const decoder = new TextDecoder()
  try {
    for (;;) {
      signal.throwIfAborted()
      const { value, done } = await reader.read()
      signal.throwIfAborted()
      if (done) return body + decoder.decode()
      size += value.byteLength
      if (size > 16384) { await reader.cancel(); throw new ActivityBodyTooLarge() }
      body += decoder.decode(value, { stream: true })
    }
  } finally { signal.removeEventListener('abort', abort); reader.releaseLock() }
}

/** V2 carries the explicit browser identity; the backend validates its bearer.
 * Do not substitute a cookie session, which can lag an account switch. */
export async function proxyCatalog(request: Request): Promise<Response> {
  const backend = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL
  if (!backend) return NextResponse.json({ error: 'Catalog service is not configured', code: 'catalog_not_configured' }, { status: 503 })
  const user = request.headers.get('x-catalog-user')
  if (!user) return NextResponse.json({ error: 'Catalog identity is required' }, { status: 400 })
  const headers = new Headers({ 'x-catalog-user': user, accept: request.headers.get('accept') || 'application/json' })
  for (const name of ['authorization', 'x-catalog-guest', 'content-type']) {
    const value = request.headers.get(name)
    if (value) headers.set(name, value)
  }
  const url = new URL(request.url)
  const signal = AbortSignal.any([request.signal, AbortSignal.timeout(8000)])
  try {
    const body = request.method === 'POST' ? await readActivityBody(request, signal) : undefined
    const response = await fetch(`${backend.replace(/\/$/, '')}${url.pathname}${url.search}`, {
      method: request.method,
      headers,
      body,
      cache: 'no-store',
      signal,
    })
    const outgoing = new Headers({ 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' })
    for (const name of ['content-type', 'etag', 'server-timing', 'retry-after']) {
      const value = response.headers.get(name)
      if (value) outgoing.set(name, value)
    }
    // Stream both JSON and images: buffering here would add a second body wait.
    return new Response(response.body, { status: response.status, headers: outgoing })
  } catch (error) {
    if (error instanceof ActivityBodyTooLarge) return NextResponse.json({ error: 'Activity batch is too large' }, { status: 413 })
    return NextResponse.json({ error: 'Catalog service is unavailable' }, {
      status: request.signal.aborted ? 499 : signal.aborted ? 504 : 502,
      headers: { 'Cache-Control': 'private, no-store' },
    })
  }
}
