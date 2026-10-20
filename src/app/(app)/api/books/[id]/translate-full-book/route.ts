import { requireBackendProxy } from '../../../_proxy'

export const runtime = 'nodejs'
// Long NDJSON progress streams: a full-book run drives many sequential LLM
// calls, so let the Vercel function live up to the platform max instead of the
// short default that cut even small (2-chapter) runs mid-stream (TZ P0 #3).
export const maxDuration = 300

// Admin-gated on the backend (profiles.is_admin).
// POST starts the full-book fiction translation (NDJSON progress stream).
// GET polls per-chapter progress.
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
