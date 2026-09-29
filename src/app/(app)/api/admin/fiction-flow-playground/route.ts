import { requireBackendProxy } from '../../_proxy'

// Node runtime so the backend's NDJSON progress stream is passed through
// unbuffered (matches the revise-full-book streaming route).
export const runtime = 'nodejs'

// Admin-gated on the backend (profiles.is_admin). This route just forwards the
// authenticated request to the Nuxt backend, which runs the whole fiction flow
// (glossary → translate → revision) per model with custom per-stage prompts and
// streams per-stage progress as NDJSON.
export async function POST(request: Request) {
  return requireBackendProxy(request)
}
