'use client'

import BookCard from './BookCard'
import { useCatalogCover } from '@/lib/useCatalogCover'
import type { CatalogContext, CatalogItem } from '@/lib/catalogTypes'

export default function CatalogBookCard({ book, context, offline, ...props }: {
  book: CatalogItem
  context: CatalogContext | null
  offline: boolean
  progress?: number
  onHide?: (id: string) => void
  onDelete?: (id: string) => void
  hideLabel?: string
  onOpen?: () => void
}) {
  const cover = useCatalogCover(book, context, offline)
  return <BookCard {...props} id={book.id} title={book.title} author={book.author || 'Unknown author'}
    coverVersionKey={`${context?.scopeKey}::${book.id}::${book.cover?.version}`}
    cover={cover.url} coverLoading={cover.loading} />
}
