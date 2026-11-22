import { requireBackendProxy } from '../../../_proxy'

export const runtime = 'nodejs'

// Admin-gated on the backend. ZIP of the series' translated EPUBs.
export async function GET(request: Request) {
  return requireBackendProxy(request)
}
