import { requireBackendProxy } from '../../_proxy'

// Admin-gated on the backend (profiles.is_admin). Forwards the authenticated
// request to the Nuxt backend, which lists the provider's available models.
export async function GET(request: Request) {
  return requireBackendProxy(request)
}
