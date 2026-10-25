import { requireBackendProxy } from '../../../_proxy'

export const runtime = 'nodejs'

// Admin-gated on the backend (profiles.is_admin).
// GET returns the per-book reader-check journal.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  void params
  return requireBackendProxy(request)
}
