import { requireBackendProxy } from '../../_proxy'

export const runtime = 'nodejs'

// Admin-gated on the backend. One series with volumes + translation progress.
export async function GET(request: Request) {
  return requireBackendProxy(request)
}
