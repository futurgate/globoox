'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { useAppStore, Language, ReadingAnchor } from '@/lib/store';
import { fetchBlockBatch, fetchContent, fetchReadingPosition, saveReadingPosition, translateBlocksStreaming, updateBookLanguage, checkTranslationLimit } from '@/lib/api';
import type { BatchContentBlock } from '@/lib/api';
import { useChapters } from '@/lib/hooks/useChapters';
import { useChapterContent } from '@/lib/hooks/useChapterContent';
import { useReaderMetadataTranslations } from '@/lib/hooks/useReaderMetadataTranslations';
import { useViewportTranslation } from '@/lib/hooks/useViewportTranslation';
import { getTapZones, usePageGestures } from '@/lib/hooks/usePageGestures';
import { computePages, findPageForBlock, findPageForBlockAndSentence, findPageByBlockPosition, normalizeBlocks } from '@/lib/paginatorUtils';
import { ContentBlock } from '@/lib/api';
import { applyTypografToBlocks } from '@/lib/typograf';
import { useAuth } from '@/lib/hooks/useAuth';
import {
    clearCachedChapterLayouts,
    getCachedChapterContent,
    getCachedChapterBlockIds,
    getCachedChapterLayout,
    getCachedReadingPosition,
    getPendingChapterBatch,
    markChapterPending,
    setCachedTranslatedBlockText,
    setCachedChapterContent,
    setCachedChapterLayout,
    setCachedReadingPosition,
} from '@/lib/contentCache';
import { mergeDisplayBlocksPreservingTranslations } from '@/lib/reader/mergeDisplayBlocks';
import { isBlockPendingForActiveLang, isTranslatableBlock } from '@/lib/translationState';
import {
  trackReadingSessionStarted,
  trackReadingSessionEnded,
  trackChapterCompleted,
  trackBookFinished,
  trackLanguageSwitched,
  trackReaderBookOpenReady,
  trackReaderChapterNavReady,
} from '@/lib/posthog';
import ReaderActionsMenu from './ReaderActionsMenu';
import TranslationGlow from './TranslationGlow';
import AppleIntelligenceGlow from './AppleIntelligenceGlow';
import LanguageSwitch from './LanguageSwitch';
import ContentBlockRenderer from './ContentBlockRenderer';
import { ReaderThemeProvider } from './ReaderThemeProvider';
import { Button } from '@/components/ui/button';
import IOSAlertDialog from '@/components/ui/ios-alert-dialog';
import IOSIcon from '@/components/ui/ios-icon';
import { Skeleton } from '@/components/ui/skeleton';
import TranslationLimitDialog from '@/components/TranslationLimitDialog';
import { uiHeaderControlHitArea, uiIconTriggerButton } from '@/components/ui/button-styles';
import { READER_THEME_CONFIGS, getReaderContentTokens, getReaderSemanticTokens } from '@/lib/readerTheme';
import { getThemeStyle } from '@/lib/themes';

// Source of a navigation event. Any source other than manual_scroll is a "jump"
// that aborts in-flight prefetch requests and updates readingAnchor immediately.
type NavigationSource = 'toc' | 'search' | 'slider' | 'link' | 'restore_anchor' | 'manual_scroll'
const LAST_PAGE_SENTINEL = '__LAST_PAGE__';
const SPREAD_MIN_VIEWPORT_PX = 1408;
const SPREAD_GAP_PX = 120;
const SPREAD_SIDE_PADDING_PX = 40;
const SPREAD_MAX_COLUMN_PX = 560;
const PAGE_TEXT_SIDE_PADDING_PX = 16;
const CONTENT_MAX_WIDTH_PX = 672;
const ARROW_SVG_WIDTH_PX = 42;
const ARROW_REQUIRED_GAP_PX = 8;
const ARROW_CENTER_MIN_OFFSET_PX = 20;
const ARROW_OPTICAL_COMPENSATION_PX = 4;
const LAYOUT_SIGNIFICANT_DELTA_PX = 2;
const REPAGINATE_DEBOUNCE_MS = 160;
const PAGINATION_ALGO_VERSION = 'v2026-03-25-probe-visible-css-parity';
const PAGINATION_ALGO_VERSION_STORAGE_KEY = 'reader.pagination_algo_version';
const PAGE_SHELL_CLASS = 'reader-page container max-w-2xl mx-auto px-4 h-full';
const SPREAD_PAGE_SHELL_CLASS = 'reader-page container max-w-2xl mx-auto h-full';
const IS_DEV = process.env.NODE_ENV === 'development';
const SHOW_READER_DEBUG_OVERLAY = false;
const PREFETCH_FORWARD_TARGET_CHARS = 5000;
const NEXT_CHAPTER_PREFETCH_TARGET_CHARS = 5000;
const NEXT_CHAPTER_WARMUP_DELAY_MS = 1500;

interface ReaderViewProps {
    bookId: string;
    title: string;
    author?: string | null;
    availableLanguages: string[];
    originalLanguage?: string | null;
    serverLanguage?: string | null;
    coverUrl?: string | null;
    isOwn?: boolean;
}

type PaginationCacheEntry = {
    pages: string[][];
    finalBlocks: ContentBlock[];
    fragmentMap: Map<string, string>;
    currentPageIdx: number;
    savedAt: number;
};

type ReaderDebugSnapshot = {
    status: 'ANALYZING' | 'STABLE';
    cause: 'none' | 'width_jitter' | 'mode_flap' | 'repaginate_without_width_change' | 'unknown';
    targetWidth: number;
    rawWidth: number;
    resolvedWidth: number;
    pageWidth: number;
    spread: boolean;
    widthFlips: number;
    widthRange: number;
    modeFlips: number;
    paginateRuns2s: number;
    hasShellRef: boolean;
    pagesReady: boolean;
    visiblePagesReady: boolean;
    isLoading: boolean;
    computeGateBlocked: boolean;
};

async function waitForMeasuredImages(container: HTMLElement | null): Promise<void> {
    if (!container) return;

    const images = Array.from(container.querySelectorAll('img'));
    if (images.length === 0) return;

    await Promise.all(images.map((img) => {
        if (img.complete) return Promise.resolve();

        return new Promise<void>((resolve) => {
            const cleanup = () => {
                img.removeEventListener('load', handleDone);
                img.removeEventListener('error', handleDone);
            };

            const handleDone = () => {
                cleanup();
                resolve();
            };

            img.addEventListener('load', handleDone, { once: true });
            img.addEventListener('error', handleDone, { once: true });
        });
    }));
}

function getBlockCharacterCount(block: ContentBlock): number {
    if (block.type === 'paragraph' || block.type === 'quote' || block.type === 'heading') {
        return (block.text ?? '').length;
    }
    if (block.type === 'list') {
        return (block.items ?? []).reduce((sum, item) => sum + item.length, 0);
    }
    return 0;
}

function collectBlockIdsWithinCharacterBudget(blocks: ContentBlock[], targetChars: number, startIndex = 0): { ids: string[]; totalChars: number } {
    const ids: string[] = [];
    let totalChars = 0;

    for (const block of blocks.slice(startIndex)) {
        ids.push(block.id);
        totalChars += getBlockCharacterCount(block);
        if (totalChars >= targetChars) break;
    }

    return { ids, totalChars };
}

function getSentenceIndex(block: ContentBlock): number {
    return 'sentenceIndex' in block && typeof block.sentenceIndex === 'number' ? block.sentenceIndex : 0;
}

function hashString(value: string): string {
    let hash = 5381;
    for (let i = 0; i < value.length; i += 1) {
        hash = ((hash << 5) + hash) ^ value.charCodeAt(i);
    }
    return (hash >>> 0).toString(36);
}

function getLayoutContentSignature(blocks: ContentBlock[]): string {
    const serialized = blocks.map((block) => {
        switch (block.type) {
            case 'paragraph':
            case 'quote':
                return `${block.id}|${block.type}|${block.position}|${block.text ?? ''}`;
            case 'heading':
                return `${block.id}|${block.type}|${block.position}|${block.level}|${block.text ?? ''}`;
            case 'list':
                return `${block.id}|${block.type}|${block.position}|${block.ordered ? '1' : '0'}|${(block.items ?? []).join('\u001f')}`;
            case 'image':
                return `${block.id}|${block.type}|${block.position}|${block.src ?? ''}|${block.alt ?? ''}|${block.caption ?? ''}`;
            case 'hr':
                return `${block.id}|${block.type}|${block.position}`;
        }
    }).join('\u001e');
    return hashString(serialized);
}

// Module-level cache so it survives route navigation (unmount/remount).
const paginationCache = new Map<string, PaginationCacheEntry>();

export default function ReaderView({ bookId, title, author, availableLanguages, originalLanguage, serverLanguage, coverUrl, isOwn = false }: ReaderViewProps) {
    const { user, isAlpha, isAuthenticated, loading: authLoading } = useAuth();
    const {
        hasHydrated,
        settings,
        perBookLanguages,
        syncVersions,
        setBookLanguage,
        setIsTranslatingForBook,
        setAnchor: storeSetAnchor,
        getAnchor,
        updateServerProgress,
    } = useAppStore();
    const isTranslating = useAppStore((state) => state.isTranslatingByBook[bookId] ?? false);
    const readerThemeConfig = READER_THEME_CONFIGS[settings.readerTheme] ?? READER_THEME_CONFIGS['light'];
    const readerSemanticTokens = getReaderSemanticTokens(readerThemeConfig);
    const readerContentTokens = getReaderContentTokens(readerThemeConfig);

    useEffect(() => {
        const previousVersion = window.localStorage.getItem(PAGINATION_ALGO_VERSION_STORAGE_KEY);
        if (previousVersion === PAGINATION_ALGO_VERSION) return;

        paginationCache.clear();
        void clearCachedChapterLayouts().finally(() => {
            window.localStorage.setItem(PAGINATION_ALGO_VERSION_STORAGE_KEY, PAGINATION_ALGO_VERSION);
        });
    }, []);

    const [currentChapterIndex, setCurrentChapterIndex] = useState(1);
    const [pendingLang, setPendingLang] = useState<Language | null>(null);
    const [isLanguageSwitching, setIsLanguageSwitching] = useState(false);
    const [isChapterEntryTransitionActive, setIsChapterEntryTransitionActive] = useState(false);
    const [showTranslationLimitModal, setShowTranslationLimitModal] = useState(false);
    const translationAllowedRef = useRef<boolean | null>(null);
    // Enforced limit + reset date from the check, so the modal copy matches the backend.
    const [translationLimitInfo, setTranslationLimitInfo] = useState<{ limit: number | null; periodEndsAt: string | null }>({ limit: null, periodEndsAt: null });

    const resolvedServerLang = useMemo<Language>(() => {
        const localBookLang = perBookLanguages[bookId];
        const candidates = [localBookLang, serverLanguage, originalLanguage];
        for (const c of candidates) {
            const l = c?.toLowerCase() as Language;
            if (l && ['en', 'fr', 'es', 'de', 'ru'].includes(l)) return l;
        }
        return settings.language;
    }, [perBookLanguages, bookId, serverLanguage, originalLanguage, settings.language]);
    const activeLang = pendingLang ?? resolvedServerLang;

    const { chapters, loading: chaptersLoading, error: chaptersError } = useChapters(bookId);
    const currentChapter = chapters[currentChapterIndex - 1] ?? null;
    const currentChapterId = currentChapter?.id ?? null;

    const {
        isBookMetaPending,
        isTocContentPending,
        readerBookTitle,
        readerBookAuthor,
        getResolvedChapterTitle,
        ensureTocTranslations,
    } = useReaderMetadataTranslations({
        userScope: user?.id ?? 'guest',
        bookId,
        activeLang,
        originalLanguage,
        title,
        author,
        chapters: chapters.map((chapter) => ({
            id: chapter.id,
            title: chapter.title,
            translations: chapter.translations,
        })),
    });

    const { blocks, loading: contentLoading, error: contentError, isStale, blocksLang, hasServerSnapshot } = useChapterContent(
        currentChapterId,
        activeLang.toUpperCase()
    );
    
    // displayBlocks starts from fetched blocks, gets progressively updated with translations
    const [displayBlocks, setDisplayBlocks] = useState<ContentBlock[]>([]);
    // Track which language displayBlocks was derived from
    const [displayBlocksLang, setDisplayBlocksLang] = useState<string | undefined>(undefined);

    // Reset displayBlocks when blocks from the content hook change (new language loaded)
    useEffect(() => {
        // Only update if blocks are for the correct language (not stale)
        if (blocksLang === activeLang.toUpperCase()) {
            setDisplayBlocks((prev) =>
                mergeDisplayBlocksPreservingTranslations(prev, blocks, {
                    // Never preserve translated text across different target languages.
                    preserve: displayBlocksLang === blocksLang,
                })
            );
            setDisplayBlocksLang(blocksLang);
        }
    }, [blocks, blocksLang, activeLang, displayBlocksLang]);

    // Content is effectively loading if:
    // - fetch is in progress
    // - blocks are stale (from different language)
    // - displayBlocks hasn't been synced with current language yet
    const isDisplayBlocksSynced = displayBlocksLang === activeLang.toUpperCase();
    const isContentLoading = contentLoading || isStale || !isDisplayBlocksSynced;

    // Merge translated blocks into displayBlocks
    const paginatedBlocksUpdaterRef = useRef<React.Dispatch<React.SetStateAction<ContentBlock[]>> | null>(null);
    const handleBlocksTranslated = useCallback((translated: ContentBlock[]) => {
        const translatedMap = new Map(translated.map((b) => [b.id, b]));
        const applyMap = (blocks: ContentBlock[]) =>
            blocks.map((b) => {
                // Direct match (non-fragmented block)
                const direct = translatedMap.get(b.id)
                if (direct) return direct
                // Fragment match: display block has parentId pointing to the translated block
                const parentId = (b as any).parentId
                if (parentId) {
                    const parent = translatedMap.get(parentId)
                    if (parent) {
                        return { ...b, targetLangReady: true, isTranslated: true, is_pending: false }
                    }
                }
                return b
            });
        setDisplayBlocks(applyMap);
        // Also update paginatedBlocks so the loader disappears immediately
        // (before repagination runs from the displayBlocks change)
        paginatedBlocksUpdaterRef.current?.(applyMap);
    }, []);

    const { getRefCallback, isTranslatingAny, abortAll, enqueueBlocks, enqueueBlocksImmediate, pendingBlockIds, reconcileBlocks } = useViewportTranslation({
        bookId,
        chapterId: currentChapterId,
        lang: activeLang.toUpperCase(),
        blocks: displayBlocks,
        sourceLanguage: originalLanguage ?? null,
        canTranslate: hasServerSnapshot,
        onBlocksTranslated: handleBlocksTranslated,
    });
    void isTranslatingAny; // used by AppleIntelligenceGlow indirectly

    // Computed once here, also used by the prefetch effect below
    const isSourceLang = originalLanguage
        ? originalLanguage.toUpperCase() === activeLang.toUpperCase()
        : false;

    useEffect(() => {
        if (perBookLanguages[bookId]) return;
        setBookLanguage(bookId, resolvedServerLang);
    }, [bookId, perBookLanguages, resolvedServerLang, setBookLanguage]);

    // Pre-check translation limit for non-alpha users reading their own books
    useEffect(() => {
        if (!isOwn || isAlpha || !isAuthenticated || authLoading) return;
        checkTranslationLimit(bookId).then(({ allowed, limit, periodEndsAt }) => {
            translationAllowedRef.current = allowed;
            setTranslationLimitInfo({ limit: limit ?? null, periodEndsAt: periodEndsAt ?? null });
        }).catch(() => {
            translationAllowedRef.current = true; // fail open
        });
    }, [isOwn, isAlpha, isAuthenticated, authLoading, bookId]);
    // NOTE: glow state is derived later, once pagination + currentPageBlocks are available.

    // ─── Reading session tracking ─────────────────────────────────────────────
    const sessionStartRef = useRef(Date.now());
    const pagesReadRef = useRef(0);
    const chaptersNavigatedRef = useRef(0);

    // ─── Performance tracking: book-open → first page ready ──────────────────
    // Measures the wall-clock time between ReaderView mount and the first
    // moment where the current page's visible blocks are fully rendered and
    // readable in the active language. Fires exactly once per mount.
    const bookOpenStartRef = useRef(
        typeof performance !== 'undefined' ? performance.now() : Date.now()
    );
    const bookOpenReadyFiredRef = useRef(false);
    // Tracks whether we started with cached content (no spinner shown).
    const bookOpenHadCachedContentRef = useRef<boolean | null>(null);

    // ─── Performance tracking: chapter navigation → next page ready ──────────
    // Set when the user triggers a chapter jump (TOC / link / slider / page
    // overflow). Cleared once the destination page is readable.
    const chapterNavStartRef = useRef<{
        startedAt: number;
        fromChapterId: string | null;
        toChapterIndex: number;
        source: 'toc' | 'link' | 'slider' | 'next' | 'prev' | 'search' | 'restore_anchor' | 'other';
    } | null>(null);

    // Fire session_started once on mount, session_ended on unmount
    useEffect(() => {
        trackReadingSessionStarted({
            book_id: bookId,
            chapter_index: currentChapterIndex,
            language: activeLang,
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const sessionStartedAt = sessionStartRef.current;
        return () => {
            trackReadingSessionEnded({
                book_id: bookId,
                duration_seconds: Math.round((Date.now() - sessionStartedAt) / 1000),
                pages_read: pagesReadRef.current,
                chapters_navigated: chaptersNavigatedRef.current,
            });
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Track chapter navigation (fire chapter_completed when moving forward)
    const initChapterTrackingRef = useRef(false);
    const prevChapterIdxRef = useRef(currentChapterIndex);
    useEffect(() => {
        if (!chapters.length) return;
        if (!initChapterTrackingRef.current) {
            initChapterTrackingRef.current = true;
            prevChapterIdxRef.current = currentChapterIndex;
            return;
        }
        if (currentChapterIndex > prevChapterIdxRef.current) {
            chaptersNavigatedRef.current += 1;
            trackChapterCompleted({
                book_id: bookId,
                chapter_index: prevChapterIdxRef.current,
                total_chapters: chapters.length,
            });
        }
        prevChapterIdxRef.current = currentChapterIndex;
    }, [currentChapterIndex, chapters.length, bookId]);

    // ─── Pagination state ────────────────────────────────────────────────────
    const contentAreaRef = useRef<HTMLDivElement>(null);
    const pageViewportRef = useRef<HTMLDivElement>(null);
    const measureContainerRef = useRef<HTMLDivElement>(null);
    const widthProbeShellRef = useRef<HTMLDivElement>(null);
    const blockMeasureRefs = useRef<Map<string, HTMLElement>>(new Map());

    const [pageHeight, setPageHeight] = useState(0);
    const [pageWidth, setPageWidth] = useState(0);
    const [pages, setPages] = useState<string[][]>([]);
    const [paginatedBlocks, setPaginatedBlocks] = useState<ContentBlock[]>([]);
    paginatedBlocksUpdaterRef.current = setPaginatedBlocks;
    const fragmentMapRef = useRef<Map<string, string>>(new Map());
    const [currentPageIdx, setCurrentPageIdx] = useState(0);
    // pagesReady: blocks have been measured and pages computed
    // visiblePagesReady: pages ready AND initial anchor has been applied (no flash to page 1)
    const [pagesReady, setPagesReady] = useState(false);
    const [visiblePagesReady, setVisiblePagesReady] = useState(false);
    const [remoteAnchorReady, setRemoteAnchorReady] = useState(false);
    const [layoutCacheReadyKey, setLayoutCacheReadyKey] = useState('');
    const currentPageIdxRef = useRef(0);
    const [rawColumnWidthPx, setRawColumnWidthPx] = useState(0);
    const [resolvedColumnWidthPx, setResolvedColumnWidthPx] = useState(0);
    const spreadModeEnabled = settings.pageLayoutMode === 'spread' && pageWidth >= SPREAD_MIN_VIEWPORT_PX;
    const widthHistoryRef = useRef<Array<{ t: number; w: number }>>([]);
    const modeHistoryRef = useRef<Array<{ t: number; spread: boolean }>>([]);
    const paginateHistoryRef = useRef<number[]>([]);
    const analyzeTimerRef = useRef<number | null>(null);
    const resolveWidthTimerRef = useRef<number | null>(null);
    const repaginateTimerRef = useRef<number | null>(null);
    const lastPaginatedChapterIdRef = useRef<string>('');
    const [debugSnapshot, setDebugSnapshot] = useState<ReaderDebugSnapshot | null>(null);
    const [headingTraceLines, setHeadingTraceLines] = useState<string[]>([]);

    const normalizedCurrentPageIdx = useMemo(() => {
        if (!spreadModeEnabled) return currentPageIdx;
        if (currentPageIdx % 2 === 0) return currentPageIdx;
        return Math.max(0, currentPageIdx - 1);
    }, [currentPageIdx, spreadModeEnabled]);

    const activePageIdx = spreadModeEnabled ? normalizedCurrentPageIdx : currentPageIdx;
    const rightPageIdx = spreadModeEnabled ? activePageIdx + 1 : -1;
    const normalizeForLayout = useCallback((idx: number) => {
        if (!spreadModeEnabled) return idx;
        return idx % 2 === 0 ? idx : Math.max(0, idx - 1);
    }, [spreadModeEnabled]);

    // Translation windows are block-based around the current reading position.
    const PREFETCH_BLOCKS_BACKWARD = 10;
    const HIGH_PRIORITY_VISIBLE_BLOCKS = 2;

    // Helper to convert fragment IDs to original block IDs for translation
    const resolveBlockIds = useCallback((fragmentIds: string[]): string[] => {
        const uniqueIds = new Set<string>();
        for (const id of fragmentIds) {
            // Check fragmentMap first, then look up in paginatedBlocks
            const parentId = fragmentMapRef.current.get(id);
            if (parentId) {
                uniqueIds.add(parentId);
            } else {
                // Not a fragment, might be original ID - verify in paginatedBlocks
                const block = paginatedBlocks.find((b) => b.id === id);
                uniqueIds.add(block?.parentId ?? id);
            }
        }
        return Array.from(uniqueIds);
    }, [paginatedBlocks]);

    useEffect(() => {
        if (normalizedCurrentPageIdx === currentPageIdx) return;
        setCurrentPageIdx(normalizedCurrentPageIdx);
    }, [normalizedCurrentPageIdx, currentPageIdx]);

    useEffect(() => {
        const probeEl = widthProbeShellRef.current;
        if (!probeEl) return;
        const update = () => {
            const rect = probeEl.getBoundingClientRect();
            const width = Math.max(0, Math.round(rect.width));
            setRawColumnWidthPx((prev) => (prev === width ? prev : width));
        };
        const ro = new ResizeObserver(update);
        ro.observe(probeEl);
        update();
        return () => ro.disconnect();
    }, [spreadModeEnabled, pageWidth]);

    // Stabilize measured width before using it in pagination key/compute.
    // This avoids feedback loops from 1px oscillation near spread thresholds.
    useEffect(() => {
        if (!rawColumnWidthPx) return;
        if (resolveWidthTimerRef.current != null) {
            window.clearTimeout(resolveWidthTimerRef.current);
        }
        resolveWidthTimerRef.current = window.setTimeout(() => {
            setResolvedColumnWidthPx((prev) => {
                if (!prev) return rawColumnWidthPx;
                const delta = Math.abs(rawColumnWidthPx - prev);
                return delta >= LAYOUT_SIGNIFICANT_DELTA_PX ? rawColumnWidthPx : prev;
            });
            resolveWidthTimerRef.current = null;
        }, 140);

        return () => {
            if (resolveWidthTimerRef.current != null) {
                window.clearTimeout(resolveWidthTimerRef.current);
                resolveWidthTimerRef.current = null;
            }
        };
    }, [rawColumnWidthPx]);

    useEffect(() => {
        if (!IS_DEV) return;
        const now = performance.now();
        widthHistoryRef.current.push({ t: now, w: rawColumnWidthPx });
        widthHistoryRef.current = widthHistoryRef.current.filter((x) => now - x.t <= 1500);

        modeHistoryRef.current.push({ t: now, spread: spreadModeEnabled });
        modeHistoryRef.current = modeHistoryRef.current.filter((x) => now - x.t <= 2000);

        paginateHistoryRef.current = paginateHistoryRef.current.filter((t) => now - t <= 2000);

        const widths = widthHistoryRef.current.map((x) => x.w).filter((w) => w > 0);
        const minW = widths.length ? Math.min(...widths) : 0;
        const maxW = widths.length ? Math.max(...widths) : 0;
        const widthRange = maxW - minW;
        const widthFlips = widthHistoryRef.current.slice(1).reduce((acc, x, i) => (
            x.w !== widthHistoryRef.current[i].w ? acc + 1 : acc
        ), 0);
        const modeFlips = modeHistoryRef.current.slice(1).reduce((acc, x, i) => (
            x.spread !== modeHistoryRef.current[i].spread ? acc + 1 : acc
        ), 0);
        const paginateRuns2s = paginateHistoryRef.current.length;

        setDebugSnapshot({
            status: 'ANALYZING',
            cause: 'unknown',
            targetWidth: resolvedColumnWidthPx || rawColumnWidthPx,
            rawWidth: rawColumnWidthPx,
            resolvedWidth: resolvedColumnWidthPx,
            pageWidth,
            spread: spreadModeEnabled,
            widthFlips,
            widthRange,
            modeFlips,
            paginateRuns2s,
            hasShellRef: !!widthProbeShellRef.current,
            pagesReady,
            visiblePagesReady,
            isLoading: chaptersLoading || isContentLoading,
            computeGateBlocked: pageHeight === 0 || pageWidth === 0 || resolvedColumnWidthPx === 0 || displayBlocks.length === 0,
        });

        if (analyzeTimerRef.current != null) {
            window.clearTimeout(analyzeTimerRef.current);
        }
        analyzeTimerRef.current = window.setTimeout(() => {
            const stableNow = performance.now();
            const widthsStable = widthHistoryRef.current.filter((x) => stableNow - x.t <= 2000).map((x) => x.w).filter((w) => w > 0);
            const minWs = widthsStable.length ? Math.min(...widthsStable) : 0;
            const maxWs = widthsStable.length ? Math.max(...widthsStable) : 0;
            const widthRangeStable = maxWs - minWs;
            const widthFlipsStable = widthsStable.slice(1).reduce((acc, w, i) => (
                w !== widthsStable[i] ? acc + 1 : acc
            ), 0);
            const modeStable = modeHistoryRef.current.filter((x) => stableNow - x.t <= 2000);
            const modeFlipsStable = modeStable.slice(1).reduce((acc, x, i) => (
                x.spread !== modeStable[i].spread ? acc + 1 : acc
            ), 0);
            const paginateRunsStable = paginateHistoryRef.current.filter((t) => stableNow - t <= 2000).length;

            let cause: ReaderDebugSnapshot['cause'] = 'none';
            if (modeFlipsStable >= 1) cause = 'mode_flap';
            else if (widthFlipsStable >= 4 && widthRangeStable >= 1) cause = 'width_jitter';
            else if (paginateRunsStable >= 4) cause = 'repaginate_without_width_change';

            setDebugSnapshot({
                status: 'STABLE',
                cause,
                targetWidth: resolvedColumnWidthPx || rawColumnWidthPx,
                rawWidth: rawColumnWidthPx,
                resolvedWidth: resolvedColumnWidthPx,
                pageWidth,
                spread: spreadModeEnabled,
                widthFlips: widthFlipsStable,
                widthRange: widthRangeStable,
                modeFlips: modeFlipsStable,
                paginateRuns2s: paginateRunsStable,
                hasShellRef: !!widthProbeShellRef.current,
                pagesReady,
                visiblePagesReady,
                isLoading: chaptersLoading || isContentLoading,
                computeGateBlocked: pageHeight === 0 || pageWidth === 0 || resolvedColumnWidthPx === 0 || displayBlocks.length === 0,
            });
            analyzeTimerRef.current = null;
        }, 1200);

        return () => {
            if (analyzeTimerRef.current != null) {
                window.clearTimeout(analyzeTimerRef.current);
                analyzeTimerRef.current = null;
            }
        };
    }, [rawColumnWidthPx, resolvedColumnWidthPx, pageWidth, spreadModeEnabled, pagesReady, visiblePagesReady, chaptersLoading, isContentLoading, pageHeight, displayBlocks.length]);

    useEffect(() => {
        if (!IS_DEV || !SHOW_READER_DEBUG_OVERLAY) return;
        const readTrace = () => {
            const w = window as Window & {
                __PAGINATION_HEADING_TRACE__?: Array<{
                    headingId: string;
                    headingLevel?: number;
                    action: string;
                    nextType?: string;
                    nextLevel?: number;
                }>;
            };
            const tail = (w.__PAGINATION_HEADING_TRACE__ ?? []).slice(-8);
            setHeadingTraceLines(
                tail.map((e) => `${e.action} h${e.headingLevel ?? '?'} id=${e.headingId.slice(0, 6)} next=${e.nextType ?? '-'}${e.nextLevel ? `:${e.nextLevel}` : ''}`)
            );
        };
        readTrace();
        const timer = window.setInterval(readTrace, 250);
        return () => window.clearInterval(timer);
    }, []);

    useEffect(() => {
        if (!pagesReady || isSourceLang || isContentLoading) return;

        let cancelled = false;

        const run = async () => {
            const currentFragmentIds = pages[activePageIdx] ?? [];
            const currentIds = resolveBlockIds(currentFragmentIds);
            const anchorBlockId = currentIds[0] ?? null;
            const anchorIdx = anchorBlockId ? displayBlocks.findIndex((block) => block.id === anchorBlockId) : -1;
            const chapterIdx = currentChapterIndex - 1;

            const loadChapterBlocks = async (idx: number): Promise<ContentBlock[]> => {
                const chapter = chapters[idx];
                if (!chapter) return [];
                const cachedChapter = await getCachedChapterContent(chapter.id, activeLang.toUpperCase());
                if (cachedChapter?.blocks?.length) return cachedChapter.blocks;
                try {
                    const nextBlocks = await fetchContent(chapter.id, activeLang.toUpperCase());
                    await setCachedChapterContent(chapter.id, activeLang.toUpperCase(), nextBlocks);
                    return nextBlocks;
                } catch {
                    return [];
                }
            };

            const forwardIds: string[] = [];
            let forwardChars = 0;
            if (anchorIdx >= 0) {
                const currentChapterForward = collectBlockIdsWithinCharacterBudget(
                    displayBlocks,
                    PREFETCH_FORWARD_TARGET_CHARS,
                    anchorIdx + 1,
                );
                forwardIds.push(...currentChapterForward.ids);
                forwardChars += currentChapterForward.totalChars;
            }
            for (let idx = chapterIdx + 1; forwardChars < PREFETCH_FORWARD_TARGET_CHARS && idx < chapters.length; idx += 1) {
                const chapterBlocks = await loadChapterBlocks(idx);
                const nextChapterForward = collectBlockIdsWithinCharacterBudget(
                    chapterBlocks,
                    PREFETCH_FORWARD_TARGET_CHARS - forwardChars,
                );
                forwardIds.push(...nextChapterForward.ids);
                forwardChars += nextChapterForward.totalChars;
            }

            const backwardIds: string[] = [];
            if (anchorIdx >= 0) {
                backwardIds.unshift(...displayBlocks.slice(Math.max(0, anchorIdx - PREFETCH_BLOCKS_BACKWARD), anchorIdx).map((block) => block.id));
            }
            for (let idx = chapterIdx - 1; backwardIds.length < PREFETCH_BLOCKS_BACKWARD && idx >= 0; idx -= 1) {
                const ids = await getCachedChapterBlockIds(chapters[idx].id);
                backwardIds.unshift(...ids);
            }

            const boundedForwardIds = forwardIds;
            const boundedBackwardIds = backwardIds.slice(Math.max(0, backwardIds.length - PREFETCH_BLOCKS_BACKWARD));

            if (cancelled) return;

            const reconcileIds = Array.from(new Set([...currentIds, ...boundedForwardIds, ...boundedBackwardIds]));
            if (reconcileIds.length > 0) {
                void reconcileBlocks(reconcileIds);
            }

            if (currentIds.length > 0) {
                const visibleHighIds = currentIds.slice(0, HIGH_PRIORITY_VISIBLE_BLOCKS);
                const visibleRemainingIds = currentIds.slice(HIGH_PRIORITY_VISIBLE_BLOCKS);
                console.log(JSON.stringify({
                    event: 'translate_current_page',
                    pageIdx: activePageIdx,
                    blockCount: currentIds.length,
                    visibleHighCount: visibleHighIds.length,
                    visibleDeferredCount: visibleRemainingIds.length,
                }));
                if (visibleHighIds.length > 0) {
                    enqueueBlocksImmediate(visibleHighIds);
                }
                if (visibleRemainingIds.length > 0) {
                    enqueueBlocks(visibleRemainingIds);
                }
            }

            if (boundedForwardIds.length > 0) {
                console.log(JSON.stringify({ event: 'prefetch_forward_enqueue', pageIdx: activePageIdx, totalBlocks: boundedForwardIds.length, totalChars: forwardChars }));
                enqueueBlocks(boundedForwardIds);
            }
            if (boundedBackwardIds.length > 0) {
                console.log(JSON.stringify({ event: 'prefetch_backward_enqueue', pageIdx: activePageIdx, totalBlocks: boundedBackwardIds.length }));
                enqueueBlocks(boundedBackwardIds);
            }
        };

        void run();

        return () => {
            cancelled = true;
        };
    }, [activePageIdx, pagesReady, pages, enqueueBlocks, enqueueBlocksImmediate, isSourceLang, isContentLoading, resolveBlockIds, displayBlocks, reconcileBlocks, chapters, currentChapterIndex, activeLang]);

    useEffect(() => {
        if (!pagesReady || isSourceLang || isContentLoading) return;

        const nextChapter = chapters[currentChapterIndex];
        if (!nextChapter) return;

        let cancelled = false;
        let timeoutId: number | null = null;

        const run = async () => {
            // If the rolling prefetch (or first-open batch) is still in flight
            // for this chapter, let it land first to avoid a duplicate /content.
            const pending = getPendingChapterBatch(nextChapter.id);
            if (pending) {
                try { await pending } catch {}
                if (cancelled) return;
            }

            let nextChapterBlocks = (await getCachedChapterContent(nextChapter.id, activeLang.toUpperCase()))?.blocks ?? [];
            if (cancelled) return;

            if (nextChapterBlocks.length === 0) {
                try {
                    nextChapterBlocks = await fetchContent(nextChapter.id, activeLang.toUpperCase());
                    await setCachedChapterContent(nextChapter.id, activeLang.toUpperCase(), nextChapterBlocks);
                } catch {
                    return;
                }
            }

            const pendingBlocks = nextChapterBlocks.filter((block) => (
                isTranslatableBlock(block) && !block.targetLangReady
            ));
            if (pendingBlocks.length === 0) return;

            const { ids: nextChapterIds, totalChars } = collectBlockIdsWithinCharacterBudget(
                pendingBlocks,
                NEXT_CHAPTER_PREFETCH_TARGET_CHARS,
            );
            if (nextChapterIds.length === 0) return;

            const blocksById = new Map(nextChapterBlocks.map((block) => [block.id, block] as const));

            console.log(JSON.stringify({
                event: 'prefetch_next_chapter_enqueue',
                currentChapterId,
                nextChapterId: nextChapter.id,
                totalBlocks: nextChapterIds.length,
                totalChars,
            }));

            try {
                await translateBlocksStreaming(
                    nextChapter.id,
                    activeLang.toUpperCase(),
                    nextChapterIds,
                    nextChapterIds[0] ?? null,
                    'down',
                    (result) => {
                        if (cancelled) return;
                        if (result.status !== 'ok' || !result.translatedText) return;

                        const original = blocksById.get(result.blockId);
                        if (!original) return;

                        const translated = original.type === 'list'
                            ? { ...original, items: result.translatedText.split('\n').filter(Boolean), targetLangReady: true, isTranslated: true, is_pending: false }
                            : original.type === 'paragraph' || original.type === 'quote' || original.type === 'heading'
                                ? { ...original, text: result.translatedText, targetLangReady: true, isTranslated: true, is_pending: false }
                                : null;
                        if (!translated) return;

                        void setCachedTranslatedBlockText(nextChapter.id, activeLang.toUpperCase(), translated);
                    },
                );
            } catch {
                // best-effort warmup for next chapter
            }
        };

        timeoutId = window.setTimeout(() => {
            if (cancelled) return;
            void run();
        }, NEXT_CHAPTER_WARMUP_DELAY_MS);

        return () => {
            cancelled = true;
            if (timeoutId != null) {
                window.clearTimeout(timeoutId);
            }
        };
    }, [pagesReady, isSourceLang, isContentLoading, chapters, currentChapterIndex, currentChapterId, activeLang]);

    // Measure the available height for content after the header
    useEffect(() => {
        if (!pageViewportRef.current) return;
        const updateHeight = () => {
            if (pageViewportRef.current) {
                const nextHeight = pageViewportRef.current.clientHeight;
                const nextWidth = pageViewportRef.current.clientWidth;
                setPageHeight((prev) => (
                    !prev || Math.abs(nextHeight - prev) >= LAYOUT_SIGNIFICANT_DELTA_PX ? nextHeight : prev
                ));
                setPageWidth((prev) => (
                    !prev || Math.abs(nextWidth - prev) >= LAYOUT_SIGNIFICANT_DELTA_PX ? nextWidth : prev
                ));
            }
        };
        const ro = new ResizeObserver(updateHeight);
        ro.observe(pageViewportRef.current);
        updateHeight();
        return () => ro.disconnect();
    }, []);

    const typographedBlocks = useMemo(
        () => applyTypografToBlocks(displayBlocks, activeLang),
        [displayBlocks, activeLang]
    );

    // Normalized blocks split lists into items but keep paragraphs intact
    const normalizedBlocks = useMemo(() => normalizeBlocks(typographedBlocks), [typographedBlocks]);

    // ID of the first image block in chapter 1 — only it should be rendered as the book cover.
    // Images in all other chapters are relative EPUB paths that cannot be resolved and are hidden.
    const firstImageBlockId = useMemo(
        () => currentChapterIndex === 1 ? typographedBlocks.find((b) => b.type === 'image')?.id : undefined,
        [typographedBlocks, currentChapterIndex]
    );

    // Recompute pages when block structure, text content, or page height changes.
    // Including text lengths ensures pages recompute when translations arrive
    // (translated text has different length than original → page breaks shift).
    const blockStructureKey = useMemo(
        () => {
            const contentSignature = getLayoutContentSignature(normalizedBlocks);
            return `${PAGINATION_ALGO_VERSION}__${contentSignature}__${pageHeight}__${resolvedColumnWidthPx}__${settings.fontSize}__${settings.lineHeightScale}__${settings.readerTheme}__${displayBlocksLang}`;
        },
        [normalizedBlocks, pageHeight, resolvedColumnWidthPx, settings.fontSize, settings.lineHeightScale, settings.readerTheme, displayBlocksLang]
    );
    const prevBlockStructureKey = useRef('');
    const lastProgressFetchAtRef = useRef<Map<string, number>>(new Map());
    const lastHandledProgressScopeRef = useRef<string | null>(null);

    // In-memory pagination cache to avoid skeleton flashes on repeated opens.
    // Keyed by computed layout + chapter to ensure correctness across font/viewport/lang changes.
    const paginationCacheKey = useMemo(() => {
        const chapterId = currentChapter?.id ?? '';
        return `${bookId}::${chapterId}::${blockStructureKey}`;
    }, [bookId, currentChapter?.id, blockStructureKey]);
    const localAnchorChapterAppliedRef = useRef<string | null>(null);
    const restoredFromPaginationCacheRef = useRef(false);
    const prevResetChapterIdRef = useRef<string>('');
    const batchPrefetchedBookRef = useRef<string | null>(null);

    useEffect(() => {
        if (!hasHydrated) return;
        if (chaptersLoading || chapters.length === 0) return;
        const anchor = getAnchor(bookId);
        if (!anchor?.chapterId) return;

        const applyKey = `${bookId}::${anchor.chapterId}`;
        if (localAnchorChapterAppliedRef.current === applyKey) return;

        const chapterIdx = chapters.findIndex((chapter) => chapter.id === anchor.chapterId);
        if (chapterIdx < 0) return;

        localAnchorChapterAppliedRef.current = applyKey;
        setCurrentChapterIndex((prev) => (prev === chapterIdx + 1 ? prev : chapterIdx + 1));
    }, [bookId, chapters, chaptersLoading, getAnchor, hasHydrated]);

    // First-open batch prefetch: when the user opens a book with no reading position
    // (or anchored to the first chapter), fetch ~60 blocks starting from the first
    // unread block and cache every complete chapter in that batch. Guards against
    // the pathological "many tiny early chapters" case where per-chapter prefetch
    // can't keep up with rapid chapter advancement.
    useEffect(() => {
        if (!hasHydrated) return;
        if (chaptersLoading || chapters.length === 0) return;
        if (batchPrefetchedBookRef.current === bookId) return;

        const anchor = getAnchor(bookId);
        const firstChapter = chapters[0];
        if (!firstChapter) return;

        const isNearStart = !anchor?.chapterId || anchor.chapterId === firstChapter.id;
        if (!isNearStart) {
            batchPrefetchedBookRef.current = bookId;
            return;
        }

        // Pick the earliest block we can start from. first_block_id is null for
        // chapters with no content blocks (e.g. bare image/cover chapters), so
        // scan forward to the first chapter with a real starting block.
        const hasMidChapterAnchor = !!anchor?.blockId;
        let startBlockId: string | null = anchor?.blockId ?? null;
        let startChapterIdx = 0;
        if (!startBlockId) {
            for (let i = 0; i < chapters.length; i++) {
                if (chapters[i].first_block_id) {
                    startBlockId = chapters[i].first_block_id;
                    startChapterIdx = i;
                    break;
                }
            }
        } else if (anchor?.chapterId) {
            const idx = chapters.findIndex((c) => c.id === anchor.chapterId);
            if (idx >= 0) startChapterIdx = idx;
        }
        if (!startBlockId) {
            batchPrefetchedBookRef.current = bookId;
            return;
        }

        batchPrefetchedBookRef.current = bookId;

        // Snapshot the lang at prefetch start — if the user switches languages later
        // we write under the lang at the time of fetch, and lang-change logic in
        // useChapterContent will re-fetch as needed.
        const prefetchLang = activeLang.toUpperCase();

        // If we started at a mid-chapter anchor, the batch's first chapter is
        // partial (blocks from the anchor onward). Skip caching it — a partial
        // skeleton would overwrite the full one. Also don't claim that chapter
        // as batch-pending: that chapter is the user's current position, so
        // making its useChapterContent wait on the batch would add pointless
        // latency to the screen they're already looking at.
        const skipFirstBatchChapter = hasMidChapterAnchor;
        const firstClaimIdx = skipFirstBatchChapter ? startChapterIdx + 1 : startChapterIdx;
        const candidateChapterIds = chapters.slice(firstClaimIdx).map((c) => c.id);

        // Give every candidate chapter its own pending promise so a waiter
        // only blocks on its specific chapter's write, not on the slowest
        // chapter in the batch.
        const resolvers = new Map<string, () => void>();
        for (const chapterId of candidateChapterIds) {
            const promise = new Promise<void>((resolve) => {
                resolvers.set(chapterId, resolve);
            });
            markChapterPending(chapterId, promise);
        }
        const resolveAll = () => {
            for (const resolve of resolvers.values()) resolve();
            resolvers.clear();
        };

        // No AbortController: this is a fire-and-forget best-effort prefetch.
        // Aborting on unmount/deps-change would kill in-flight requests during
        // stale-while-revalidate dep churn; the ref guard prevents duplicates.
        fetchBlockBatch(startBlockId, 60, prefetchLang)
            .then(async (blocks) => {
                if (blocks.length === 0) {
                    resolveAll();
                    return;
                }
                const grouped = new Map<string, BatchContentBlock[]>();
                for (const b of blocks) {
                    const list = grouped.get(b.chapter_id);
                    if (list) list.push(b);
                    else grouped.set(b.chapter_id, [b]);
                }
                const chapterIds = Array.from(grouped.keys());
                // Drop the last chapter: batch may have cut off mid-chapter.
                // Drop the first chapter too if we started mid-chapter (partial).
                const firstIdx = skipFirstBatchChapter ? 1 : 0;
                const completeChapterIds = new Set(chapterIds.slice(firstIdx, -1));

                // Unblock any waiters for chapters we aren't going to write
                // (not in response, skipped partial/cut-off) so they fall
                // straight through to /content without hanging on this batch.
                for (const [chapterId, resolve] of resolvers) {
                    if (!completeChapterIds.has(chapterId)) {
                        resolve();
                        resolvers.delete(chapterId);
                    }
                }

                // Writes run in parallel; each chapter's pending promise
                // resolves the instant its own write completes, regardless of
                // how long other chapters' writes take.
                await Promise.all(
                    Array.from(completeChapterIds).map(async (chapterId) => {
                        const chapterBlocks = grouped.get(chapterId);
                        const resolve = resolvers.get(chapterId);
                        try {
                            if (chapterBlocks && chapterBlocks.length > 0) {
                                await setCachedChapterContent(chapterId, prefetchLang, chapterBlocks);
                            }
                        } finally {
                            resolve?.();
                            resolvers.delete(chapterId);
                        }
                    }),
                );
            })
            .catch(() => {
                // Best-effort prefetch — swallow errors and release waiters.
                resolveAll();
            });
    }, [bookId, chapters, chaptersLoading, getAnchor, hasHydrated, activeLang]);

    // Rolling prefetch: while the user reads, fetch the next couple of
    // chapters in the background so moving forward is instant. The first-open
    // batch already warms up the initial run of chapters; this kicks in from
    // chapter ~N onward and any time the user jumps ahead via TOC/search.
    // Each prefetch is registered in the pending-chapter registry so
    // useChapterContent awaits it rather than firing a duplicate /content.
    useEffect(() => {
        if (!hasHydrated) return;
        if (chaptersLoading || chapters.length === 0) return;
        if (currentChapterIndex <= 0) return;

        const lang = activeLang.toUpperCase();
        const PREFETCH_AHEAD = 2;

        let cancelled = false;

        async function prefetchChapter(chapterId: string) {
            // Already claimed by the first-open batch or a prior prefetch —
            // whoever claimed it will populate the cache.
            if (getPendingChapterBatch(chapterId)) return;

            // Skeleton present means /content has already been fetched for
            // this chapter at least once. Missing translations are the
            // translation scheduler's job — another /content call won't help.
            const existingSkeleton = await getCachedChapterBlockIds(chapterId);
            if (cancelled) return;
            if (existingSkeleton.length > 0) return;
            if (getPendingChapterBatch(chapterId)) return;

            let resolve!: () => void;
            const promise = new Promise<void>((r) => { resolve = r });
            markChapterPending(chapterId, promise);

            try {
                const blocks = await fetchContent(chapterId, lang);
                if (cancelled) return;
                await setCachedChapterContent(chapterId, lang, blocks);
            } catch {
                // best-effort prefetch
            } finally {
                resolve();
            }
        }

        for (let i = 0; i < PREFETCH_AHEAD; i++) {
            const nextChapter = chapters[currentChapterIndex + i];
            if (!nextChapter) break;
            void prefetchChapter(nextChapter.id);
        }

        return () => {
            cancelled = true;
        };
    }, [currentChapterIndex, chapters, chaptersLoading, hasHydrated, activeLang]);

    useEffect(() => {
        if (layoutCacheReadyKey !== paginationCacheKey) return;
        if (blockStructureKey === prevBlockStructureKey.current) return;
        if (pageHeight === 0 || pageWidth === 0 || resolvedColumnWidthPx === 0 || normalizedBlocks.length === 0) return;

        let cancelled = false;

        async function measureAndCompute() {
            if (IS_DEV) {
                const now = performance.now();
                paginateHistoryRef.current.push(now);
                paginateHistoryRef.current = paginateHistoryRef.current.filter((t) => now - t <= 2000);
            }
            // Ensure fonts are loaded before measuring
            if (document.fonts && document.fonts.ready) {
                await document.fonts.ready;
            }
            await waitForMeasuredImages(measureContainerRef.current);
            if (cancelled) return;

            prevBlockStructureKey.current = blockStructureKey;

            const heights = new Map<string, number>();
            blockMeasureRefs.current.forEach((el, id) => heights.set(id, el.offsetHeight));

            const computed = computePages(
                normalizedBlocks,
                heights,
                pageHeight,
                measureContainerRef.current,
                settings.fontSize,
                displayBlocksLang ?? activeLang,
                settings.lineHeightScale,
                1,
                settings.readerTheme,
                blockMeasureRefs.current,
                resolvedColumnWidthPx,
                spreadModeEnabled ? SPREAD_PAGE_SHELL_CLASS : PAGE_SHELL_CLASS,
            );

            setPages(computed.pages);
            setPaginatedBlocks(computed.finalBlocks);
            fragmentMapRef.current = computed.fragmentMap;
            setPagesReady(true);

            // Update cache for instant reopen.
            paginationCache.set(paginationCacheKey, {
                pages: computed.pages,
                finalBlocks: computed.finalBlocks,
                fragmentMap: computed.fragmentMap,
                currentPageIdx: currentPageIdxRef.current,
                savedAt: Date.now(),
            });

            void setCachedChapterLayout({
                key: paginationCacheKey,
                bookId,
                chapterId: currentChapter?.id ?? '',
                layoutKey: blockStructureKey,
                pages: computed.pages,
                finalBlocks: computed.finalBlocks,
                fragmentEntries: Array.from(computed.fragmentMap.entries()),
                currentPageIdx: currentPageIdxRef.current,
            }).catch(() => {
                // Ignore IDB failures; memory cache still keeps navigation smooth.
            });
        }

        // Debounce exists to coalesce rapid resize/font-change triggers. A chapter
        // change is a discrete user action with no follow-up — skip the debounce so
        // the skeleton doesn't linger while nothing is happening.
        const chapterId = currentChapter?.id ?? '';
        const isChapterChange = chapterId !== lastPaginatedChapterIdRef.current;
        lastPaginatedChapterIdRef.current = chapterId;
        const delayMs = isChapterChange ? 0 : REPAGINATE_DEBOUNCE_MS;

        repaginateTimerRef.current = window.setTimeout(() => {
            void measureAndCompute();
            repaginateTimerRef.current = null;
        }, delayMs);

        return () => {
            cancelled = true;
            if (repaginateTimerRef.current != null) {
                window.clearTimeout(repaginateTimerRef.current);
                repaginateTimerRef.current = null;
            }
        };
    }, [layoutCacheReadyKey, paginationCacheKey, blockStructureKey, pageHeight, pageWidth, resolvedColumnWidthPx, normalizedBlocks, settings.fontSize, settings.lineHeightScale, settings.readerTheme, displayBlocksLang, activeLang, currentChapter?.id, bookId, spreadModeEnabled]);

    // ─── Anchor restore ──────────────────────────────────────────────────────
    // Set by language-switch handler: blockId + sentenceIndex to jump to on next page recompute
    const pendingAnchorBlockId = useRef<string | null>(null);
    const pendingAnchorSentenceIndex = useRef<number>(0);

    // Reset pagination state when chapter changes — but first try to restore from cache to avoid flashing skeletons.
    // When only blockStructureKey changes within the same chapter (e.g. translations arriving),
    // skip the full reset to avoid a skeleton flash — the repagination effect handles the update.
    useEffect(() => {
        const chapterId = currentChapter?.id ?? '';
        if (!chapterId) return;

        const isChapterChange = chapterId !== prevResetChapterIdRef.current;
        prevResetChapterIdRef.current = chapterId;

        // If the chapter hasn't changed, only the block structure changed (translations arrived).
        // Keep current pages visible and just let the repagination effect recompute in place.
        if (!isChapterChange) {
            setLayoutCacheReadyKey(paginationCacheKey);
            return;
        }

        let cancelled = false;
        setLayoutCacheReadyKey('');
        restoredFromPaginationCacheRef.current = false;
        setPagesReady(false);
        setVisiblePagesReady(false);
        setPages([]);
        setPaginatedBlocks([]);
        fragmentMapRef.current = new Map();
        setCurrentPageIdx(0);

        const cached = paginationCache.get(paginationCacheKey);
        if (cached) {
            restoredFromPaginationCacheRef.current = true;
            prevBlockStructureKey.current = blockStructureKey;
            setPages(cached.pages);
            setPaginatedBlocks(cached.finalBlocks);
            fragmentMapRef.current = cached.fragmentMap;
            setPagesReady(true);
            setCurrentPageIdx(Math.max(0, Math.min(cached.currentPageIdx, cached.pages.length - 1)));
            setVisiblePagesReady(false);
            setLayoutCacheReadyKey(paginationCacheKey);
            return;
        }

        void getCachedChapterLayout(paginationCacheKey)
            .then((cachedLayout) => {
                if (cancelled) return;
                if (cachedLayout && cachedLayout.layoutKey === blockStructureKey) {
                    restoredFromPaginationCacheRef.current = true;
                    prevBlockStructureKey.current = blockStructureKey;
                    setPages(cachedLayout.pages);
                    setPaginatedBlocks(cachedLayout.finalBlocks);
                    fragmentMapRef.current = new Map(cachedLayout.fragmentEntries);
                    setPagesReady(true);
                    setCurrentPageIdx(Math.max(0, Math.min(cachedLayout.currentPageIdx, cachedLayout.pages.length - 1)));
                    setVisiblePagesReady(false);
                }
            })
            .catch(() => {
                // Ignore cache hydration failures; a fresh compute will follow.
            })
            .finally(() => {
                if (cancelled) return;
                setLayoutCacheReadyKey(paginationCacheKey);
            });

        return () => {
            cancelled = true;
        };
    }, [currentChapter?.id, paginationCacheKey, blockStructureKey]);

    useEffect(() => {
        if (!pagesReady || pages.length === 0) return;
        const cached = paginationCache.get(paginationCacheKey);
        if (!cached) return;
        paginationCache.set(paginationCacheKey, { ...cached, currentPageIdx: activePageIdx, savedAt: Date.now() });
    }, [activePageIdx, pagesReady, pages.length, paginationCacheKey]);

    // Authenticated users: local-first anchor restore + conditional server revalidation.
    useEffect(() => {
        if (!hasHydrated) return;
        let cancelled = false;
        const localAnchor = getAnchor(bookId);
        const localAnchorChapterId = localAnchor?.chapterId;
        if (localAnchorChapterId) {
            const localChapterIdx = chapters.findIndex((c) => c.id === localAnchorChapterId);
            if (localChapterIdx >= 0) {
                setCurrentChapterIndex(localChapterIdx + 1);
            }
        }

        if (authLoading || chaptersLoading) return;
        if (!isAuthenticated) {
            setRemoteAnchorReady(true);
            return;
        }

        const scopeKey = user?.id ?? 'guest';
        const hasLocalAnchor = !!localAnchor;
        const currentProgressScope = syncVersions.progress;
        const scopeChanged =
            !!currentProgressScope &&
            currentProgressScope !== lastHandledProgressScopeRef.current;
        const lastFetchAt = lastProgressFetchAtRef.current.get(bookId) ?? 0;
        const ttlExpired = Date.now() - lastFetchAt > 5 * 60 * 1000;
        const shouldFetchRemote = !hasLocalAnchor || scopeChanged || ttlExpired;

        // Never block initial render if we already have local anchor.
        setRemoteAnchorReady(hasLocalAnchor);
        console.log(JSON.stringify({
            event: 'reading_position_revalidate_decision',
            bookId,
            hasLocalAnchor,
            scopeChanged,
            ttlExpired,
            shouldFetchRemote,
        }));

        // Fast restore from persisted cache, then revalidate against server.
        if (!hasLocalAnchor) {
            setRemoteAnchorReady(false);
        }
        void getCachedReadingPosition(scopeKey, bookId).then((cached) => {
            if (cancelled) return;
            const remote = cached?.position;
            const chapterId = remote?.chapter_id;
            if (!chapterId) return;

            // Apply cached server anchor only when no stronger local anchor exists.
            if (!hasLocalAnchor) {
                const chapterIdx = chapters.findIndex((c) => c.id === chapterId);
                if (chapterIdx >= 0) setCurrentChapterIndex(chapterIdx + 1);

                if (remote.block_id && remote.block_position != null) {
                    storeSetAnchor(bookId, {
                        chapterId,
                        blockId: remote.block_id,
                        blockPosition: remote.block_position,
                        sentenceIndex: remote.sentence_index ?? 0,
                        updatedAt: remote.updated_at ?? new Date().toISOString(),
                    });
                }
            }

            setRemoteAnchorReady(true);
        }).catch(() => {
            // ignore
        });

        if (!shouldFetchRemote) {
            if (currentProgressScope) {
                lastHandledProgressScopeRef.current = currentProgressScope;
            }
            return () => {
                cancelled = true;
            };
        }

        fetchReadingPosition(bookId)
            .then((remote) => {
                if (cancelled) return;

                const chapterId = remote.chapter_id;
                if (!chapterId) {
                    lastProgressFetchAtRef.current.set(bookId, Date.now());
                    if (currentProgressScope) {
                        lastHandledProgressScopeRef.current = currentProgressScope;
                    }
                    setRemoteAnchorReady(true);
                    return;
                }

                const localAnchorUpdatedMs = localAnchor?.updatedAt
                    ? Date.parse(localAnchor.updatedAt)
                    : NaN;
                const remoteUpdatedMs = remote.updated_at
                    ? Date.parse(remote.updated_at)
                    : NaN;
                const isRemoteNewerThanLocal =
                    Number.isFinite(remoteUpdatedMs) &&
                    (!Number.isFinite(localAnchorUpdatedMs) || remoteUpdatedMs > localAnchorUpdatedMs);

                // Soft reconcile: force navigation when local anchor is missing,
                // scope definitely changed, or server anchor is newer than local.
                const shouldApplyRemoteAnchor = !hasLocalAnchor || scopeChanged || isRemoteNewerThanLocal;
                if (shouldApplyRemoteAnchor) {
                    const chapterIdx = chapters.findIndex((c) => c.id === chapterId);
                    if (chapterIdx >= 0) {
                        setCurrentChapterIndex(chapterIdx + 1);
                    }

                    if (remote.block_id && remote.block_position != null) {
                        storeSetAnchor(bookId, {
                            chapterId,
                            blockId: remote.block_id,
                            blockPosition: remote.block_position,
                            sentenceIndex: remote.sentence_index ?? 0,
                            updatedAt: remote.updated_at ?? new Date().toISOString(),
                        });
                    }
                }

                void setCachedReadingPosition(scopeKey, bookId, { position: remote, updatedAt: remote.updated_at ?? null });
                lastProgressFetchAtRef.current.set(bookId, Date.now());
                if (currentProgressScope) {
                    lastHandledProgressScopeRef.current = currentProgressScope;
                }
                setRemoteAnchorReady(true);
            })
            .catch(() => {
                if (!cancelled) {
                    setRemoteAnchorReady(true);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [authLoading, chaptersLoading, hasHydrated, isAuthenticated, bookId, chapters, storeSetAnchor, user?.id, getAnchor, syncVersions.progress]);

    useEffect(() => {
        if (!hasHydrated) return;
        if (!remoteAnchorReady) return;
        if (!pagesReady || pages.length === 0) return;
        if (visiblePagesReady && pendingAnchorBlockId.current === null) return;

        const savedAnchor = getAnchor(bookId);
        const hasSavedAnchorForCurrentChapter =
            !!savedAnchor && savedAnchor.chapterId === (currentChapter?.id ?? '');

        if (
            restoredFromPaginationCacheRef.current &&
            pendingAnchorBlockId.current === null &&
            !hasSavedAnchorForCurrentChapter
        ) {
            setVisiblePagesReady(true);
            return;
        }

        // If there's a pending anchor (from language switch), use it
        const targetBlockId = pendingAnchorBlockId.current;
        if (targetBlockId !== null) {
            if (targetBlockId === LAST_PAGE_SENTINEL) {
                pendingAnchorBlockId.current = null;
                pendingAnchorSentenceIndex.current = 0;
                setCurrentPageIdx(normalizeForLayout(Math.max(0, pages.length - 1)));
                setVisiblePagesReady(true);
                return;
            }
            const targetSentenceIndex = pendingAnchorSentenceIndex.current;
            pendingAnchorBlockId.current = null;
            pendingAnchorSentenceIndex.current = 0;
            const idx = findPageForBlockAndSentence(pages, paginatedBlocks, targetBlockId, targetSentenceIndex, fragmentMapRef.current);
            if (idx >= 0) {
                setCurrentPageIdx(normalizeForLayout(idx));
                setVisiblePagesReady(true);
                return;
            }
            // Fallback: by position
            const block = displayBlocks.find((b) => b.id === targetBlockId);
            if (block) {
                const byPos = findPageByBlockPosition(pages, paginatedBlocks, block.position);
                setCurrentPageIdx(normalizeForLayout(Math.max(0, byPos)));
            }
            setVisiblePagesReady(true);
            return;
        }

        // Initial load: restore from saved anchor
        const anchor = savedAnchor;
        if (anchor && anchor.chapterId === (currentChapter?.id ?? '')) {
            if (anchor.fragmentId) {
                const exactPageIdx = pages.findIndex((page) => page.includes(anchor.fragmentId!));
                if (exactPageIdx >= 0) {
                    setCurrentPageIdx(normalizeForLayout(exactPageIdx));
                    setVisiblePagesReady(true);
                    return;
                }
            }
            const idx = findPageForBlockAndSentence(pages, paginatedBlocks, anchor.blockId, anchor.sentenceIndex ?? 0, fragmentMapRef.current);
            if (idx >= 0) {
                setCurrentPageIdx(normalizeForLayout(idx));
                setVisiblePagesReady(true);
                return;
            }
            const byPos = findPageByBlockPosition(pages, paginatedBlocks, anchor.blockPosition);
            setCurrentPageIdx(normalizeForLayout(Math.max(0, byPos)));
        }
        setVisiblePagesReady(true);
    }, [hasHydrated, remoteAnchorReady, pagesReady, pages, bookId, currentChapter?.id, displayBlocks, getAnchor, paginatedBlocks, visiblePagesReady, normalizeForLayout]);

    // ─── Anchor save (throttled ~1 s) ────────────────────────────────────────
    const lastSavedAnchorAt = useRef(0);
    const pendingAnchorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastAnchorRef = useRef<ReadingAnchor | null>(null);

    const persistAnchor = useCallback((anchor: ReadingAnchor) => {
        storeSetAnchor(bookId, anchor);
        if (!isAuthenticated) return;

        const scopeKey = user?.id ?? 'guest';
        // Persist the last-known local anchor so reloads are instant even if the network write fails.
        void setCachedReadingPosition(scopeKey, bookId, {
            position: {
                book_id: bookId,
                chapter_id: anchor.chapterId,
                block_id: anchor.blockId,
                block_position: anchor.blockPosition,
                sentence_index: anchor.sentenceIndex,
                total_blocks: null,
                lang: activeLang.toUpperCase(),
                updated_at: anchor.updatedAt,
            },
            updatedAt: anchor.updatedAt,
            pendingAnchor: anchor,
        });

        void saveReadingPosition(bookId, {
            chapter_id: anchor.chapterId,
            block_id: anchor.blockId,
            block_position: anchor.blockPosition,
            sentence_index: anchor.sentenceIndex,
            lang: activeLang.toUpperCase(),
            updated_at_client: anchor.updatedAt,
        }).then((response) => {
            if (response.persisted && response.updated_at) {
                // Sync anchor timestamp with server so subsequent PUTs are never stale
                const syncedAnchor = { ...anchor, updatedAt: response.updated_at };
                storeSetAnchor(bookId, syncedAnchor);
                if (lastAnchorRef.current?.blockId === anchor.blockId) {
                    lastAnchorRef.current = syncedAnchor;
                }
                void setCachedReadingPosition(scopeKey, bookId, {
                    position: {
                        book_id: bookId,
                        chapter_id: anchor.chapterId,
                        block_id: anchor.blockId,
                        block_position: anchor.blockPosition,
                        sentence_index: anchor.sentenceIndex,
                        total_blocks: response.total_blocks ?? null,
                        lang: activeLang.toUpperCase(),
                        updated_at: response.updated_at,
                    },
                    updatedAt: response.updated_at,
                });
            } else if (response.reason === 'stale_client') {
                // Server has a newer position than us. Fetch it and update store + anchor
                // so subsequent PUTs use the correct updated_at baseline.
                fetchReadingPosition(bookId).then((remote) => {
                    if (remote.block_id && remote.block_position != null && remote.updated_at) {
                        const synced: ReadingAnchor = {
                            chapterId: remote.chapter_id ?? anchor.chapterId,
                            blockId: remote.block_id,
                            blockPosition: remote.block_position,
                            sentenceIndex: remote.sentence_index ?? 0,
                            updatedAt: remote.updated_at,
                        };
                        storeSetAnchor(bookId, synced);
                        // Only reset lastAnchorRef if user hasn't moved since the stale PUT
                        if (lastAnchorRef.current?.blockId === anchor.blockId) {
                            lastAnchorRef.current = synced;
                        }
                        void setCachedReadingPosition(scopeKey, bookId, { position: remote, updatedAt: remote.updated_at });
                    }
                }).catch(() => { /* silently ignore */ });
            }
            if (response.total_blocks) {
                updateServerProgress(bookId, {
                    blockPosition: anchor.blockPosition,
                    totalBlocks: response.total_blocks,
                    serverUpdatedAt: response.updated_at ?? anchor.updatedAt,
                });
            }
        }).catch(() => {
            // Keep local state as fallback when backend write fails.
        });
    }, [bookId, storeSetAnchor, isAuthenticated, activeLang, updateServerProgress, user?.id]);

    const saveAnchor = useCallback((blockId: string, blockPosition: number, sentenceIndex = 0, fragmentId?: string) => {
        if (!currentChapter) return;
        const anchor: ReadingAnchor = {
            chapterId: currentChapter.id,
            blockId,
            fragmentId,
            blockPosition,
            sentenceIndex,
            updatedAt: new Date().toISOString(),
        };
        lastAnchorRef.current = anchor;
        const now = Date.now();
        const elapsed = now - lastSavedAnchorAt.current;

        if (elapsed >= 1000) {
            lastSavedAnchorAt.current = now;
            persistAnchor(anchor);
        } else {
            if (pendingAnchorTimer.current) clearTimeout(pendingAnchorTimer.current);
            pendingAnchorTimer.current = setTimeout(() => {
                lastSavedAnchorAt.current = Date.now();
                persistAnchor(anchor);
                pendingAnchorTimer.current = null;
            }, 1000 - elapsed);
        }
    }, [currentChapter, persistAnchor]);

    useEffect(() => {
        const flushPendingAnchor = () => {
            if (!pendingAnchorTimer.current || !lastAnchorRef.current) return;
            clearTimeout(pendingAnchorTimer.current);
            pendingAnchorTimer.current = null;
            lastSavedAnchorAt.current = Date.now();
            persistAnchor(lastAnchorRef.current);
        };

        const handleBeforeUnload = () => {
            flushPendingAnchor();
        };
        const handlePageHide = () => {
            flushPendingAnchor();
        };
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                flushPendingAnchor();
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        window.addEventListener('pagehide', handlePageHide);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            window.removeEventListener('pagehide', handlePageHide);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            // Route changes in SPA unmount ReaderView without firing beforeunload.
            // Flush pending anchor here to avoid losing the latest in-chapter position.
            flushPendingAnchor();
        };
    }, [persistAnchor]);

    // ─── Current page blocks (needed for goToChapter) ───────────────────────
    const currentPageBlockIds = useMemo(() => (
        pagesReady && pages[activePageIdx] ? new Set(pages[activePageIdx]) : new Set<string>()
    ), [pagesReady, pages, activePageIdx]);

    const currentPageBlocks = useMemo(
        () => paginatedBlocks.filter((b) => currentPageBlockIds.has(b.id)),
        [paginatedBlocks, currentPageBlockIds]
    );

    const spreadRightPageBlockIds = useMemo(() => (
        spreadModeEnabled && pagesReady && rightPageIdx >= 0 && pages[rightPageIdx]
            ? new Set(pages[rightPageIdx])
            : new Set<string>()
    ), [spreadModeEnabled, pagesReady, rightPageIdx, pages]);

    const spreadRightPageBlocks = useMemo(
        () => paginatedBlocks.filter((b) => spreadRightPageBlockIds.has(b.id)),
        [paginatedBlocks, spreadRightPageBlockIds]
    );

    const currentPageTranslatableBlocks = useMemo(
        () => currentPageBlocks.filter(isTranslatableBlock),
        [currentPageBlocks]
    );

    const currentPageHasReadyBlock = useMemo(
        () => currentPageTranslatableBlocks.some((block) => !isBlockPendingForActiveLang(block, pendingBlockIds)),
        [currentPageTranslatableBlocks, pendingBlockIds]
    );

    const isCurrentPageReadable = useMemo(() => {
        if (isSourceLang) return true;
        if (isContentLoading) return false;
        if (!pagesReady || !visiblePagesReady) return false;
        if (!currentPageBlocks.length) return false;
        if (currentPageTranslatableBlocks.length === 0) return true;
        return currentPageHasReadyBlock;
    }, [
        isSourceLang,
        isContentLoading,
        pagesReady,
        visiblePagesReady,
        currentPageBlocks,
        currentPageTranslatableBlocks,
        currentPageHasReadyBlock,
    ]);

    // Capture whether the initial content came from cache (no spinner shown).
    // Frozen the first time we have a real snapshot of the loading path.
    useEffect(() => {
        if (bookOpenHadCachedContentRef.current !== null) return;
        if (isContentLoading) {
            bookOpenHadCachedContentRef.current = false;
            return;
        }
        if (hasServerSnapshot) {
            bookOpenHadCachedContentRef.current = true;
        }
    }, [isContentLoading, hasServerSnapshot]);

    // Strict readiness: every translatable block on the current page has a
    // translation (not just "at least one"). This matches the user-perceived
    // "all visible parts are loaded" signal used for the performance metrics.
    const isCurrentPageFullyReady = useMemo(() => {
        if (isContentLoading) return false;
        if (!pagesReady || !visiblePagesReady) return false;
        if (!currentPageBlocks.length) return false;
        if (isSourceLang) return true;
        if (currentPageTranslatableBlocks.length === 0) return true;
        return currentPageTranslatableBlocks.every(
            (block) => !isBlockPendingForActiveLang(block, pendingBlockIds)
        );
    }, [
        isContentLoading,
        pagesReady,
        visiblePagesReady,
        currentPageBlocks.length,
        isSourceLang,
        currentPageTranslatableBlocks,
        pendingBlockIds,
    ]);

    // Book-open → ready. Fires once, when the first page's visible blocks are
    // all loaded in the active language. In translated mode this waits for every
    // translatable block on the page to land.
    useEffect(() => {
        if (bookOpenReadyFiredRef.current) return;
        if (!isCurrentPageFullyReady) return;
        if (!currentChapterId) return;

        bookOpenReadyFiredRef.current = true;
        const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
        trackReaderBookOpenReady({
            book_id: bookId,
            chapter_id: currentChapterId,
            language: activeLang.toUpperCase(),
            mode: isSourceLang ? 'original' : 'translation',
            duration_ms: Math.round(now - bookOpenStartRef.current),
            visible_blocks: currentPageBlocks.length,
            had_cached_content: bookOpenHadCachedContentRef.current ?? false,
        });
    }, [isCurrentPageFullyReady, currentChapterId, bookId, activeLang, isSourceLang, currentPageBlocks.length]);

    // Chapter-nav → ready. Fires when a tracked navigation (goToChapter) completes
    // — i.e. the destination page's visible blocks are fully loaded. Split by mode
    // so dashboards can compare "source text only" vs "translation visible" latency.
    useEffect(() => {
        const pending = chapterNavStartRef.current;
        if (!pending) return;
        if (!currentChapterId) return;
        if (!isCurrentPageFullyReady) return;

        chapterNavStartRef.current = null;
        const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
        trackReaderChapterNavReady({
            book_id: bookId,
            from_chapter_id: pending.fromChapterId,
            to_chapter_id: currentChapterId,
            language: activeLang.toUpperCase(),
            mode: isSourceLang ? 'original' : 'translation',
            source: pending.source,
            duration_ms: Math.round(now - pending.startedAt),
            visible_blocks: currentPageBlocks.length,
        });
    }, [isCurrentPageFullyReady, currentChapterId, bookId, activeLang, isSourceLang, currentPageBlocks.length]);

    useEffect(() => {
        currentPageIdxRef.current = activePageIdx;
    }, [activePageIdx]);

    const chapterEntryTransitionKey = currentChapterId
        ? `${currentChapterId}::${activeLang.toLowerCase()}`
        : null;
    const initializedChapterEntryTransitionKeyRef = useRef<string | null>(null);

    useEffect(() => {
        if (isSourceLang || !chapterEntryTransitionKey) {
            initializedChapterEntryTransitionKeyRef.current = null;
            setIsChapterEntryTransitionActive(false);
            return;
        }
        if (initializedChapterEntryTransitionKeyRef.current === chapterEntryTransitionKey) return;
        if (!blocksLang || blocksLang.toLowerCase() !== activeLang.toLowerCase()) return;

        const hasMissingTranslation = displayBlocks.some((block) => (
            isTranslatableBlock(block) && isBlockPendingForActiveLang(block, pendingBlockIds)
        ));

        setIsChapterEntryTransitionActive(hasMissingTranslation);
        initializedChapterEntryTransitionKeyRef.current = chapterEntryTransitionKey;
    }, [chapterEntryTransitionKey, isSourceLang, blocksLang, activeLang, displayBlocks, pendingBlockIds]);

    const isTranslationTransitionActive = isLanguageSwitching || isChapterEntryTransitionActive;

    const pageReadabilityGate = useMemo(() => {
        if (isSourceLang) return false;
        if (isContentLoading) return true;
        if (!pagesReady || !visiblePagesReady) return true;
        if (!currentPageBlocks.length) return true;
        if (currentPageTranslatableBlocks.length === 0) return false;
        return !currentPageHasReadyBlock;
    }, [
        isSourceLang,
        isContentLoading,
        pagesReady,
        visiblePagesReady,
        currentPageBlocks,
        currentPageTranslatableBlocks,
        currentPageHasReadyBlock,
    ]);

    // Glow policy:
    // - Only during an explicit language switch OR when entering/re-entering
    //   a not-yet-readable target-language chapter.
    // - And only while the current page still has zero ready translatable blocks.
    const shouldShowGlow = useMemo(() => {
        return isTranslationTransitionActive && pageReadabilityGate;
    }, [isTranslationTransitionActive, pageReadabilityGate]);
    const translationAlertKey = currentChapterId
        ? `${bookId}::${currentChapterId}::${activeLang.toLowerCase()}`
        : null;
    const [dismissedTranslationAlertKeys, setDismissedTranslationAlertKeys] = useState<string[]>([]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            const raw = window.sessionStorage.getItem('globoox:translation-alert-dismissed');
            if (!raw) return;
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                setDismissedTranslationAlertKeys(parsed.filter((value): value is string => typeof value === 'string'));
            }
        } catch {
            // ignore malformed session state
        }
    }, []);

    const shouldShowTranslationNotice = Boolean(
        shouldShowGlow
        && translationAlertKey
        && !dismissedTranslationAlertKeys.includes(translationAlertKey)
    );

    const dismissTranslationNotice = useCallback(() => {
        if (!translationAlertKey) return;
        setDismissedTranslationAlertKeys((previous) => {
            if (previous.includes(translationAlertKey)) return previous;
            const next = [...previous, translationAlertKey];
            try {
                window.sessionStorage.setItem('globoox:translation-alert-dismissed', JSON.stringify(next));
            } catch {
                // ignore storage failures
            }
            return next;
        });
    }, [translationAlertKey]);

    useEffect(() => {
        setIsTranslatingForBook(bookId, shouldShowGlow);
    }, [bookId, shouldShowGlow, setIsTranslatingForBook]);

    // Consider the transition "done" once the current page becomes readable:
    // - explicit language switch stops here
    // - chapter-entry glow restoration also stops here
    useEffect(() => {
        if (!isTranslationTransitionActive) return;
        if (!isCurrentPageReadable) return;

        if (isLanguageSwitching) {
            setIsLanguageSwitching(false);
        }
        if (isChapterEntryTransitionActive) {
            setIsChapterEntryTransitionActive(false);
        }
    }, [
        isTranslationTransitionActive,
        isCurrentPageReadable,
        isLanguageSwitching,
        isChapterEntryTransitionActive,
    ]);

    const currentPageBlocksRef = useRef<ContentBlock[]>([]);
    const pendingChapterEntryPersistRef = useRef<number | null>(null);

    // Keep ref updated with current page blocks
    useEffect(() => {
        currentPageBlocksRef.current = currentPageBlocks;
    }, [currentPageBlocks]);

    const goToChapter = useCallback((index: number, options?: {
        targetPage?: 'start' | 'end'
        navSource?: 'toc' | 'link' | 'slider' | 'next' | 'prev' | 'search' | 'restore_anchor' | 'other'
    }) => {
        if (index >= 1 && index <= chapters.length) {
            // Same chapter: just jump within the chapter. Resetting pagination state
            // would leave the reader stuck on a skeleton — setCurrentChapterIndex with
            // an unchanged value bails out, so the chapter-reset effect sees no change
            // and the pagination gate (blockStructureKey === prev) blocks recompute.
            if (index === currentChapterIndex) {
                if (pages.length === 0) return;
                const targetIdx = options?.targetPage === 'end' ? pages.length - 1 : 0;
                setCurrentPageIdx(normalizeForLayout(Math.max(0, targetIdx)));
                return;
            }

            // Save current anchor before switching chapters
            if (currentPageBlocksRef.current.length > 0) {
                const currentBlock = currentPageBlocksRef.current[0];
                const blockId = currentBlock.parentId ?? currentBlock.id;
                saveAnchor(blockId, currentBlock.position, getSentenceIndex(currentBlock), currentBlock.id);
            }

            // Mark start of chapter navigation for reader_chapter_nav_ready metric.
            // We only set this if nothing is already pending — if a nav is mid-flight
            // we keep the earliest start time (user-perceived latency).
            if (!chapterNavStartRef.current) {
                chapterNavStartRef.current = {
                    startedAt: typeof performance !== 'undefined' ? performance.now() : Date.now(),
                    fromChapterId: currentChapter?.id ?? null,
                    toChapterIndex: index,
                    source: options?.navSource ?? 'other',
                };
            } else {
                chapterNavStartRef.current.toChapterIndex = index;
            }

            pendingAnchorBlockId.current = options?.targetPage === 'end' ? LAST_PAGE_SENTINEL : null;
            pendingAnchorSentenceIndex.current = 0;

            setCurrentPageIdx(0);
            setPagesReady(false);
            // Reset visiblePagesReady and paginatedBlocks together with pages — otherwise
            // a render with pages=[] but visiblePagesReady=true (stale from previous chapter)
            // can briefly render an empty page when the destination chapter is cache-hit
            // (e.g. served by the first-open batch prefetch). The chapter-reset effect
            // resets these too, but it runs AFTER the next render commit.
            setVisiblePagesReady(false);
            setPages([]);
            setPaginatedBlocks([]);
            // Persist entry anchor for the destination chapter as soon as its page is ready.
            pendingChapterEntryPersistRef.current = index;
            setCurrentChapterIndex(index);
        }
    }, [chapters.length, saveAnchor, currentChapter, currentChapterIndex, pages.length, normalizeForLayout]);

    useEffect(() => {
        if (pendingChapterEntryPersistRef.current == null) return;
        if (!pagesReady || !visiblePagesReady) return;
        if (pendingChapterEntryPersistRef.current !== currentChapterIndex) return;
        if (!currentChapter) return;

        const anchorBlockId = pages[activePageIdx]?.[0];
        if (!anchorBlockId) return;
        const block = paginatedBlocks.find((b) => b.id === anchorBlockId);
        if (!block) return;

        const entryAnchor: ReadingAnchor = {
            chapterId: currentChapter.id,
            blockId: block.parentId ?? block.id,
            fragmentId: block.id,
            blockPosition: block.position,
            sentenceIndex: getSentenceIndex(block),
            updatedAt: new Date().toISOString(),
        };
        persistAnchor(entryAnchor);
        pendingChapterEntryPersistRef.current = null;
    }, [pagesReady, visiblePagesReady, currentChapterIndex, currentChapter, pages, activePageIdx, paginatedBlocks, persistAnchor]);

    const goToPage = useCallback((idx: number) => {
        const normalizedIdx = normalizeForLayout(idx);
        if (normalizedIdx < 0 || normalizedIdx >= pages.length) return;
        pagesReadRef.current += 1;
        setCurrentPageIdx(normalizedIdx);
        const anchorBlockId = pages[normalizedIdx][0];
        const block = paginatedBlocks.find((b) => b.id === anchorBlockId);
        if (block) saveAnchor(block.parentId ?? block.id, block.position, getSentenceIndex(block), block.id);
        // Translation enqueue is handled by the useEffect on currentPageIdx change.
        // No direct enqueue here to avoid double-enqueuing (which would cause an
        // unnecessary abort of the batch the useEffect just started).
    }, [pages, paginatedBlocks, saveAnchor, normalizeForLayout]);

    const goToNextPage = useCallback(() => {
        const step = spreadModeEnabled ? 2 : 1;
        if (activePageIdx + step <= pages.length - 1) {
            goToPage(activePageIdx + step);
            return;
        }
        if (currentChapterIndex < chapters.length) {
            goToChapter(currentChapterIndex + 1, { targetPage: 'start', navSource: 'next' });
        }
    }, [activePageIdx, spreadModeEnabled, pages.length, goToPage, currentChapterIndex, chapters.length, goToChapter]);

    const goToPrevPage = useCallback(() => {
        const step = spreadModeEnabled ? 2 : 1;
        if (activePageIdx - step >= 0) {
            goToPage(activePageIdx - step);
            return;
        }
        if (currentChapterIndex > 1) {
            goToChapter(currentChapterIndex - 1, { targetPage: 'end', navSource: 'prev' });
        }
    }, [activePageIdx, spreadModeEnabled, goToPage, currentChapterIndex, goToChapter]);

    // ─── Navigation intent API ────────────────────────────────────────────────
    // Single entry point for all navigation events. Any source other than
    // manual_scroll is a "jump": abort prefetch, set anchor, go to page.
    const navigateTo = useCallback((blockId: string, source: NavigationSource) => {
        if (source === 'manual_scroll') return; // handled organically by saveAnchor

        // 1. Abort all in-flight and queued prefetch (translation) requests
        abortAll();

        // 2. Set readingAnchor immediately so it's available to the scheduler (Task 1.2)
        if (blockId && currentChapter) {
            const block = displayBlocks.find((b) => b.id === blockId);
            if (block) {
                storeSetAnchor(bookId, {
                    chapterId: currentChapter.id,
                    blockId: block.parentId ?? block.id,
                    blockPosition: block.position,
                    sentenceIndex: getSentenceIndex(block),
                    updatedAt: new Date().toISOString(),
                });
            }
        }

        // 3. Navigate to the page containing blockId (hand-off to scheduler — Task 1.2)
        if (!blockId || !pagesReady) return;
        const pageIdx = findPageForBlock(pages, blockId, fragmentMapRef.current);
        if (pageIdx >= 0) {
            setCurrentPageIdx(normalizeForLayout(pageIdx));
            return;
        }
        // Fallback: find nearest page by block position
        const block = displayBlocks.find((b) => b.id === blockId);
        if (block) {
            const byPos = findPageByBlockPosition(pages, paginatedBlocks, block.position);
            setCurrentPageIdx(normalizeForLayout(Math.max(0, byPos)));
        }
    }, [abortAll, currentChapter, displayBlocks, bookId, storeSetAnchor, pages, pagesReady, paginatedBlocks, normalizeForLayout]);

    // TOC selects chapters (not blocks). Abort prefetch immediately, then switch chapter.
    const handleSelectChapterFromToc = useCallback((chapterIndex: number) => {
        navigateTo('', 'toc'); // abort + mark as jump; no in-chapter blockId yet
        goToChapter(chapterIndex, { navSource: 'toc' });
    }, [navigateTo, goToChapter]);

    // ─── TOC open: translate chapter titles if needed ─────────────────────────
    const handleTocOpen = useCallback(async () => {
        if (isSourceLang || !chapters.length) return;
        await ensureTocTranslations();
    }, [isSourceLang, chapters.length, ensureTocTranslations]);

    // ─── Language switch (lock anchor before, restore after) ─────────────────
    const handleLanguageChange = async (lang: Language) => {
        if (lang.toLowerCase() === activeLang.toLowerCase()) return;

        // Check translation limit for non-alpha users switching to a non-source language on their own book
        const isTargetingTranslation = !originalLanguage || lang.toUpperCase() !== originalLanguage.toUpperCase();
        if (isOwn && !isAlpha && isAuthenticated && isTargetingTranslation) {
            let allowed = translationAllowedRef.current;
            if (allowed === null) {
                try {
                    const result = await checkTranslationLimit(bookId);
                    allowed = result.allowed;
                    translationAllowedRef.current = allowed;
                    setTranslationLimitInfo({ limit: result.limit ?? null, periodEndsAt: result.periodEndsAt ?? null });
                } catch {
                    allowed = true; // fail open
                }
            }
            if (!allowed) {
                setShowTranslationLimitModal(true);
                return;
            }
        }
        trackLanguageSwitched({ book_id: bookId, from_language: activeLang, to_language: lang });
        // Lock the current anchor so we can restore it after the language reloads
        if (pages.length > 0 && currentChapter) {
            const anchorBlockId = pages[activePageIdx]?.[0];
            const block = paginatedBlocks.find((b) => b.id === anchorBlockId);
            if (block) {
                const sentenceIndex = getSentenceIndex(block);
                const anchor: ReadingAnchor = {
                    chapterId: currentChapter.id,
                    blockId: block.parentId ?? block.id,
                    blockPosition: block.position,
                    sentenceIndex,
                    updatedAt: new Date().toISOString(),
                };
                persistAnchor(anchor);
                pendingAnchorBlockId.current = block.parentId ?? block.id;
                pendingAnchorSentenceIndex.current = sentenceIndex;
            }
        }

        const previousLang = activeLang;
        
        // Reset pagination state to force skeleton while new content loads
        // (similar to goToChapter behavior)
        setPagesReady(false);
        setVisiblePagesReady(false);
        setPages([]);
        setPaginatedBlocks([]);
        
        setBookLanguage(bookId, lang);
        setPendingLang(lang);
        setIsLanguageSwitching(true);
        setIsChapterEntryTransitionActive(false);
        initializedChapterEntryTransitionKeyRef.current = currentChapter?.id
            ? `${currentChapter.id}::${lang.toLowerCase()}`
            : null;

        updateBookLanguage(bookId, lang)
            .then(() => {
                // local state was already updated optimistically
            })
            .catch(() => {
                // Only revert if the user hasn't switched to another language since
                setPendingLang((current) => {
                    if (current === lang) {
                        setBookLanguage(bookId, previousLang as Language);
                        return previousLang === resolvedServerLang ? null : previousLang;
                    }
                    return current;
                });
                setIsLanguageSwitching(false);
                pendingAnchorBlockId.current = null;
            });
    };

    const languages = availableLanguages
        .map((l) => l.toLowerCase())
        .filter((l): l is Language => ['en', 'fr', 'es', 'de', 'ru'].includes(l));

    const currentChapterFooterTitle = currentChapter
        ? getResolvedChapterTitle(currentChapter)
        : `Ch. ${currentChapterIndex}`
    ;

    // ─── Chrome visibility (header + footer toggle) ───────────────────────────
    const [chromeVisible, setChromeVisible] = useState(true);
    const [hoverZone, setHoverZone] = useState<'left' | 'right' | null>(null);
    const [hoverCursor, setHoverCursor] = useState<'pointer' | 'default' | 'auto'>('auto');

    const toggleChrome = useCallback(() => {
        setChromeVisible((v) => !v);
    }, []);

    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        const rect = pageViewportRef.current?.getBoundingClientRect();
        if (!rect) return;
        const x = e.clientX;
        const zones = getTapZones(rect, spreadModeEnabled);
        if (x <= zones.leftEdge || x >= zones.rightEdge) {
            setHoverZone(null);
            setHoverCursor('auto');
            return;
        }
        if (x > zones.iosEdge && x < zones.leftZoneEnd) {
            setHoverZone('left');
            setHoverCursor('pointer');
        } else if (x > zones.rightZoneStart) {
            setHoverZone('right');
            setHoverCursor('pointer');
        } else {
            setHoverZone(null);
            setHoverCursor('default');
        }
    }, [spreadModeEnabled]);

    const handleMouseLeave = useCallback(() => {
        setHoverZone(null);
        setHoverCursor('auto');
    }, []);

    // ─── Gesture handler ──────────────────────────────────────────────────────
    const allowInternalScroll = false;
    const gestures = usePageGestures({
        onPrev: goToPrevPage,
        onNext: goToNextPage,
        onToggleChrome: toggleChrome,
        enabled: !isTranslating && pagesReady,
        preserveScroll: allowInternalScroll,
        spreadModeEnabled,
        getViewportRect: () => pageViewportRef.current?.getBoundingClientRect() ?? null,
    });

    // ─── Keyboard navigation (ArrowLeft / ArrowRight) ───────────────────────
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (isTranslating || !pagesReady) return;
            if (e.metaKey || e.ctrlKey || e.altKey) return;

            const target = e.target;
            if (target instanceof Element) {
                const tag = target.tagName.toLowerCase();
                const isTypingField = tag === 'input' || tag === 'textarea' || tag === 'select';
                if (isTypingField || target.closest('[contenteditable="true"]')) return;
            }

            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                goToPrevPage();
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                goToNextPage();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [goToNextPage, goToPrevPage, isTranslating, pagesReady]);

    // ─── Book finished detection ──────────────────────────────────────────────
    const bookFinishedTrackedRef = useRef(false);
    useEffect(() => {
        if (!pagesReady || pages.length === 0 || chapters.length === 0) return;
        if (currentChapterIndex === chapters.length && activePageIdx >= pages.length - 1) {
            if (!bookFinishedTrackedRef.current) {
                bookFinishedTrackedRef.current = true;
                trackBookFinished({ book_id: bookId, total_chapters: chapters.length });
            }
        }
    }, [currentChapterIndex, activePageIdx, chapters.length, pages.length, pagesReady, bookId]);

    // ─── Block-level progress ─────────────────────────────────────────────────
    const blockProgressPct = useMemo(() => {
        if (!pagesReady || pages.length === 0 || paginatedBlocks.length === 0) return 0;
        const anchorId = pages[activePageIdx]?.[0];
        const anchorIdx = paginatedBlocks.findIndex((b) => b.id === anchorId);
        if (anchorIdx < 0) return 0;
        return Math.round((anchorIdx / paginatedBlocks.length) * 100);
    }, [pagesReady, pages, activePageIdx, paginatedBlocks]);
    const hasPrevPage = useMemo(() => (
        activePageIdx > 0 || currentChapterIndex > 1
    ), [activePageIdx, currentChapterIndex]);
    const hasNextPage = useMemo(() => (
        activePageIdx < pages.length - 1 || currentChapterIndex < chapters.length
    ), [activePageIdx, pages.length, currentChapterIndex, chapters.length]);
    const arrowLayout = useMemo(() => {
        const rect = pageViewportRef.current?.getBoundingClientRect();
        if (!rect) {
            return {
                centerOffsetPx: ARROW_CENTER_MIN_OFFSET_PX,
                canFit: false,
            };
        }

        let textInset: number;
        if (spreadModeEnabled) {
            const totalSpreadWidth = (SPREAD_MAX_COLUMN_PX * 2) + SPREAD_GAP_PX + (SPREAD_SIDE_PADDING_PX * 2);
            textInset = Math.max((rect.width - totalSpreadWidth) / 2, 0) + SPREAD_SIDE_PADDING_PX;
        } else {
            const contentWidth = Math.min(rect.width, CONTENT_MAX_WIDTH_PX);
            textInset = Math.max((rect.width - contentWidth) / 2, 0) + PAGE_TEXT_SIDE_PADDING_PX;
        }

        const centerOffsetPx = Math.max(
            ARROW_CENTER_MIN_OFFSET_PX,
            (textInset / 2) - ARROW_OPTICAL_COMPENSATION_PX,
        );

        return {
            centerOffsetPx,
            canFit: centerOffsetPx + (ARROW_SVG_WIDTH_PX / 2) + ARROW_REQUIRED_GAP_PX <= textInset,
        };
    }, [spreadModeEnabled, pageWidth]);

    const isLoading = chaptersLoading || isContentLoading;
    const renderPageBlocks = useCallback((pageBlocks: ContentBlock[]) => {
        let firstPendingFound = false;
        let firstRenderableFound = false;
        const renderableBlocks = pageBlocks.filter((block) => {
            if (block.type !== 'image') return true;
            const src = block.src;
            const isAbsolute = src?.startsWith('http://') || src?.startsWith('https://') || src?.startsWith('data:') || src?.startsWith('/');
            const isCoverImage = block.id === firstImageBlockId;
            return isAbsolute || (isCoverImage && !!coverUrl);
        });
        const isSingleH1Page = renderableBlocks.length === 1 && renderableBlocks[0]?.type === 'heading' && renderableBlocks[0]?.level === 1;
        return pageBlocks.map((block) => {
            const blockId = block.parentId ?? block.id;
            const isCoverImage = block.id === firstImageBlockId;
            // Skip image blocks that cannot be rendered to avoid empty divs in the DOM
            if (block.type === 'image') {
                const src = block.src;
                const isAbsolute = src?.startsWith('http://') || src?.startsWith('https://') || src?.startsWith('data:') || src?.startsWith('/');
                if (!isAbsolute && !(isCoverImage && coverUrl)) return null;
            }
            const isFirstRenderable = !firstRenderableFound;
            if (!firstRenderableFound) firstRenderableFound = true;
            const isPending = isBlockPendingForActiveLang(block, pendingBlockIds);
            const showTranslatingLabel = isPending && !firstPendingFound;
            const pendingLabel = isSourceLang ? 'Loading...' : 'Translating...';
            if (isPending && !firstPendingFound) firstPendingFound = true;
            return (
                <div
                    key={block.id}
                    className={`flow-root${isFirstRenderable ? ' page-first-block' : ''}${isSingleH1Page ? ' page-single-h1' : ''}`}
                    data-block-type={block.type}
                    ref={getRefCallback(blockId, block.type)}
                >
                    <ContentBlockRenderer
                        block={block}
                        fontSize={settings.fontSize}
                        isPending={isPending}
                        showTranslatingLabel={showTranslatingLabel}
                        pendingLabel={pendingLabel}
                        coverUrl={coverUrl}
                        isCoverImage={isCoverImage}
                        imageMaxHeight={pageHeight}
                        lineHeightScale={settings.lineHeightScale}
                    />
                </div>
            );
        });
    }, [coverUrl, firstImageBlockId, getRefCallback, isSourceLang, pageHeight, pendingBlockIds, settings.fontSize, settings.lineHeightScale]);

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <ReaderThemeProvider>
            <div style={{ ...getThemeStyle(readerThemeConfig.id), position: 'fixed', inset: 0, overflow: 'hidden', overscrollBehavior: 'none', backgroundColor: readerSemanticTokens.background, color: readerSemanticTokens.text } as React.CSSProperties}>
                {IS_DEV && SHOW_READER_DEBUG_OVERLAY && debugSnapshot && (
                <div
                    style={{
                        position: 'fixed',
                        right: 8,
                        top: 8,
                        zIndex: 9999,
                        background: 'rgba(0,0,0,0.78)',
                        color: '#fff',
                        fontSize: 11,
                        lineHeight: 1.35,
                        padding: '8px 10px',
                        borderRadius: 8,
                        pointerEvents: 'none',
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                    }}
                >
                    <div>{`STATUS=${debugSnapshot.status}`}</div>
                    <div>{`CAUSE=${debugSnapshot.cause}`}</div>
                    <div>{`w=${debugSnapshot.targetWidth} page=${debugSnapshot.pageWidth} spread=${debugSnapshot.spread ? '1' : '0'}`}</div>
                    <div>{`raw=${debugSnapshot.rawWidth} resolved=${debugSnapshot.resolvedWidth} shellRef=${debugSnapshot.hasShellRef ? '1' : '0'}`}</div>
                    <div>{`loading=${debugSnapshot.isLoading ? '1' : '0'} ready=${debugSnapshot.pagesReady ? '1' : '0'} visible=${debugSnapshot.visiblePagesReady ? '1' : '0'}`}</div>
                    <div>{`gateBlocked=${debugSnapshot.computeGateBlocked ? '1' : '0'}`}</div>
                    <div>{`wf=${debugSnapshot.widthFlips} wr=${debugSnapshot.widthRange}px mf=${debugSnapshot.modeFlips} p2s=${debugSnapshot.paginateRuns2s}`}</div>
                    {headingTraceLines.map((line, idx) => (
                        <div key={`${idx}-${line}`}>{`H>${line}`}</div>
                    ))}
                </div>
            )}
            <AppleIntelligenceGlow bookId={bookId} />
            <IOSAlertDialog
                open={shouldShowTranslationNotice}
                onOpenChange={(nextOpen) => {
                    if (!nextOpen) dismissTranslationNotice();
                }}
                title="Translation takes a moment"
                description="The first pages may take about 30 seconds. After that, the rest will keep translating as you read."
                confirmLabel="OK"
                onConfirm={dismissTranslationNotice}
                icon={null}
            />
            {user && (
                <TranslationLimitDialog
                    open={showTranslationLimitModal}
                    onOpenChange={setShowTranslationLimitModal}
                    userEmail={user.email ?? ''}
                    limit={translationLimitInfo.limit}
                    periodEndsAt={translationLimitInfo.periodEndsAt}
                />
            )}

            {/* ── Header (fixed, slides out upward) ── */}
            <header
                className="mobile-ui-no-select fixed left-0 right-0 z-40 backdrop-blur-xl border-b transition-transform duration-300 ease-in-out"
                style={{
                    top: 0,
                    paddingTop: 'env(safe-area-inset-top)',
                    transform: chromeVisible ? 'translateY(0)' : 'translateY(-100%)',
                    backgroundColor: readerSemanticTokens.chromeBackground,
                    borderColor: readerSemanticTokens.border,
                    color: readerSemanticTokens.text,
                }}
            >
                <div className="flex min-h-11 items-center px-1 py-1">
                    <div className="flex h-full items-center justify-start shrink-0">
                        <Link
                            href="/my-books"
                            onClick={() => {
                                try {
                                    sessionStorage.setItem(
                                        'globoox:last_read_book',
                                        JSON.stringify({ bookId, at: Date.now() })
                                    );
                                } catch { /* ignore */ }
                            }}
                            className={`${uiIconTriggerButton} ${uiHeaderControlHitArea} flex-shrink-0`}
                        >
                            <IOSIcon icon={ChevronLeft} strokeWidth={2} style={{ color: readerSemanticTokens.accent }} />
                        </Link>
                    </div>

                    <div className="min-w-0 flex-1 px-2">
                        <div className="flex max-w-full flex-col justify-center text-left">
                            <h1 className={`max-w-full text-sm font-semibold truncate ${isBookMetaPending ? 'blur-[3px] opacity-40' : ''}`}>
                                {readerBookTitle}
                            </h1>
                            {readerBookAuthor && (
                                <p className={`max-w-full text-[11px] leading-3 truncate ${isBookMetaPending ? 'blur-[3px] opacity-40' : ''}`} style={{ color: readerSemanticTokens.mutedText }}>
                                    {readerBookAuthor}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex h-full items-center justify-end shrink-0">
                        <LanguageSwitch
                            availableLanguages={languages}
                            currentLanguage={activeLang}
                            onLanguageChange={handleLanguageChange}
                            disabled={isTranslating}
                        />
                        <ReaderActionsMenu
                            book={{
                                id: bookId,
                                title: readerBookTitle,
                                author: readerBookAuthor,
                                isTocContentPending,
                                coverUrl,
                                languages,
                                chapters: chapters.map((c) => ({
                                    number: c.index,
                                    title: getResolvedChapterTitle(c),
                                    depth: c.depth,
                                })),
                            }}
                            currentChapter={currentChapterIndex}
                            onSelectChapter={handleSelectChapterFromToc}
                            disabled={false}
                            onTocOpen={handleTocOpen}
                        />
                    </div>
                </div>
            </header>

            {/* ── Content area: fixed, full screen, constant height ── */}
            <div
                ref={contentAreaRef}
                style={{
                    position: 'fixed',
                    inset: 0,
                    overflow: 'hidden',
                    touchAction: allowInternalScroll ? 'pan-y' : 'none',
                    overscrollBehavior: 'none',
                    WebkitOverflowScrolling: 'auto',
                    cursor: hoverCursor,
                } as React.CSSProperties}
                {...gestures}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
            >
                <div
                    ref={pageViewportRef}
                    style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        top: 'calc(env(safe-area-inset-top) + 44px + 8px)',
                        bottom: 'calc(env(safe-area-inset-bottom) + 40px)',
                        overflowY: allowInternalScroll ? 'auto' : 'visible',
                        overflowX: allowInternalScroll ? 'hidden' : 'visible',
                        WebkitOverflowScrolling: 'touch',
                    }}
                >
                    {/* Hidden measurement container — same content width, off-screen */}
                    <div
                        ref={measureContainerRef}
                        className="container max-w-2xl mx-auto px-4"
                        style={{
                            position: 'fixed',
                            top: '-9999px',
                            left: 0,
                            right: 0,
                            visibility: 'hidden',
                            pointerEvents: 'none',
                            zIndex: -1,
                        }}
                        aria-hidden="true"
                    >
                        {normalizedBlocks.map((block) => (
                            <div
                                key={block.id}
                                className="flow-root"
                                data-block-type={block.type}
                                data-measure-block-id={block.id}
                                ref={(el) => {
                                    if (el) blockMeasureRefs.current.set(block.id, el);
                                    else blockMeasureRefs.current.delete(block.id);
                                }}
                            >
                                <ContentBlockRenderer
                                    block={block}
                                    fontSize={settings.fontSize}
                                    coverUrl={coverUrl}
                                    isCoverImage={block.id === firstImageBlockId}
                                    imageMaxHeight={pageHeight}
                                    lineHeightScale={settings.lineHeightScale}
                                />
                            </div>
                        ))}
                    </div>
                    {/* Width probe — always mounted to avoid cold-start deadlocks */}
                    <div
                        aria-hidden="true"
                        style={{
                            position: 'fixed',
                            top: '-9999px',
                            left: 0,
                            right: 0,
                            visibility: 'hidden',
                            pointerEvents: 'none',
                            zIndex: -1,
                        }}
                    >
                        {spreadModeEnabled ? (
                            <div
                                className="mx-auto flex w-full items-stretch justify-center"
                                style={{
                                    columnGap: `${SPREAD_GAP_PX}px`,
                                    paddingInline: `${SPREAD_SIDE_PADDING_PX}px`,
                                }}
                            >
                                <div className="w-full shrink-0 overflow-hidden" style={{ maxWidth: `${SPREAD_MAX_COLUMN_PX}px` }}>
                                    <div ref={widthProbeShellRef} className={SPREAD_PAGE_SHELL_CLASS} />
                                </div>
                                <div className="w-full shrink-0 overflow-hidden" style={{ maxWidth: `${SPREAD_MAX_COLUMN_PX}px` }}>
                                    <div className={SPREAD_PAGE_SHELL_CLASS} />
                                </div>
                            </div>
                        ) : (
                            <div ref={widthProbeShellRef} className={PAGE_SHELL_CLASS} />
                        )}
                    </div>

                    {/* Visible page */}
                    <TranslationGlow>
                        <div className="h-full select-none" lang={activeLang}>
                            {isLoading || !visiblePagesReady ? (
                                <div className={PAGE_SHELL_CLASS}>
                                    <Skeleton className="h-7 w-64 mb-5" style={{ backgroundColor: readerContentTokens.skeletonFill }} />
                                    <div className="space-y-5">
                                        {[100, 95, 88, 100, 72, 100, 90, 85, 100, 60, 100, 92].map((width, i) => (
                                            <Skeleton key={i} className="h-5" style={{ width: `${width}%`, backgroundColor: readerContentTokens.skeletonFill }} />
                                        ))}
                                    </div>
                                </div>
                            ) : chaptersError ? (
                                <p className="py-8 text-center text-sm" style={{ color: readerSemanticTokens.danger }}>{chaptersError}</p>
                            ) : contentError ? (
                                <p className="py-8 text-center text-sm" style={{ color: readerSemanticTokens.danger }}>{contentError}</p>
                            ) : spreadModeEnabled ? (
                                <div
                                    className="mx-auto flex h-full w-full items-stretch justify-center"
                                    style={{
                                        columnGap: `${SPREAD_GAP_PX}px`,
                                        paddingInline: `${SPREAD_SIDE_PADDING_PX}px`,
                                    }}
                                >
                                    <div className="h-full w-full shrink-0 overflow-hidden" style={{ maxWidth: `${SPREAD_MAX_COLUMN_PX}px` }}>
                                        <div className={SPREAD_PAGE_SHELL_CLASS}>
                                            {renderPageBlocks(currentPageBlocks)}
                                        </div>
                                    </div>
                                    <div className="h-full w-full shrink-0 overflow-hidden" style={{ maxWidth: `${SPREAD_MAX_COLUMN_PX}px` }}>
                                        <div className={SPREAD_PAGE_SHELL_CLASS}>
                                            {spreadRightPageBlocks.length > 0 ? renderPageBlocks(spreadRightPageBlocks) : null}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className={PAGE_SHELL_CLASS}>
                                    {renderPageBlocks(currentPageBlocks)}
                                </div>
                            )}
                        </div>
                    </TranslationGlow>
                </div>
            </div>

            <div
                aria-hidden="true"
                className="pointer-events-none fixed inset-y-0 left-0 right-0 z-30"
            >
                <div
                    className="absolute top-1/2 transition-all duration-300 ease-in-out"
                    style={{
                        left: `${arrowLayout.centerOffsetPx}px`,
                        transform: chromeVisible
                            ? 'translate3d(-50%, -50%, 0)'
                            : 'translate3d(calc(-150% - 24px), -50%, 0)',
                        opacity: chromeVisible && hasPrevPage && arrowLayout.canFit ? (hoverZone === 'left' ? 0.66 : 0.44) : 0,
                    }}
                >
                    <svg width="42" height="61" viewBox="0 0 42 61" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M22.8 8.5L11.6 30.5L22.8 52.5" stroke={hoverZone === 'left' ? readerSemanticTokens.text : readerSemanticTokens.mutedText} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>

                <div
                    className="absolute top-1/2 transition-all duration-300 ease-in-out"
                    style={{
                        left: `calc(100% - ${arrowLayout.centerOffsetPx}px)`,
                        transform: chromeVisible
                            ? 'translate3d(-50%, -50%, 0)'
                            : 'translate3d(calc(50% + 24px), -50%, 0)',
                        opacity: chromeVisible && hasNextPage && arrowLayout.canFit ? (hoverZone === 'right' ? 0.66 : 0.44) : 0,
                    }}
                >
                    <svg width="42" height="61" viewBox="0 0 42 61" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M19.2 8.5L30.4 30.5L19.2 52.5" stroke={hoverZone === 'right' ? readerSemanticTokens.text : readerSemanticTokens.mutedText} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>
            </div>

            {/* ── Footer / progress bar (fixed, slides out downward) ── */}
            <div
                className="mobile-ui-no-select fixed left-0 right-0 z-40 flex items-center justify-center md:justify-between px-4 h-10 border-t text-xs backdrop-blur-xl transition-transform duration-300 ease-in-out"
                style={{
                    bottom: 0,
                    paddingBottom: 'env(safe-area-inset-bottom)',
                    transform: chromeVisible ? 'translateY(0)' : 'translateY(100%)',
                    borderColor: readerSemanticTokens.border,
                    backgroundColor: readerSemanticTokens.chromeBackground,
                    color: readerSemanticTokens.mutedText,
                }}
            >
                <div className="hidden md:block" />

                <div className="min-w-0 max-w-[70vw] md:max-w-[50vw] flex items-center gap-2 text-center">
                    <span className="min-w-0 truncate text-center">
                        {currentChapterFooterTitle}
                    </span>
                    {pagesReady && displayBlocks.length > 0 && (
                        <span className="shrink-0 tabular-nums">
                            {blockProgressPct}%
                        </span>
                    )}
                </div>

                <div className="hidden md:block" />
            </div>
        </div>
        </ReaderThemeProvider>
    );
}
