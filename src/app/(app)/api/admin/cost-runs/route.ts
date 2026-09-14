import { NextRequest } from 'next/server'
import { requireBackendProxy } from '../../_proxy'

export const runtime = 'nodejs'

// Admin-gated on the backend (profiles.is_admin). GET lists runs; POST starts one.
export async function GET(request: NextRequest) {
  return requireBackendProxy(request)
}

export async function POST(request: NextRequest) {
  return requireBackendProxy(request)
}
