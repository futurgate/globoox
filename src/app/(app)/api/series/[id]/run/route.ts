import { requireBackendProxy } from '../../../_proxy'

export const runtime = 'nodejs'

// Admin-gated on the backend. Start the series full-flow (enqueues step 0).
export async function POST(request: Request) {
  return requireBackendProxy(request)
}
