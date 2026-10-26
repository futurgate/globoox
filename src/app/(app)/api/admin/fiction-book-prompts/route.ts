import { requireBackendProxy } from '../../_proxy'

export const runtime = 'nodejs'

// Admin-gated on the backend (profiles.is_admin).
// GET returns the real pipeline prompts for a book's direction, per stage.
export async function GET(request: Request) {
  return requireBackendProxy(request)
}
