export interface WorkspaceBook {
  id: string
  title: string
  author: string | null
  sourceLanguage: string | null
  processingStatus: string | null
  seriesId: string | null
  volumeNumber: number | null
  projectId?: string | null
  projectArchived?: boolean
  projectPosition?: number
}

export interface WorkspaceSeries {
  id: string
  name: string | null
  genre: string | null
  direction: string | null
  ownerVerified: boolean
}

export interface WorkspaceProject {
  id: string
  name: string
  archived?: boolean
  orderRevision?: number
  sourceBookId?: string | null
  sourceSeriesId?: string | null
}

export interface WorkspaceData {
  userId: string
  role: 'admin' | 'author'
  books: WorkspaceBook[]
  series: WorkspaceSeries[]
  /** Missing if the database has not received the Studio projects migration yet. */
  projects?: WorkspaceProject[]
}

export interface WorkspaceAttention {
  id: string
  bookId: string
  bookTitle: string
  blockId: string | null
  language: string | null
  step: string | null
  kind: string | null
  reason: string | null
  createdAt: string | null
}

export interface WorkspaceReviewBlock {
  id: string
  original: string
  translated: string | null
  chapterTitle: string | null
  chapterNumber: number | null
  position: number | null
}

export interface WorkspaceTranslation {
  bookId: string
  title: string
  language: string
  totalChapters: number
  doneChapters: number
  errorChapters: number
  state: string
  percent: number
  updatedAt: string | null
}

export interface WorkspaceActivity {
  attention: WorkspaceAttention[]
  translations: WorkspaceTranslation[]
  attentionAvailable: boolean
  attentionComplete: boolean
  translationsAvailable: boolean
}
