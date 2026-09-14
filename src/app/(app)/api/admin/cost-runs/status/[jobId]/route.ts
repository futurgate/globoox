import { NextRequest } from 'next/server'
import { requireBackendProxy } from '../../../../_proxy'

export const runtime = 'nodejs'

// Admin-gated on the backend. Returns cost-measure job progress + result.
export async function GET(request: NextRequest) {
  return requireBackendProxy(request)
}
