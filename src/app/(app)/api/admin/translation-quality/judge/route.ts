import { requireBackendProxy } from '../../../_proxy'

// Admin-gated on the backend. LLM-judges one chapter of a finished translation.
export async function POST(request: Request) {
  return requireBackendProxy(request)
}
