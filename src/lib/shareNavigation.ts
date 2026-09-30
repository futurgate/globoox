/** Share membership belongs to an explicit URL, never to a previous browser visit. */
export function shareTokenFromSearch(search: string): string | null {
  const values = new URLSearchParams(search).getAll('share')
  return values.length === 1 && values[0].length > 0 && values[0].length <= 256 ? values[0] : null
}

export function getShareToken(): string | null {
  if (typeof window === 'undefined') return null
  return shareTokenFromSearch(window.location?.search ?? '')
}

/** Only callers inside a shared reading flow explicitly carry its context forward. */
export function withShareContext(path: string, token: string | null): string {
  const url = new URL(path, 'https://navigation.invalid')
  if (url.origin !== 'https://navigation.invalid') throw new Error('Expected a local navigation path')
  url.searchParams.delete('share')
  if (token) url.searchParams.set('share', token)
  return `${url.pathname}${url.search}${url.hash}`
}
