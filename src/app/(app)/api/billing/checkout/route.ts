import { requireBackendProxy } from '../../_proxy'

export async function POST(request: Request) {
  return requireBackendProxy(request)
}
