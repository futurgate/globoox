import { NextRequest } from 'next/server'
import { requireBackendProxy } from '../../../_proxy'

export const runtime = 'nodejs'

// Pure token-math estimate (no LLM). Used by the Translation Cost Lab pre-run panel.
export async function GET(request: NextRequest) {
  return requireBackendProxy(request)
}
