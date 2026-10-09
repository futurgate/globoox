import { requireBackendProxy } from '../../../_proxy'

// Admin-gated on the backend. Returns the QA run history for a (book, language).
export async function GET(request: Request) {
  return requireBackendProxy(request)
}
