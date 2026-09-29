import { requireBackendProxy } from '../../_proxy'

// Admin-gated on the backend (profiles.is_admin). Forwards the authenticated
// request to the Nuxt backend, which returns all three production fiction-flow
// prompt templates (glossary / translate / revision) to seed the flow editors.
export async function GET(request: Request) {
  return requireBackendProxy(request)
}
