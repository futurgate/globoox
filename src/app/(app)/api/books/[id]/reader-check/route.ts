import { requireBackendProxy } from '../../../_proxy'

export const runtime = 'nodejs'
// Long NDJSON progress streams. Raise to the Vercel Hobby max (60s); longer runs
// still finish server-side and the admin page polls status to completion.
export const maxDuration = 60

// Admin-gated on the backend (profiles.is_admin).
// POST runs the reader-check QA pass (NDJSON progress stream).
// GET polls reader-check progress.
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
