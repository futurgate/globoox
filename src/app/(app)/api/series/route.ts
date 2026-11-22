import { requireBackendProxy } from '../_proxy'

export const runtime = 'nodejs'

// Admin-gated on the backend. List all book series.
export async function GET(request: Request) {
  return requireBackendProxy(request)
}
