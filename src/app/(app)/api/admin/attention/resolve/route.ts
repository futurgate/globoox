import { requireBackendProxy } from '../../../_proxy'

export const runtime = 'nodejs'

// Admin-gated on the backend. Resolve one attention item.
export async function POST(request: Request) {
  return requireBackendProxy(request)
}
