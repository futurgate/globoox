import { requireBackendProxy } from '../../_proxy'

export const runtime = 'nodejs'

// Admin-gated on the backend. Build a series from a ZIP already uploaded to Storage.
export async function POST(request: Request) {
  return requireBackendProxy(request)
}
