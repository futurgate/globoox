type StickyInterval = { start: number; end: number };

/** Remove only the sticky runway, keeping the panel at the same viewport position. */
export function compactStickyScrollPosition(scrollY: number, { start, end }: StickyInterval): number {
  return scrollY - Math.max(0, Math.min(end - start, scrollY - start));
}

/**
 * Restore the runway while preserving the compact panel's viewport position.
 * Exactly at the pin line, its previously frozen progress resolves the ambiguity.
 */
export function expandedStickyScrollPosition(
  compactScrollY: number,
  { start, end }: StickyInterval,
  frozenProgress = 0,
): number {
  if (compactScrollY < start - 0.5) return compactScrollY;
  if (compactScrollY > start + 0.5) return compactScrollY + end - start;
  return start + (end - start) * Math.max(0, Math.min(1, frozenProgress));
}
