'use client';

import { useEffect, useState, type RefObject } from 'react';
import { SECTION_NAVIGATION_END, SECTION_NAVIGATION_START } from './useSectionNavigation';

export const EDITORIAL_SECTION_HREFS = [
  '#hero', '#how-it-works', '#quality', '#languages', '#team', '#pricing', '#start',
] as const;

type SectionHref = typeof EDITORIAL_SECTION_HREFS[number];
type SectionPosition = { href: SectionHref; top: number; activationTop: number };

/** Keep the current chapter until the next one reaches its unobscured anchor line. */
export function resolveActiveSection(
  sections: readonly SectionPosition[],
  atDocumentEnd = false,
  navigationDestination: SectionHref | null = null,
): SectionHref {
  if (navigationDestination && sections.some(({ href }) => href === navigationDestination)) {
    return navigationDestination;
  }
  if (atDocumentEnd && sections.length) return sections[sections.length - 1].href;

  let active = sections[0]?.href ?? '#hero';
  for (const section of sections) {
    // Accommodate subpixel scroll rounding at a programmatic anchor destination.
    if (section.top > section.activationTop + 1) break;
    active = section.href;
  }
  return active;
}

/** Tracks the isolated landing without changing scroll position or walkthrough state. */
export function useActiveSection(pageRef: RefObject<HTMLElement | null>): SectionHref {
  const [activeHref, setActiveHref] = useState<SectionHref>('#hero');

  useEffect(() => {
    const page = pageRef.current;
    if (!page) return;
    const header = page.querySelector<HTMLElement>('header');
    const sections = EDITORIAL_SECTION_HREFS.flatMap((href) => {
      const element = page.querySelector<HTMLElement>(href);
      return element ? [{ href, element }] : [];
    });
    let frame = 0;
    let disposed = false;
    let destination: SectionHref | null = null;
    let positions: SectionPosition[] = sections.map(({ href }) => ({ href, top: Infinity, activationTop: 0 }));
    let atDocumentEnd = false;

    const update = () => {
      frame = 0;
      if (disposed) return;
      // The transit temporarily shortens How it Works. Its intermediate geometry
      // must never select the sections that happen to pass through the viewport.
      if (!page.hasAttribute('data-section-navigation')) {
        const headerBottom = Math.max(0, header?.getBoundingClientRect().bottom ?? 0);
        const scrollPadding = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
        positions = sections.map(({ href, element }) => ({
          href,
          top: element.getBoundingClientRect().top,
          activationTop: Math.max(
            headerBottom + 24,
            (parseFloat(getComputedStyle(element).scrollMarginTop) || 0) + scrollPadding,
          ),
        }));
        const maximum = document.documentElement.scrollHeight - window.innerHeight;
        atDocumentEnd = maximum > 0 && window.scrollY >= maximum - 2;
      }
      setActiveHref(resolveActiveSection(positions, atDocumentEnd, destination));
    };
    const schedule = () => {
      if (!disposed && !frame) frame = window.requestAnimationFrame(update);
    };
    const startNavigation = (event: Event) => {
      const href = (event as CustomEvent<string>).detail;
      destination = sections.find((section) => section.href === href)?.href ?? null;
      window.cancelAnimationFrame(frame);
      frame = 0;
      update();
    };
    const endNavigation = () => {
      destination = null;
      window.cancelAnimationFrame(frame);
      // END is dispatched after geometry/scroll restoration, including cancellation.
      // Synchronous measurement participates in the navigator's pre-paint flush.
      update();
    };
    const observer = new ResizeObserver(schedule);
    observer.observe(page);
    if (header) observer.observe(header);
    sections.forEach(({ element }) => observer.observe(element));
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    window.addEventListener('pageshow', schedule);
    window.addEventListener('popstate', schedule);
    window.addEventListener('hashchange', schedule);
    window.addEventListener(SECTION_NAVIGATION_START, startNavigation);
    window.addEventListener(SECTION_NAVIGATION_END, endNavigation);
    void document.fonts.ready.then(schedule);
    schedule();

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('pageshow', schedule);
      window.removeEventListener('popstate', schedule);
      window.removeEventListener('hashchange', schedule);
      window.removeEventListener(SECTION_NAVIGATION_START, startNavigation);
      window.removeEventListener(SECTION_NAVIGATION_END, endNavigation);
    };
  }, [pageRef]);

  return activeHref;
}
