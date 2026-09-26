'use client'

import { useEffect, useRef } from 'react'
import { fetchSyncStatus } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import { positionCacheInvalidateAll } from '@/lib/api'
import { invalidateAllChapterContentCache } from '@/lib/contentCache'

/**
 * useSyncCheck
 *
 * Lightweight cross-device sync detection.
 * On mount and every time the user returns to the tab, it calls GET /api/sync/status
 * (a single tiny request) and compares the returned timestamps to the locally stored
 * ones. If any scope is newer, the corresponding in-memory cache is invalidated so
 * the next render automatically fetches fresh data — with no loading spinners.
 *
 * Usage: mount once near the root of authenticated pages (e.g. LibraryPage or a layout).
 */
export function useSyncCheck() {
    const { syncVersions, setSyncVersions, hasHydrated } = useAppStore()
    const checking = useRef(false)
    const lastCheckedAtRef = useRef<number>(0)

    // Avoid hammering the backend on frequent tab switches / rapid remounts.
    const MIN_INTERVAL_MS = 30_000

    const check = async () => {
        // Avoid invalidating caches based on default (non-rehydrated) timestamps.
        if (!hasHydrated) return

        if (checking.current) return
        const now = Date.now()
        if (now - lastCheckedAtRef.current < MIN_INTERVAL_MS) return
        lastCheckedAtRef.current = now

        checking.current = true
        try {
            const status = await fetchSyncStatus()

            // Guest / unauthenticated — server returns all nulls, nothing to do
            if (!status.account_version) return

            const scopes = status.scopes

            // --- library scope ---
            if (isNewer(scopes.library, syncVersions.library)) {
                // V2 confirms its manifest on every entry/visibility change.
                // Preserve the scoped offline/legacy lists needed for migration.
                void invalidateAllChapterContentCache()
            }

            // --- progress scope ---
            // Reading positions have their own positionCache in api.ts.
            // Invalidate it so the next fetchReadingPosition call goes to the network.
            if (isNewer(scopes.progress, syncVersions.progress)) {
                console.log('[useSyncCheck] progress changed, invalidating position cache')
                positionCacheInvalidateAll()
                // Persisted rows may contain an unsent pendingAnchor. A fresh
                // Reader GET reconciles server state without deleting offline work.
            }

            // Persist the new timestamps so we don't re-invalidate on the next check
            setSyncVersions({
                library: scopes.library ?? syncVersions.library,
                progress: scopes.progress ?? syncVersions.progress,
                settings: scopes.settings ?? syncVersions.settings,
            })
        } catch (e) {
            // Sync check is best-effort — silently swallow network errors
            console.warn('[useSyncCheck] failed:', e)
        } finally {
            checking.current = false
        }
    }

    // Run on mount
    useEffect(() => {
        void check()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Run every time the user comes back to the tab
    useEffect(() => {
        const handleVisibility = () => {
            if (document.visibilityState === 'visible') void check()
        }
        document.addEventListener('visibilitychange', handleVisibility)
        return () => document.removeEventListener('visibilitychange', handleVisibility)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [syncVersions])
}

/** Returns true if serverTs is strictly newer than localTs */
function isNewer(serverTs: string | null, localTs: string | null): boolean {
    if (!serverTs) return false
    if (!localTs) return true
    return new Date(serverTs) > new Date(localTs)
}
