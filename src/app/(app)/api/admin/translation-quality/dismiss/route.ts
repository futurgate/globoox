import { requireBackendProxy } from '../../../_proxy'

// Admin-gated on the backend. Records / clears dismissals of QA issues.
export async function POST(request: Request) {
  return requireBackendProxy(request)
}
