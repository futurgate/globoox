import { requireBackendProxy } from '../../../_proxy'

export const runtime = 'nodejs'

// Admin-gated on the backend. Edit series glossary + re-translate affected paragraphs.
export async function POST(request: Request) {
  return requireBackendProxy(request)
}
