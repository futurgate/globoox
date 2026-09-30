/** Bound a stream/status check even if its transport ignores AbortSignal. */
export async function runTranslationRequest<T>(
  request: (signal: AbortSignal) => Promise<T>,
  controller: AbortController,
  timeoutMs: number,
): Promise<T> {
  let onAbort: () => void = () => {}
  const stopped = new Promise<T>((_, reject) => {
    onAbort = () => reject(controller.signal.reason ?? new DOMException('Aborted', 'AbortError'))
    controller.signal.addEventListener('abort', onAbort, { once: true })
    if (controller.signal.aborted) onAbort()
  })
  const timer = setTimeout(() => controller.abort(new DOMException('Translation request timed out', 'TimeoutError')), timeoutMs)
  try {
    if (controller.signal.aborted) return await stopped
    return await Promise.race([request(controller.signal), stopped])
  } finally {
    clearTimeout(timer)
    controller.signal.removeEventListener('abort', onAbort)
  }
}
