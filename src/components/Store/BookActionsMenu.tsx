'use client';

import { useRef, useState } from 'react';
import { Archive, ArchiveRestore, MoreHorizontal, Trash2 } from 'lucide-react';
import { useAdaptiveDropdown } from '@/components/ui/useAdaptiveDropdown';
import { uiIconCircleButton, uiMenuItemButton } from '@/components/ui/button-styles';
import IOSItemsStack from '@/components/ui/ios-items-stack';

interface BookActionsMenuProps {
  onHide: () => void;
  onDelete: () => void;
  hideLabel?: string;
  onOpenChange?: (open: boolean) => void;
}

export default function BookActionsMenu({ onHide, onDelete, hideLabel = 'Archive', onOpenChange }: BookActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const setMenuOpen = (open: boolean) => {
    setIsOpen(open);
    onOpenChange?.(open);
    if (!open) {
      setMenuVisible(false);
      return;
    }
    requestAnimationFrame(() => {
      setMenuVisible(true);
    });
  };

  const { menuStyle, isPositioned } = useAdaptiveDropdown({
    isOpen,
    setIsOpen: setMenuOpen,
    triggerRef,
    menuRef,
    menuWidth: 176,
    menuHeight: 108,
  });

  const handleHide = () => {
    setMenuOpen(false);
    onHide();
  };

  const handleDelete = () => {
    setMenuOpen(false);
    onDelete();
  };

  return (
    <div
      className="relative z-10"
      onPointerDown={(e) => {
        e.stopPropagation();
      }}
      onClick={(e) => {
        e.stopPropagation();
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        className={`${uiIconCircleButton} h-8 w-8 bg-background dark:bg-background/80 backdrop-blur`}
        style={{ color: 'var(--app-accent)' }}
        onPointerDown={(e) => {
          e.stopPropagation();
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setMenuOpen(!isOpen);
        }}
      >
        <MoreHorizontal className="w-5 h-5" />
      </button>

      {isOpen && (
        <div
          ref={menuRef}
          className="fixed w-44 z-[100]"
          style={{
            ...menuStyle,
            visibility: menuVisible && isPositioned ? 'visible' : 'hidden',
            opacity: menuVisible && isPositioned ? 1 : 0
          }}
        >
        <IOSItemsStack className="py-1 bg-[var(--app-surface-bg)] shadow-lg border border-[var(--app-border)]">
          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation();
            }}
            onClick={(e) => {
              e.stopPropagation();
              handleHide();
            }}
            className={`${uiMenuItemButton} justify-start gap-3 text-[15px]`}
          >
            {hideLabel === 'Restore' ? (
              <ArchiveRestore className="w-4 h-4 text-[var(--app-accent)]" />
            ) : (
              <Archive className="w-4 h-4 text-[var(--app-accent)]" />
            )}
            <span className="text-[15px]">{hideLabel}</span>
          </button>

          <div className="ml-[44px] mr-4 h-[0.5px] bg-[var(--app-border)]" />

          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation();
            }}
            onClick={(e) => {
              e.stopPropagation();
              handleDelete();
            }}
            className={`${uiMenuItemButton} justify-start gap-3 text-[15px]`}
          >
            <Trash2 className="w-4 h-4 text-destructive" />
            <span className="text-[15px] text-destructive">Delete</span>
          </button>
        </IOSItemsStack>
        </div>
      )}
    </div>
  );
}
