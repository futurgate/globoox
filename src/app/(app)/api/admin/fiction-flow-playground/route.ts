import { requireBackendProxy } from '../../_proxy'

// Admin-gated on the backend (profiles.is_admin). This route just forwards the
// authenticated request to the Nuxt backend, which runs the whole fiction flow
// (glossary → translate → revision) per model with custom per-stage prompts.
export async function POST(request: Request) {
  return requireBackendProxy(request)
}
