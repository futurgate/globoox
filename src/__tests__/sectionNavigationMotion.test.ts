import { describe, expect, it } from 'vitest';
import { compactStickyScrollPosition, expandedStickyScrollPosition } from '@/components/landing-editorial/sectionNavigationMotion';

const interval = { start: 1000, end: 3200 };
const inset = 120;
const sectionTop = interval.start + inset;

function expandedPanelTop(scrollY: number) {
  return Math.min(sectionTop - Math.min(scrollY, interval.start), sectionTop + interval.end - interval.start - scrollY);
}

describe('temporary static walkthrough geometry', () => {
  it('removes no distance above, the elapsed runway inside, and the whole runway below', () => {
    expect(compactStickyScrollPosition(500, interval)).toBe(500);
    expect(compactStickyScrollPosition(1000, interval)).toBe(1000);
    expect(compactStickyScrollPosition(2100, interval)).toBe(1000);
    expect(compactStickyScrollPosition(3200, interval)).toBe(1000);
    expect(compactStickyScrollPosition(4000, interval)).toBe(1800);
  });

  it('preserves the visible panel position when collapsing from above, inside, or below', () => {
    for (let scrollY = 0; scrollY <= 5000; scrollY += 25) {
      const compactY = compactStickyScrollPosition(scrollY, interval);
      expect(sectionTop - compactY).toBe(expandedPanelTop(scrollY));
    }
  });

  it('preserves the visible panel position when restoring anywhere along either direction', () => {
    for (let compactY = 0; compactY <= 2800; compactY += 25) {
      const restored = expandedStickyScrollPosition(compactY, interval, 0.4);
      expect(expandedPanelTop(restored)).toBe(sectionTop - compactY);
    }
  });

  it('restores the same scroll position after an immediate cancellation, including a middle step', () => {
    for (const scrollY of [0, 500, 1000, 1600, 2100, 2800, 3200, 4700]) {
      const progress = (scrollY - interval.start) / (interval.end - interval.start);
      const compact = compactStickyScrollPosition(scrollY, interval);
      expect(expandedStickyScrollPosition(compact, interval, progress)).toBe(scrollY);
    }
  });

  it('restores a How it Works menu destination to the start, even when approached from below', () => {
    expect(expandedStickyScrollPosition(interval.start, interval, 0)).toBe(interval.start);
  });

  it('uses fresh geometry after viewport changes and ignores subpixel noise at the pin line', () => {
    const resized = { start: 1400, end: 2940 };
    expect(expandedStickyScrollPosition(1800, resized)).toBe(3340);
    expect(expandedStickyScrollPosition(1399.75, resized, 0.5)).toBe(2170);
    expect(expandedStickyScrollPosition(1400.25, resized, 0.5)).toBe(2170);
  });
});
