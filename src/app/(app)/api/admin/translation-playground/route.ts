import { requireBackendProxy } from '../../_proxy'

// Admin-gated on the backend (profiles.is_admin). This route just forwards the
// authenticated request to the Nuxt backend.
export async function POST(request: Request) {
  return requireBackendProxy(request)
}
