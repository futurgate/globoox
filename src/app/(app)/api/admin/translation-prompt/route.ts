import { requireBackendProxy } from '../../_proxy'

// Admin-gated on the backend (profiles.is_admin). Forwards the authenticated
// request to the Nuxt backend, which returns the production translation prompt
// template for a target language so the playground can seed its editable prompt.
export async function GET(request: Request) {
  return requireBackendProxy(request, { admin: true })
}
