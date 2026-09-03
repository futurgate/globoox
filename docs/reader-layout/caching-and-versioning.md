# Caching and Versioning

## Layout caches
- In-memory pagination cache (module-level map).
- IndexedDB chapter layout cache (`chapter_layout`).

## Cache key
Pagination cache key includes:
- chapter identity,
- layout/content signature,
- resolved width and page height,
- typography settings,
- pagination algorithm version.

## Algorithm versioning
`PAGINATION_ALGO_VERSION` is used to invalidate stale layouts when rules change.

On version change:
- in-memory pagination cache is cleared,
- IndexedDB chapter layouts are cleared,
- new version is saved in localStorage (`reader.pagination_algo_version`).

This runs once per version and avoids stale page splits after pagination logic updates.
