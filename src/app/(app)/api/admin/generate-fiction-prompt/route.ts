import { requireBackendProxy } from '../../_proxy'

export const runtime = 'nodejs'

// Admin-gated on the backend (profiles.is_admin). Forwards the authenticated
// request to the Nuxt backend, which LLM-adapts an existing-language fiction
// prompt into a draft for a new target language (powers the flow playground's
// per-stage "Generate" button).
export async function POST(request: Request) {
  return requireBackendProxy(request)
}
