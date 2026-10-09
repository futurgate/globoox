import { NextRequest } from 'next/server'
import { requireBackendProxy } from '../../../_proxy'

export const runtime = 'nodejs'

// Admin-gated on the backend. Returns real $/author-sheet rates aggregated from runs.
export async function GET(request: NextRequest) {
  return requireBackendProxy(request)
}
