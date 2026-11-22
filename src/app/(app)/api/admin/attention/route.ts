import { requireBackendProxy } from '../../_proxy'

export const runtime = 'nodejs'

// Admin-gated on the backend. Open attention-queue items.
export async function GET(request: Request) {
  return requireBackendProxy(request)
}
