import { requireBackendProxy } from '../../../_proxy'

export const runtime = 'nodejs'

// Admin-gated on the backend (profiles.is_admin).
// POST builds the book-wide fiction glossary (NDJSON progress stream).
// GET fetches the current glossary + build progress.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  void params
  return requireBackendProxy(request)
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  void params
  return requireBackendProxy(request)
}
