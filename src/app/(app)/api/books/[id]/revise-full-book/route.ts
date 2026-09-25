import { requireBackendProxy } from '../../../_proxy'

export const runtime = 'nodejs'

// Admin-gated on the backend (profiles.is_admin).
// POST runs Pass-2 stylistic revision (NDJSON progress stream).
// GET polls revision progress.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  void params
  return requireBackendProxy(request, { admin: true })
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  void params
  return requireBackendProxy(request, { admin: true })
}
