'use client';

import { useEffect, useRef, type MouseEvent } from 'react';
import { flushSync } from 'react-dom';
import { compactStickyScrollPosition, expandedStickyScrollPosition } from './sectionNavigationMotion';

export const SECTION_NAVIGATION_END = 'editorial:section-navigation-end';
export const SECTION_NAVIGATION_START = 'editorial:section-navigation-start';

/** Menu travel temporarily treats the walkthrough as one ordinary static section. */
export function useSectionNavigation(onNavigate: () => void) {
  const pageRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<((unmount?: boolean) => void) | null>(null);

  useEffect(() => () => cancelRef.current?.(true), []);

  function navigateSection(event: MouseEvent<HTMLAnchorElement>, href: string) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const target = document.getElementById(href.slice(1));
    const page = pageRef.current;
    if (!target || !page) return;
    event.preventDefault();
    cancelRef.current?.();
    onNavigate();
    const keyboard = event.detail === 0;
    if (!keyboard) event.currentTarget.blur();
    // Stop any previous native step scroll before taking over menu navigation.
    window.scrollTo({ top: window.scrollY, behavior: 'instant' });
    page.dataset.sectionNavigation = 'true';
    window.dispatchEvent(new CustomEvent(SECTION_NAVIGATION_START, { detail: href }));
    if (window.location.hash !== href) window.history.pushState(null, '', href);

    let frame = 0;
    let finished = false;
    let compact: { section: HTMLElement; pin: HTMLElement; frozenProgress: number } | null = null;
    let restoreAnchoring: (() => void) | null = null;

    const restoreWalkthrough = () => {
      if (!compact) return;
      const { section, pin, frozenProgress } = compact;
      compact = null;
      // Snapshot before the height change: the browser can clamp scrollY as layout shrinks.
      const panelTop = pin.getBoundingClientRect().top;
      delete section.dataset.navigationCompact;
      if (!section.isConnected || getComputedStyle(pin).position !== 'sticky') return;
      const sectionTop = window.scrollY + section.getBoundingClientRect().top;
      const inset = parseFloat(getComputedStyle(pin).top) || 0;
      const start = sectionTop - inset;
      const end = start + Math.max(0, section.getBoundingClientRect().height - pin.getBoundingClientRect().height);
      const compactY = sectionTop - panelTop;
      window.scrollTo({ top: expandedStickyScrollPosition(compactY, { start, end }, frozenProgress), behavior: 'instant' });
    };

    const finish = (arrived: boolean, unmount = false) => {
      if (finished) return;
      finished = true;
      cancelAnimationFrame(frame);
      window.removeEventListener('wheel', interrupt);
      window.removeEventListener('touchstart', interrupt);
      window.removeEventListener('pointerdown', interrupt);
      window.removeEventListener('keydown', interruptKey);
      window.removeEventListener('resize', interrupt);
      window.removeEventListener('popstate', interrupt);
      window.removeEventListener('hashchange', interrupt);
      document.removeEventListener('visibilitychange', visibilityChanged);
      if (unmount) {
        if (compact) delete compact.section.dataset.navigationCompact;
      } else {
        restoreWalkthrough();
      }
      restoreAnchoring?.();
      delete page.dataset.sectionNavigation;
      cancelRef.current = null;
      if (!unmount && page.isConnected) {
        // Restore layout, scroll and the corresponding Stack state before the next paint.
        flushSync(() => window.dispatchEvent(new Event(SECTION_NAVIGATION_END)));
      }
      if (arrived && keyboard) {
        if (!target.hasAttribute('tabindex')) {
          target.setAttribute('tabindex', '-1');
          target.addEventListener('blur', () => target.removeAttribute('tabindex'), { once: true });
        }
        target.focus({ preventScroll: true });
      }
    };
    const interrupt = () => {
      window.scrollTo({ top: window.scrollY, behavior: 'instant' });
      finish(false);
    };
    const interruptKey = (keyEvent: globalThis.KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ', 'Escape', 'Tab'].includes(keyEvent.key)) interrupt();
    };
    const visibilityChanged = () => {
      if (document.hidden) interrupt();
    };
    cancelRef.current = (unmount = false) => {
      if (!unmount) window.scrollTo({ top: window.scrollY, behavior: 'instant' });
      finish(false, unmount);
    };
    window.addEventListener('wheel', interrupt, { passive: true });
    window.addEventListener('touchstart', interrupt, { passive: true });
    window.addEventListener('pointerdown', interrupt, { passive: true });
    window.addEventListener('keydown', interruptKey);
    window.addEventListener('resize', interrupt, { passive: true });
    window.addEventListener('popstate', interrupt);
    window.addEventListener('hashchange', interrupt);
    document.addEventListener('visibilitychange', visibilityChanged);
    // This explicit, user-requested navigation motion also applies when the
    // browser reports reduced motion; no automatic animation is introduced.
    frame = requestAnimationFrame((started) => {
      // Measure after the mobile menu closes, then collapse and compensate before paint.
      const section = page.querySelector<HTMLElement>('#how-it-works');
      const pin = section?.querySelector<HTMLElement>('[data-walkthrough-pin]');
      if (section && pin && getComputedStyle(pin).position === 'sticky') {
        const originalY = window.scrollY;
        const start = originalY + section.getBoundingClientRect().top - (parseFloat(getComputedStyle(pin).top) || 0);
        const distance = Math.max(0, section.getBoundingClientRect().height - pin.getBoundingClientRect().height);
        const rootStyle = document.documentElement.style;
        const previousAnchor = rootStyle.getPropertyValue('overflow-anchor');
        const previousPriority = rootStyle.getPropertyPriority('overflow-anchor');
        rootStyle.setProperty('overflow-anchor', 'none');
        restoreAnchoring = () => {
          if (previousAnchor) rootStyle.setProperty('overflow-anchor', previousAnchor, previousPriority);
          else rootStyle.removeProperty('overflow-anchor');
        };
        compact = {
          section,
          pin,
          frozenProgress: href === '#how-it-works' ? 0 : Math.max(0, Math.min(1, (originalY - start) / Math.max(1, distance))),
        };
        section.dataset.navigationCompact = 'true';
        window.scrollTo({ top: compactStickyScrollPosition(originalY, { start, end: start + distance }), behavior: 'instant' });
      }

      const from = window.scrollY;
      const margin = parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
      const padding = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
      const maximum = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      const to = Math.max(0, Math.min(maximum, from + target.getBoundingClientRect().top - margin - padding));
      const distance = Math.abs(to - from);
      if (distance < 1) {
        window.scrollTo({ top: to, behavior: 'instant' });
        finish(true);
        return;
      }
      const duration = Math.min(900, 240 + Math.sqrt(distance) * 8);
      const travel = (now: number) => {
        const progress = Math.min(1, (now - started) / duration);
        const eased = progress * progress * (3 - 2 * progress);
        window.scrollTo({ top: from + (to - from) * eased, behavior: 'instant' });
        if (progress === 1) finish(true);
        else frame = requestAnimationFrame(travel);
      };
      frame = requestAnimationFrame(travel);
    });
  }

  return { pageRef, navigateSection };
}
