'use client';

import { RefObject, useEffect, useLayoutEffect, useState } from 'react';

interface UseAdaptiveDropdownOptions {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  triggerRef: RefObject<HTMLElement | null>;
  menuRef: RefObject<HTMLElement | null>;
  menuWidth: number;
  menuHeight: number;
  measureMenu?: boolean;
  gap?: number;
  margin?: number;
}

export function useAdaptiveDropdown({
  isOpen,
  setIsOpen,
  triggerRef,
  menuRef,
  menuWidth,
  menuHeight,
  measureMenu = false,
  gap = 8,
  margin = 8,
}: UseAdaptiveDropdownOptions) {
  const [menuStyle, setMenuStyle] = useState<{
    top: number;
    left: number;
    transformOrigin: string;
  }>({ top: 0, left: 0, transformOrigin: '100% 0%' });
  const isPositioned = menuStyle.top !== 0 || menuStyle.left !== 0;

  useLayoutEffect(() => {
    if (!isOpen || !triggerRef.current) return;

    const updateMenuPosition = () => {
      const triggerRect = triggerRef.current?.getBoundingClientRect();
      if (!triggerRect) return;

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      const menuRect = measureMenu ? menuRef.current?.getBoundingClientRect() : undefined;
      const width = menuRect?.width || menuWidth;
      const height = menuRect?.height || menuHeight;
      const preferredLeft = triggerRect.right - width;
      const left = Math.max(margin, Math.min(preferredLeft, viewportWidth - width - margin));

      const spaceBelow = viewportHeight - triggerRect.bottom;
      const openUp = spaceBelow < height + gap + margin;
      const top = openUp
        ? Math.max(margin, triggerRect.top - height - gap)
        : Math.min(viewportHeight - height - margin, triggerRect.bottom + gap);

      const triggerCenterX = triggerRect.left + triggerRect.width / 2;
      const originXPercent = ((triggerCenterX - left) / width) * 100;
      const clampedOriginX = Math.max(0, Math.min(100, originXPercent));
      const originY = openUp ? '100%' : '0%';

      setMenuStyle({
        top,
        left,
        transformOrigin: `${clampedOriginX}% ${originY}`,
      });
    };

    updateMenuPosition();
    const observer = measureMenu ? new ResizeObserver(updateMenuPosition) : null;
    if (menuRef.current) observer?.observe(menuRef.current);
    window.addEventListener('resize', updateMenuPosition);
    window.addEventListener('scroll', updateMenuPosition, true);

    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', updateMenuPosition);
      window.removeEventListener('scroll', updateMenuPosition, true);
    };
  }, [isOpen, triggerRef, menuRef, menuWidth, menuHeight, measureMenu, gap, margin]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!menuRef.current?.contains(target) && !triggerRef.current?.contains(target)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, menuRef, triggerRef, setIsOpen]);

  return { menuStyle, isPositioned };
}
