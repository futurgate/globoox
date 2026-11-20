'use client';

import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { UIPortalScope, useUIPortalHost } from '@/components/ui/ui-portal-scope';

type ModalLayer = { root: HTMLElement; content: HTMLElement; trigger: HTMLElement | null };
const layers: ModalLayer[] = [];
let savedOverflow = '';

function tabStops(root: HTMLElement) {
  const elements = root.querySelectorAll<HTMLElement>(
    'button, a[href], input, select, textarea, summary, [tabindex], [contenteditable="true"]',
  );
  return Array.from(elements).filter((el) =>
    el.tabIndex >= 0 &&
    !el.matches(':disabled') &&
    !el.closest('[inert]') &&
    el.getClientRects().length > 0 &&
    getComputedStyle(el).visibility !== 'hidden',
  );
}

function manageModalFocus(root: HTMLElement, content: HTMLElement, dismiss: () => void) {
  const layer: ModalLayer = {
    root,
    content,
    trigger: document.activeElement instanceof HTMLElement ? document.activeElement : null,
  };
  const previous = layers.at(-1);
  if (previous) {
    previous.content.inert = true;
    previous.root.setAttribute('aria-modal', 'false');
  } else {
    savedOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  layers.push(layer);
  const topmost = () => layers.at(-1) === layer;
  const focus = (el: HTMLElement) => el.focus({ preventScroll: true });
  focus(content);

  const onKeyDown = (event: KeyboardEvent) => {
    if (!topmost() || event.defaultPrevented) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      dismiss();
      return;
    }
    if (event.key !== 'Tab') return;
    const stops = tabStops(root);
    const active = document.activeElement;
    const first = stops[0];
    const last = stops.at(-1);
    if (!first || !last) {
      event.preventDefault();
      focus(content);
    } else if (
      active === content ||
      !root.contains(active) ||
      (event.shiftKey ? active === first : active === last)
    ) {
      event.preventDefault();
      focus(event.shiftKey ? last : first);
    }
  };
  const guardFocus = (event: FocusEvent) => {
    if (topmost() && event.target instanceof Node && !root.contains(event.target)) {
      focus(content);
    }
  };
  window.addEventListener('keydown', onKeyDown);
  document.addEventListener('focusin', guardFocus);

  return () => {
    window.removeEventListener('keydown', onKeyDown);
    document.removeEventListener('focusin', guardFocus);
    const shouldRestore = topmost();
    layers.splice(layers.indexOf(layer), 1);
    // A parent can close while its child is still open. Preserve the outer return target.
    for (const remaining of layers) {
      if (root.contains(remaining.trigger)) remaining.trigger = layer.trigger;
    }
    if (!layers.length) document.body.style.overflow = savedOverflow;
    if (shouldRestore) {
      const next = layers.at(-1);
      if (next) {
        next.content.inert = false;
        next.root.setAttribute('aria-modal', 'true');
      }
      if (layer.trigger?.isConnected && (!next || next.root.contains(layer.trigger))) {
        focus(layer.trigger);
      } else if (next) {
        focus(next.content);
      }
    }
  };
}

interface IOSModalShellProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  contentClassName?: string;
  overlayClassName?: string;
  wrapperClassName?: string;
  closeOnOverlay?: boolean;
  labelledBy?: string;
  describedBy?: string;
  animationDurationMs?: number;
  contentStyle?: React.CSSProperties | ((state: 'open' | 'closed') => React.CSSProperties);
  overlayStyle?: React.CSSProperties | ((state: 'open' | 'closed') => React.CSSProperties);
}

export default function IOSModalShell({
  open,
  onOpenChange,
  children,
  contentClassName,
  overlayClassName,
  wrapperClassName,
  closeOnOverlay = true,
  labelledBy,
  describedBy,
  animationDurationMs = 280,
  contentStyle,
  overlayStyle,
}: IOSModalShellProps) {
  const contentRef = useRef<HTMLDivElement | null>(null);
  const portalHost = useUIPortalHost();
  const dismiss = useEffectEvent(() => {
    if (open) onOpenChange(false);
  });
  const [isMounted, setIsMounted] = useState(open);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (open) {
      const mountTimeoutId = window.setTimeout(() => {
        setIsMounted(true);
      }, 0);
      return () => window.clearTimeout(mountTimeoutId);
    }

    const hideTimeoutId = window.setTimeout(() => {
      setIsVisible(false);
    }, 0);
    const unmountTimeoutId = window.setTimeout(() => {
      setIsMounted(false);
    }, animationDurationMs);

    return () => {
      window.clearTimeout(hideTimeoutId);
      window.clearTimeout(unmountTimeoutId);
    };
  }, [open, animationDurationMs]);

  useEffect(() => {
    const content = contentRef.current;
    if (!isMounted || !portalHost || !content?.parentElement) return;
    return manageModalFocus(content.parentElement, content, dismiss);
  }, [isMounted, portalHost]);

  useEffect(() => {
    if (!isMounted || !open || !portalHost) return;
    const frame = window.requestAnimationFrame(() => setIsVisible(true));
    return () => window.cancelAnimationFrame(frame);
  }, [isMounted, open, portalHost]);

  if (!isMounted || !portalHost) return null;

  const state = isVisible ? 'open' : 'closed';
  const resolvedOverlayStyle = typeof overlayStyle === 'function' ? overlayStyle(state) : overlayStyle;
  const resolvedContentStyle = typeof contentStyle === 'function' ? contentStyle(state) : contentStyle;

  return createPortal(
    <UIPortalScope
      className={cn('fixed inset-0 z-[160]', wrapperClassName)}
      data-state={state}
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
    >
      <button
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        className={cn(
          'absolute inset-0 transition-opacity duration-300 ease-out',
          overlayClassName,
        )}
        onMouseDown={(event) => event.preventDefault()}
        onClick={closeOnOverlay ? () => onOpenChange(false) : undefined}
        data-state={state}
        style={resolvedOverlayStyle}
      />

      <div
        ref={contentRef}
        tabIndex={-1}
        className={cn('outline-none', contentClassName)}
        data-state={state}
        style={resolvedContentStyle}
      >
        {children}
      </div>
    </UIPortalScope>,
    portalHost,
  );
}
