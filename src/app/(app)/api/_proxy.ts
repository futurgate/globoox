import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requestBearer } from '@/lib/supabase/requestBearer'
import * as Sentry from '@sentry/nextjs'

export interface ProxyIdentity { userId: string; token: string }

/**
 * Forward request to real backend API when API_URL is configured.
 * Attaches Supabase auth token when user is logged in.
 * Returns null only when no backend URL is configured.
 */
export async function proxyToBackend(request: Request, expectedReadingUser?: string, verifiedBearer?: ProxyIdentity): Promise<NextResponse | null> {
  const backendUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL
  if (!backendUrl) return null

  let identity = verifiedBearer
  if (!identity) {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      identity = { userId: session.user.id, token: session.access_token }
    } else {
      // Reading intents pin the displayed cookie account, including logout.
      // Studio already verified its bearer before checking object ownership.
      const token = expectedReadingUser === undefined ? requestBearer(request) : undefined
      if (token) {
        const { data: { user }, error } = await supabase.auth.getUser(token)
        if (!user) return NextResponse.json({ error: 'Authentication unavailable' }, { status: (error?.status ?? 0) >= 500 ? 503 : 401 })
        identity = { userId: user.id, token }
      }
    }
  }

  // A queued reading intent belongs to the account that created it. Use the
  // same session for this check and forwarding so a cookie change cannot
  // silently save the previous account's position under the next account.
  if (expectedReadingUser !== undefined &&
      (!identity || identity.userId !== expectedReadingUser)) {
    return NextResponse.json({ error: 'Reading account changed' }, { status: 401 })
  }

  const incomingContentType = request.headers.get('content-type') || ''
  const isMultipart = incomingContentType.includes('multipart/form-data')

  const headers: Record<string, string> = {}
  if (!isMultipart) {
    headers['Content-Type'] = 'application/json'
  } else {
    // Forward multipart/form-data with its boundary intact
    headers['Content-Type'] = incomingContentType
  }
  if (identity) {
    headers['Authorization'] = `Bearer ${identity.token}`
  }

  // Derive the target URL from the incoming request path + query
  const { pathname, search } = new URL(request.url)
  const targetUrl = `${backendUrl}${pathname}${search}`

  const body =
    request.method !== 'GET' && request.method !== 'HEAD'
      ? (isMultipart ? await request.blob() : await request.text())
      : undefined

  try {
    const res = await fetch(targetUrl, { method: request.method, headers, body })
    const contentType = res.headers.get('content-type') ?? ''

    // Pass NDJSON streaming responses through without buffering
    if (contentType.includes('ndjson') || contentType.includes('event-stream')) {
      const response = new NextResponse(res.body, { status: res.status })
      response.headers.set('Content-Type', contentType)
      response.headers.set('Cache-Control', 'no-cache')
      response.headers.set('X-Accel-Buffering', 'no')
      response.headers.set('x-data-source', 'backend')
      response.headers.set('x-authenticated', identity ? 'true' : 'false')
      return response
    }

    if (
      contentType.startsWith('image/') ||
      contentType.startsWith('application/octet-stream') ||
      contentType.startsWith('application/epub+zip') ||
      contentType.startsWith('application/zip')
    ) {
      const response = new NextResponse(res.body, { status: res.status })
      response.headers.set('Content-Type', contentType)
      const cacheControl = res.headers.get('cache-control')
      if (cacheControl) response.headers.set('Cache-Control', cacheControl)
      // Preserve the download filename for binary attachments (e.g. EPUB export)
      const contentDisposition = res.headers.get('content-disposition')
      if (contentDisposition) response.headers.set('Content-Disposition', contentDisposition)
      // Forward the series-download "skipped volumes" hint.
      const skipped = res.headers.get('x-skipped-volumes')
      if (skipped) response.headers.set('X-Skipped-Volumes', skipped)
      return response
    }

    const data = await res.json().catch(() => null)
    const response = NextResponse.json(data ?? {}, { status: res.status })
    const retryAfter = res.headers.get('retry-after')
    if (retryAfter) response.headers.set('Retry-After', retryAfter)
    response.headers.set('x-data-source', 'backend')
    response.headers.set('x-authenticated', identity ? 'true' : 'false')
    return response
  } catch (error) {
    Sentry.addBreadcrumb({
      category: 'proxy',
      message: 'Backend unavailable (502)',
      data: { targetUrl, method: request.method },
      level: 'error',
    });
    Sentry.captureException(error, {
      contexts: { proxy: { targetUrl, method: request.method } },
    });
    return NextResponse.json(
      { error: 'Backend is unavailable' },
      { status: 502 }
    )
  }
}

export async function requireBackendProxy(request: Request, expectedReadingUser?: string, verifiedBearer?: ProxyIdentity): Promise<NextResponse> {
  const proxied = await proxyToBackend(request, expectedReadingUser, verifiedBearer)
  if (proxied) return proxied

  return NextResponse.json(
    { error: 'Backend API is not configured. Set API_URL or NEXT_PUBLIC_API_URL environment variable.' },
    { status: 503 }
  )
}
