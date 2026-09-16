import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ReaderThemeId } from '@/lib/themes';

export type Language = 'en' | 'fr' | 'es' | 'de' | 'ru';
export type PageLayoutMode = 'single' | 'spread';

export const languageNames: Record<Language, string> = {
  en: 'English',
  fr: 'Français',
  es: 'Español',
  de: 'Deutsch',
  ru: 'Русский'
};

export const languageFlags: Record<Language, string> = {
  en: '🇬🇧',
  fr: '🇫🇷',
  es: '🇪🇸',
  de: '🇩🇪',
  ru: '🇷🇺'
};

interface ReaderSettings {
  fontSize: number;
  lineHeightScale: number;
  language: Language;
  pageLayoutMode: PageLayoutMode;
  readerTheme: ReaderThemeId;
}

interface ReadingProgress {
  [bookId: string]: {
    blockPosition?: number;
    totalBlocks?: number;
    lastRead: string;
    // Explicit user activity, unlike legacy lastRead values written by sync.
    localLastReadAt?: string;
    localLastReadScope?: string;
    serverUpdatedAt?: string;
    serverProgressScope?: string;
  };
}

export interface ReadingAnchor {
  chapterId: string;
  blockId: string;
  fragmentId?: string;
  blockPosition: number;
  sentenceIndex: number;
  updatedAt: string;
}

interface AppState {
  // Persist hydration flag (runtime only)
  hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;

  // Reader settings
  settings: ReaderSettings;
  setFontSize: (size: number) => void;
  setLineHeightScale: (scale: number) => void;
  setLanguage: (language: Language) => void;
  setPageLayoutMode: (mode: PageLayoutMode) => void;
  setReaderTheme: (theme: ReaderThemeId) => void;

  // Per-book language preferences
  perBookLanguages: Record<string, Language>;
  setBookLanguage: (bookId: string, lang: Language) => void;

  // Reading progress (block-based)
  progress: ReadingProgress;
  updateProgress: (bookId: string, blockPosition: number, totalBlocks: number) => void;
  touchLastRead: (bookId: string, scopeKey?: string) => void;
  getProgress: (bookId: string) => { blockPosition?: number; totalBlocks?: number } | null;
  updateServerProgress: (
    bookId: string,
    data: { blockPosition?: number; totalBlocks?: number; serverUpdatedAt: string; scopeKey?: string }
  ) => void;

  // Block-level reading anchor (per book)
  readingAnchors: Record<string, ReadingAnchor>;
  setAnchor: (bookId: string, anchor: ReadingAnchor) => void;
  getAnchor: (bookId: string) => ReadingAnchor | null;

  // Translation state
  isTranslatingByBook: Record<string, boolean>;
  setIsTranslatingForBook: (bookId: string, value: boolean) => void;

  // Sync state – last known server timestamps per scope
  syncVersions: {
    library: string | null;
    progress: string | null;
    settings: string | null;
  };
  setSyncVersions: (versions: Partial<AppState['syncVersions']>) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      hasHydrated: false,
      setHasHydrated: (value) => set({ hasHydrated: value }),

      // Default settings
      settings: {
        fontSize: 16,
        lineHeightScale: 1,
        language: 'en',
        pageLayoutMode: 'single',
        readerTheme: 'forest-light',
      },

      setFontSize: (size) =>
        set((state) => ({
          settings: { ...state.settings, fontSize: size }
        })),

      setLineHeightScale: (scale) =>
        set((state) => ({
          settings: { ...state.settings, lineHeightScale: scale }
        })),

      setLanguage: (language) =>
        set((state) => ({
          settings: { ...state.settings, language }
        })),

      setPageLayoutMode: (mode) =>
        set((state) => ({
          settings: { ...state.settings, pageLayoutMode: mode }
        })),

      setReaderTheme: (readerTheme) =>
        set((state) => ({
          settings: { ...state.settings, readerTheme }
        })),

      // Per-book language preferences
      perBookLanguages: {},

      setBookLanguage: (bookId, lang) =>
        set((state) => ({
          perBookLanguages: { ...state.perBookLanguages, [bookId]: lang }
        })),

      // Reading progress (block-based)
      progress: {},

      updateProgress: (bookId, blockPosition, totalBlocks) =>
        set((state) => {
          const existing = state.progress[bookId] || {};
          const readAt = new Date().toISOString();
          return {
            progress: {
              ...state.progress,
              [bookId]: {
                ...existing,
                blockPosition,
                totalBlocks,
                lastRead: readAt,
                localLastReadAt: readAt,
              }
            }
          };
        }),

      touchLastRead: (bookId, scopeKey = 'guest') =>
        set((state) => {
          const existing = state.progress[bookId] || {};
          const readAt = new Date().toISOString();
          return {
            progress: {
              ...state.progress,
              [bookId]: {
                ...existing,
                lastRead: readAt,
                localLastReadAt: readAt,
                localLastReadScope: scopeKey,
              }
            }
          };
        }),

      getProgress: (bookId) => {
        const progress = get().progress[bookId];
        if (!progress) return null;
        return { blockPosition: progress.blockPosition, totalBlocks: progress.totalBlocks };
      },

      updateServerProgress: (bookId, data) =>
        set((state) => {
          const previous = state.progress[bookId];
          const existing = previous || { lastRead: data.serverUpdatedAt };
          // Before the first server sync, legacy lastRead is a local action.
          // Preserve that evidence when introducing the explicit activity field.
          const legacyLocalRead = previous && !previous.serverUpdatedAt ? previous.lastRead : undefined;
          return {
            progress: {
              ...state.progress,
              [bookId]: {
                ...existing,
                blockPosition: data.blockPosition ?? existing.blockPosition,
                totalBlocks: data.totalBlocks ?? existing.totalBlocks,
                serverUpdatedAt: data.serverUpdatedAt,
                serverProgressScope: data.scopeKey,
                lastRead: existing.lastRead,
                localLastReadAt: existing.localLastReadAt ?? legacyLocalRead,
                localLastReadScope: existing.localLastReadScope ?? (legacyLocalRead ? data.scopeKey : undefined),
              }
            }
          };
        }),

      // Block-level reading anchors
      readingAnchors: {},

      setAnchor: (bookId, anchor) =>
        set((state) => ({
          readingAnchors: { ...state.readingAnchors, [bookId]: anchor }
        })),

      getAnchor: (bookId) => get().readingAnchors[bookId] ?? null,

      // Translation state (scoped per book to avoid cross-book animation bleed)
      isTranslatingByBook: {},
      setIsTranslatingForBook: (bookId, value) =>
        set((state) => ({
          isTranslatingByBook: {
            ...state.isTranslatingByBook,
            [bookId]: value,
          },
        })),

      // Last known sync timestamps from the server
      syncVersions: {
        library: null,
        progress: null,
        settings: null,
      },
      setSyncVersions: (versions) =>
        set((state) => ({
          syncVersions: { ...state.syncVersions, ...versions },
        })),
    }),
    {
      name: 'globoox-preview-storage',
      partialize: (state) => ({
        settings: state.settings,
        perBookLanguages: state.perBookLanguages,
        progress: state.progress,
        readingAnchors: state.readingAnchors,
        syncVersions: state.syncVersions,
      }),
      onRehydrateStorage: () => (state, error) => {
        if (error) return;
        state?.setHasHydrated(true);
      },
    }
  )
);
