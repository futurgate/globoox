import { requireBackendProxy } from '../../../_proxy'

export const runtime = 'nodejs'

// Admin-gated on the backend (profiles.is_admin).
// POST copies another book's glossary verbatim onto this book (no LLM).
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  void params
  return requireBackendProxy(request)
}
