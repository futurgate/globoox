const FALLBACK_RETURN_PATH = '/my-books'
const LOCAL_ORIGIN = 'https://navigation.invalid'
const UNSAFE_PATH_CHARACTERS = /[\\\u0000-\u001f\u007f]/

/** Auth may return to a local app URL, including an explicitly shared shelf. */
export function safeLocalReturnPath(value: string | null | undefined): string {
  if (!value?.startsWith('/') || value.startsWith('//') || UNSAFE_PATH_CHARACTERS.test(value)) {
    return FALLBACK_RETURN_PATH
  }
  try {
    const url = new URL(value, LOCAL_ORIGIN)
    const pathname = decodeURIComponent(url.pathname)
    // Validate again after normalization/decoding: /a/..//host and /%5chost
    // must not turn into another origin when passed to router.push/location.assign.
    if (url.origin !== LOCAL_ORIGIN || pathname.startsWith('//') || UNSAFE_PATH_CHARACTERS.test(pathname)) {
      return FALLBACK_RETURN_PATH
    }
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return FALLBACK_RETURN_PATH
  }
}
