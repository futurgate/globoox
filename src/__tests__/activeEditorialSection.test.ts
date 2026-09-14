import { describe, expect, it } from 'vitest';
import { EDITORIAL_SECTION_HREFS, resolveActiveSection } from '@/components/landing-editorial/useActiveSection';

// The walkthrough is deliberately much taller than an ordinary content section.
const documentTops = [96, 1200, 4600, 5500, 6400, 7350, 8250];
function geometry(scrollY: number, activationTop = 120, tops = documentTops) {
  return EDITORIAL_SECTION_HREFS.map((href, index) => ({
    href,
    top: tops[index] - scrollY,
    activationTop,
  }));
}

describe('editorial active-section tracking', () => {
  it('identifies the hero without falsely activating the first menu item', () => {
    expect(resolveActiveSection(geometry(0))).toBe('#hero');
    expect(resolveActiveSection(geometry(700))).toBe('#hero');
  });

  it('keeps How it Works active throughout its long sticky runway', () => {
    for (const scrollY of [1080, 1400, 2200, 3300, 4478]) {
      expect(resolveActiveSection(geometry(scrollY))).toBe('#how-it-works');
    }
    expect(resolveActiveSection(geometry(4480))).toBe('#quality');
  });

  it('follows all sections in both directions, including Pricing and the closing CTA', () => {
    for (const index of [0, 1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1, 0]) {
      const scrollY = Math.max(0, documentTops[index] - 120);
      expect(resolveActiveSection(geometry(scrollY))).toBe(EDITORIAL_SECTION_HREFS[index]);
    }
  });

  it('uses the responsive anchor clearance instead of the viewport top', () => {
    const scrollY = documentTops[3] - 108;
    expect(resolveActiveSection(geometry(scrollY, 108))).toBe('#languages');
    expect(resolveActiveSection(geometry(scrollY - 3, 108))).toBe('#quality');
  });

  it('accounts for additive root scroll padding and per-section scroll margin', () => {
    const positions = geometry(documentTops[4] - 160);
    positions[4].activationTop = 160;
    expect(resolveActiveSection(positions)).toBe('#team');
  });

  it('accepts subpixel rounding at an anchor without switching several pixels early', () => {
    expect(resolveActiveSection(geometry(documentTops[5] - 120.5))).toBe('#pricing');
    expect(resolveActiveSection(geometry(documentTops[5] - 122))).toBe('#team');
  });

  it('selects a short final section when document end prevents it reaching the header', () => {
    const positions = geometry(7800);
    expect(resolveActiveSection(positions)).toBe('#pricing');
    expect(resolveActiveSection(positions, true)).toBe('#start');
  });

  it('holds the requested destination through changing compact geometry in either direction', () => {
    const compactTops = [96, 1200, 2200, 3100, 4000, 4950, 5850];
    for (const destination of ['#hero', '#how-it-works', '#pricing', '#start'] as const) {
      for (const scrollY of [0, 700, 2000, 4200, 5700, 4200, 700]) {
        expect(resolveActiveSection(geometry(scrollY, 120, compactTops), false, destination)).toBe(destination);
      }
    }
  });

  it('returns to actual restored location after either arrival or interrupted travel', () => {
    expect(resolveActiveSection(geometry(2200), false, '#pricing')).toBe('#pricing');
    expect(resolveActiveSection(geometry(2200), false, null)).toBe('#how-it-works');
    expect(resolveActiveSection(geometry(documentTops[5] - 120), false, null)).toBe('#pricing');
  });

  it('does not select a missing destination and tolerates an empty landing during cleanup', () => {
    const withoutPricing = geometry(7400).filter(({ href }) => href !== '#pricing');
    expect(resolveActiveSection(withoutPricing, false, '#pricing')).toBe('#team');
    expect(resolveActiveSection([])).toBe('#hero');
  });
});
