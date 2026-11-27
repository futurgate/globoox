/** Only extract the credential here. The auth server must verify it before use. */
export function requestBearer(request: Request): string | undefined {
  return /^Bearer\s+([^\s,]+)$/i.exec(request.headers.get('authorization') ?? '')?.[1]
}
