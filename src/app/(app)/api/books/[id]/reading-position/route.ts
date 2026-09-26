import { requireBackendProxy } from '../../../_proxy'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  void params
  return requireBackendProxy(request, request.headers.get('X-Reading-User') ?? undefined)
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  void params
  return requireBackendProxy(request, request.headers.get('X-Reading-User') ?? undefined)
}
