import { requireBackendProxy } from '../../../_proxy'

export const runtime = 'nodejs'
// Long NDJSON progress streams. Raise the function duration to the Vercel Hobby
// max (60s) instead of the short default that cut even small runs mid-stream.
// Books longer than 60s still finish: the backend keeps running after the stream
// drops and the admin page polls status to completion (TZ P0 #3).
export const maxDuration = 60

// Admin-gated on the backend (profiles.is_admin).
// POST builds the book-wide fiction glossary (NDJSON progress stream).
// GET fetches the current glossary + build progress.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  void params
  return requireBackendProxy(request)
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  void params
  return requireBackendProxy(request)
}
