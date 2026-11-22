import { requireBackendProxy } from '../../../_proxy'

export const runtime = 'nodejs'

// Admin-gated on the backend (profiles.is_admin).
// POST freezes/unfreezes the book-wide fiction glossary for a language
// (point 2 principle 3). A frozen glossary cannot be modified by
// generate/set/copy-glossary (they 409 unless force:true).
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  void params
  return requireBackendProxy(request)
}
