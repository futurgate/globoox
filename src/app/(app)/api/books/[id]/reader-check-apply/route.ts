import { requireBackendProxy } from '../../../_proxy'

export const runtime = 'nodejs'

// Admin-gated on the backend (profiles.is_admin).
// POST approves (applies) or rejects one proposed reader-check correction.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  void params
  return requireBackendProxy(request)
}
