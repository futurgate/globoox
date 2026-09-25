import { requireBackendProxy } from '../../_proxy'

export const runtime = 'nodejs'

// Admin-gated on the backend. Fiction translation history (one per book+language).
export async function GET(request: Request) {
  return requireBackendProxy(request, { admin: true })
}
