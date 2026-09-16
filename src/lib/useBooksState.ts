import type { ApiBook } from './api'

/** Keep list identity when a retry only deserializes the same book metadata again. */
export function sameBooks(left: readonly ApiBook[], right: readonly ApiBook[]): boolean {
  if (left === right) return true
  if (left.length !== right.length) return false
  return left.every((book, index) => {
    const next = right[index]
    return book === next || (
      book.id === next.id
      && book.title === next.title
      && book.author === next.author
      && book.cover_url === next.cover_url
      && book.original_language === next.original_language
      && book.selected_language === next.selected_language
      && book.status === next.status
      && book.created_at === next.created_at
      && book.is_own === next.is_own
      && book.available_languages.length === next.available_languages.length
      && book.available_languages.every((language, languageIndex) => language === next.available_languages[languageIndex])
    )
  })
}

export interface BooksRequest {
  version: number
  controller: AbortController
}

/** One hook/scope lifetime. A cancelled request can neither publish nor clear a newer loader. */
export class BooksRequestGuard {
  active = false
  private requestVersion = 0
  private dataVersion = 0
  private hasPublished = false
  private request: BooksRequest | null = null

  activate() { this.active = true }

  dispose() {
    this.active = false
    this.dataVersion += 1
    this.invalidateRequest()
  }

  get inFlight() { return this.request !== null }

  beginRequest(): BooksRequest {
    this.invalidateRequest()
    const request = { version: this.requestVersion, controller: new AbortController() }
    this.request = request
    return request
  }

  isCurrent(request: BooksRequest) {
    return this.active && this.request === request && request.version === this.requestVersion
  }

  finishRequest(request: BooksRequest) {
    if (this.isCurrent(request)) this.request = null
  }

  invalidateRequest() {
    const wasInFlight = this.inFlight
    this.requestVersion += 1
    this.request?.controller.abort()
    this.request = null
    return wasInFlight
  }

  hydrationVersion() { return this.dataVersion }

  canHydrate(version: number) {
    return this.active && !this.hasPublished && version === this.dataVersion
  }

  markPublished() {
    this.hasPublished = true
    this.dataVersion += 1
  }
}
