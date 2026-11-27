import { requireBackendProxy } from '../../_proxy'

export const runtime = 'nodejs'

// Admin-gated on the backend. Upload a ZIP archive of EPUB volumes as a series.
export async function POST(request: Request) {
  return requireBackendProxy(request)
}
