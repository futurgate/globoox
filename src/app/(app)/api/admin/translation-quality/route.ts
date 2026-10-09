import { requireBackendProxy } from '../../_proxy'

// Admin-gated on the backend (profiles.is_admin). Forwards the authenticated
// request to the Nuxt backend, which runs block-level translation QA (v2).
export async function POST(request: Request) {
  return requireBackendProxy(request)
}
