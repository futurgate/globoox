import { requireBackendProxy } from '../../../_proxy'

export const runtime = 'nodejs'

// Admin-gated on the backend. Re-enqueue a stuck/stopped step for one volume.
export async function POST(request: Request) {
  return requireBackendProxy(request)
}
