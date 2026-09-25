import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import * as Sentry from '@sentry/nextjs'

/**
 * Forward request to real backend API when API_URL is configured.
 * Attaches Supabase auth token when user is logged in.
 * Returns null only when no backend URL is configured.
 */
export async function proxyToBackend(
  request: Request,
  opts?: { admin?: boolean }
): Promise<NextResponse | null> {
  // Admin/heavy team endpoints route to a dedicated backend instance when
  // ADMIN_API_URL is set; otherwise they fall back to the shared backend.
  const backendUrl = opts?.admin
    ? process.env.ADMIN_API_URL || process.env.API_URL || process.env.NEXT_PUBLIC_API_URL
    : process.env.API_URL || process.env.NEXT_PUBLIC_API_URL
  if (!backendUrl) return null

  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  const incomingContentType = request.headers.get('content-type') || ''
  const isMultipart = incomingContentType.includes('multipart/form-data')

  const headers: Record<string, string> = {}
  if (!isMultipart) {
    headers['Content-Type'] = 'application/json'
  } else {
    // Forward multipart/form-data with its boundary intact
    headers['Content-Type'] = incomingContentType
  }
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`
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
      response.headers.set('x-authenticated', session ? 'true' : 'false')
      return response
    }

    if (
      contentType.startsWith('image/') ||
      contentType === 'application/octet-stream' ||
      contentType.startsWith('application/epub+zip')
    ) {
      const response = new NextResponse(res.body, { status: res.status })
      response.headers.set('Content-Type', contentType)
      const cacheControl = res.headers.get('cache-control')
      if (cacheControl) response.headers.set('Cache-Control', cacheControl)
      // Preserve the download filename for binary attachments (e.g. EPUB export)
      const contentDisposition = res.headers.get('content-disposition')
      if (contentDisposition) response.headers.set('Content-Disposition', contentDisposition)
      return response
    }

    const data = await res.json().catch(() => null)
    const response = NextResponse.json(data ?? {}, { status: res.status })
    response.headers.set('x-data-source', 'backend')
    response.headers.set('x-authenticated', session ? 'true' : 'false')
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

export async function requireBackendProxy(
  request: Request,
  opts?: { admin?: boolean }
): Promise<NextResponse> {
  const proxied = await proxyToBackend(request, opts)
  if (proxied) return proxied

  return NextResponse.json(
    { error: 'Backend API is not configured. Set API_URL or NEXT_PUBLIC_API_URL environment variable.' },
    { status: 503 }
  )
}
