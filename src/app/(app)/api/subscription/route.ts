import { requireBackendProxy } from '../_proxy'

export async function GET(request: Request) {
  return requireBackendProxy(request)
}
