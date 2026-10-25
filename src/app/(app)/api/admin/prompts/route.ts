import { requireBackendProxy } from '../../_proxy'

export const runtime = 'nodejs'

// Admin-gated on the backend (profiles.is_admin).
// GET lists editable server prompts + overrides.
// PUT saves an override; DELETE resets a prompt to the shipped file.
export async function GET(request: Request) {
  return requireBackendProxy(request)
}

export async function PUT(request: Request) {
  return requireBackendProxy(request)
}

export async function DELETE(request: Request) {
  return requireBackendProxy(request)
}
