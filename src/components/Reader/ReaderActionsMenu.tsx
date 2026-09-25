'use client';

import { useRef, useState } from 'react';
import { MoreHorizontal, List, Type, ChevronRight, Download, Loader2 } from 'lucide-react';
import { Language } from '@/lib/store';
import TableOfContents from './TableOfContents';
import ReaderSettings from './ReaderSettings';
import { useAdaptiveDropdown } from '@/components/ui/useAdaptiveDropdown';
import { uiHeaderControlHitArea, uiIconTriggerButton, uiMenuItemButton } from '@/components/ui/button-styles';
import IOSItemsStack from '@/components/ui/ios-items-stack';
import { useReaderTheme } from '@/lib/hooks/useReaderTheme';
import { getReaderUiColors } from '@/lib/readerTheme';
import { getThemeStyle } from '@/lib/themes';
import { useAuth } from '@/lib/hooks/useAuth';
import { downloadTranslatedEpub } from '@/lib/api';

interface ReaderActionsMenuProps {
  book: {
    id: string;
    title: string;
    author?: string | null;
    isTocContentPending?: boolean;
    coverUrl?: string | null;
    languages: Language[];
    chapters: { number: number; title: string; depth?: number }[];
  };
  currentChapter: number;
  onSelectChapter: (num: number) => void;
  disabled?: boolean;
  onTocOpen?: () => void;
  /** Language currently being read; used for the admin EPUB export. */
  currentLanguage: Language;
}

export default function ReaderActionsMenu({
  book,
  currentChapter,
  onSelectChapter,
  disabled,
  onTocOpen,
  currentLanguage,
}: ReaderActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<'none' | 'toc' | 'settings'>('none');
  const { isAdmin } = useAuth();
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const readerTheme = useReaderTheme();
  const uiColors = getReaderUiColors(readerTheme);
  const readerThemeStyle = getThemeStyle(readerTheme.id);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const effectiveOpen = isOpen && !disabled;

  const { menuStyle } = useAdaptiveDropdown({
    isOpen: effectiveOpen,
    setIsOpen,
    triggerRef,
    menuRef,
    menuWidth: 224,
    menuHeight: isAdmin ? 152 : 104,
  });

  const handleAction = (action: 'toc' | 'settings') => {
    setIsOpen(false);
    setActiveModal(action);
    if (action === 'toc') onTocOpen?.();
  };

  const handleDownloadEpub = async () => {
    if (isDownloading) return;
    setDownloadError(null);
    setIsDownloading(true);
    try {
      await downloadTranslatedEpub(book.id, currentLanguage.toUpperCase());
      setIsOpen(false);
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : 'Download failed');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`${uiIconTriggerButton} ${uiHeaderControlHitArea} inline-flex`}
        disabled={disabled}
      >
        <MoreHorizontal className="w-6 h-6" />
      </button>

      {effectiveOpen && (
        <div
          ref={menuRef}
          className="fixed w-56 z-[100]"
          style={menuStyle}
        >
        <IOSItemsStack tone="reader" className="py-1 shadow-lg" style={readerThemeStyle}>
          <button
            onClick={() => handleAction('toc')}
            className={uiMenuItemButton}
          >
            <div className="flex items-center gap-3">
              <List className="w-5 h-5 text-[var(--reader-accent)]" />
              <span className="text-[17px]">Chapters</span>
            </div>
            <ChevronRight className="w-4 h-4 text-[var(--reader-subtle-text)]" />
          </button>

          <div className="ml-12 mr-4 h-[0.5px] bg-[var(--reader-border)]" />

          <button
            onClick={() => handleAction('settings')}
            className={uiMenuItemButton}
          >
            <div className="flex items-center gap-3">
              <Type className="w-5 h-5 text-[var(--reader-accent)]" />
              <span className="text-[17px]">Appearance</span>
            </div>
            <ChevronRight className="w-4 h-4 text-[var(--reader-subtle-text)]" />
          </button>

          {isAdmin && (
            <>
              <div className="ml-12 mr-4 h-[0.5px] bg-[var(--reader-border)]" />

              <button
                onClick={handleDownloadEpub}
                disabled={isDownloading}
                className={uiMenuItemButton}
              >
                <div className="flex items-center gap-3">
                  {isDownloading ? (
                    <Loader2 className="w-5 h-5 text-[var(--reader-accent)] animate-spin" />
                  ) : (
                    <Download className="w-5 h-5 text-[var(--reader-accent)]" />
                  )}
                  <span className="text-[17px]">
                    {isDownloading ? 'Preparing…' : `Download EPUB (${currentLanguage.toUpperCase()})`}
                  </span>
                </div>
              </button>

              {downloadError && (
                <p className="px-4 pb-2 pt-1 text-[13px] leading-snug text-red-500">
                  {downloadError}
                </p>
              )}
            </>
          )}
        </IOSItemsStack>
        </div>
      )}

      <TableOfContents
        bookTitle={book.title}
        bookAuthor={book.author}
        isContentPending={book.isTocContentPending}
        coverUrl={book.coverUrl}
        chapters={book.chapters}
        currentChapter={currentChapter}
        onSelectChapter={onSelectChapter}
        open={activeModal === 'toc'}
        onOpenChange={(open) => !open && setActiveModal('none')}
      />

      <ReaderSettings
        open={activeModal === 'settings'}
        onOpenChange={(open) => !open && setActiveModal('none')}
      />
    </div>
  );
}
