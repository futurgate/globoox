'use client';

import { useState, useRef, useEffect } from 'react';
import { Upload, Loader2, FileText } from 'lucide-react';
import { IOSAction, IOSActionStack } from '@/components/ui/ios-action-group';
import IOSFlowDialog from '@/components/ui/ios-flow-dialog';
import IOSDialogFooter from '@/components/ui/ios-dialog-footer';
import { getSignedUploadUrl, uploadToStorage, processBook } from '@/lib/api';
import { trackBookUploadStarted, trackBookUploaded, trackBookUploadFailed } from '@/lib/posthog';
import * as Sentry from '@sentry/nextjs';

export interface UploadBookEvent {
  attemptId: string; fileName: string; phase: 'uploading' | 'processing' | 'complete' | 'error'; bookId?: string; error?: string;
}

interface UploadBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploaded?: (bookId: string) => void;
  onUploadEvent?: (event: UploadBookEvent) => void;
}

const SUPPORT_EMAIL = 'support@globoox.co'

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback
}

function createUploadFileName(originalName: string): string {
  const slug = originalName
    .replace(/\.epub$/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
  const uniqueSuffix = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`
  return `${slug}-${uniqueSuffix}.epub`
}

function getUploadHelp(error: string | null) {
  if (!error) return null

  const normalized = error.toLowerCase()

  if (normalized.includes('please select an epub file')) {
    return {
      title: 'This file does not look like a valid EPUB.',
      tips: [
        'Make sure the file ends in .epub.',
        'If it opens in another reading app, export it again as EPUB and retry.',
        'DRM-protected books usually cannot be imported.',
      ],
    }
  }

  if (normalized.includes('storage upload failed') || normalized.includes('network') || normalized.includes('failed to fetch')) {
    return {
      title: 'The upload did not finish.',
      tips: [
        'Check your connection and try again.',
        'If the file is very large, wait a moment before retrying.',
        `If this keeps happening, contact ${SUPPORT_EMAIL}.`,
      ],
    }
  }

  return {
    title: 'This book may use an EPUB format we cannot read cleanly yet.',
    tips: [
      'Try opening the file in another EPUB reader to confirm it works.',
      'If possible, re-export it as EPUB 2 or EPUB 3 and upload it again.',
      `If you want us to look into it, contact ${SUPPORT_EMAIL}.`,
    ],
  }
}

export default function UploadBookModal({ isOpen, onClose, onUploaded, onUploadEvent }: UploadBookModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isDropActive, setIsDropActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dialogEpoch = useRef(0);
  const mounted = useRef(true);
  const activeUploads = useRef(new Set<AbortController>());
  useEffect(() => {
    mounted.current = true;
    const controllers = activeUploads.current;
    return () => { mounted.current = false; for (const controller of controllers) controller.abort(); };
  }, []);
  useEffect(() => { if (!isOpen) dialogEpoch.current += 1; }, [isOpen]);
  const uploadHelp = getUploadHelp(error)
  const sectionClassName = 'rounded-[20px] bg-[var(--bg-grouped)] p-5'

  const isLikelyEpub = async (selectedFile: File): Promise<boolean> => {
    const normalizedName = selectedFile.name.trim().toLowerCase();
    if (normalizedName.endsWith('.epub')) return true;

    const mime = (selectedFile.type || '').toLowerCase();
    if (mime === 'application/epub+zip') return true;

    try {
      const head = await selectedFile.slice(0, 1024).arrayBuffer();
      const bytes = new Uint8Array(head);
      const isZip = bytes.length >= 2 && bytes[0] === 0x50 && bytes[1] === 0x4b;
      if (!isZip) return false;
      const text = new TextDecoder('latin1').decode(bytes).toLowerCase();
      if (text.includes('mimetypeapplication/epub+zip')) return true;
      console.warn('[upload] EPUB header not found in first 1KB, treating as ZIP fallback');
      return true;
    } catch {
      return false;
    }
  };

  const handleSelectedFile = async (selectedFile: File | null) => {
    if (!selectedFile) return false;
    const valid = await isLikelyEpub(selectedFile);
    if (!valid) {
      setError('Please select an EPUB file');
      return false;
    }
    setFile(selectedFile);
    setError(null);
    return true;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] ?? null;
    const isAccepted = await handleSelectedFile(selectedFile);
    if (!isAccepted) e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!uploading) setIsDropActive(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDropActive(false);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDropActive(false);
    if (uploading) return;
    const droppedFile = e.dataTransfer.files?.[0] ?? null;
    const isAccepted = await handleSelectedFile(droppedFile);
    if (!isAccepted && fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUpload = async () => {
    if (!file || uploading) return;
    const selected = file;
    const attemptId = crypto.randomUUID();
    const epoch = dialogEpoch.current;
    const controller = new AbortController();
    activeUploads.current.add(controller);
    const currentDialog = () => mounted.current && dialogEpoch.current === epoch;
    const notify = (phase: UploadBookEvent['phase'], extra: Partial<UploadBookEvent> = {}) =>
      onUploadEvent?.({ attemptId, fileName: selected.name, phase, ...extra });
    const message = (text: string) => { if (currentDialog()) setMessage(text); };
    setUploading(true);
    setMessage('Preparing upload…');
    setError(null);
    const fileSizeKb = Math.round(selected.size / 1024);
    trackBookUploadStarted({ file_size_kb: fileSizeKb });
    try {
      notify('uploading');
      const fileName = createUploadFileName(selected.name);
      const { signedUrl } = await getSignedUploadUrl('books', fileName, controller.signal);
      controller.signal.throwIfAborted();
      message('Uploading book…');
      await uploadToStorage(signedUrl, selected, 'application/epub+zip', controller.signal);
      controller.signal.throwIfAborted();
      notify('processing');
      message('Processing book…');
      const response = await processBook(fileName, selected.name, selected.size, controller.signal);
      controller.signal.throwIfAborted();
      trackBookUploaded({ title: selected.name, author: 'Unknown', language: 'unknown', chapter_count: response.chapter_count ?? 0, file_size_kb: fileSizeKb });
      notify('complete', { bookId: response.id });
      onUploaded?.(response.id);
      if (currentDialog()) handleClose();
    } catch (err: unknown) {
      const errorMessage = getErrorMessage(err, 'Upload failed');
      notify('error', { error: errorMessage });
      if (!controller.signal.aborted) {
        Sentry.captureException(err, { contexts: { upload: { fileName: selected.name, fileSize: selected.size, fileSizeKb } } });
        trackBookUploadFailed({ error: errorMessage, file_size_kb: fileSizeKb });
      }
      if (currentDialog()) { setError(errorMessage); setUploading(false); }
    } finally {
      activeUploads.current.delete(controller);
    }
  };

  const handleClose = () => {
    dialogEpoch.current += 1;
    setFile(null);
    setUploading(false);
    setMessage('');
    setError(null);
    setIsDropActive(false);
    onClose();
  };

  return (
    <IOSFlowDialog
      open={isOpen}
      onOpenChange={(nextOpen) => !nextOpen && handleClose()}
      className="sm:max-w-md sm:pb-6"
      title="Upload Book"
      description="Add an EPUB from your device and we&apos;ll prepare it for reading and translation."
    >
      <div className="space-y-4">
        {!uploading ? (
          <>
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragEnter={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`${sectionClassName} cursor-pointer border border-[var(--app-border)] py-7 text-center transition-all duration-150 hover:bg-[var(--fill-tertiary)] ${isDropActive ? 'bg-[var(--fill-tertiary)] border-transparent scale-[1.01]' : ''}`}
            >
              {file ? (
                <FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
              ) : (
                <Upload className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
              )}
              <p className="text-[15px] font-medium text-foreground">
                {file ? file.name : 'Choose an EPUB file'}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                EPUB only. DRM-protected books usually cannot be imported.
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".epub"
              onChange={handleFileSelect}
              className="hidden"
            />

            {error && (
              <div className={`${sectionClassName} space-y-3 text-left`}>
                <p className="text-sm font-medium text-destructive">{error}</p>
                {uploadHelp && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">{uploadHelp.title}</p>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      {uploadHelp.tips.map((tip) => (
                        <li key={tip}>{tip}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <IOSDialogFooter>
              <IOSActionStack>
                <IOSAction onClick={handleUpload} disabled={!file} emphasized>
                  Upload
                </IOSAction>
              </IOSActionStack>
            </IOSDialogFooter>
          </>
        ) : (
          <div className={`${sectionClassName} py-8 text-center`}>
            <Loader2 className="mx-auto mb-3 h-10 w-10 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground" role="status">{message}</p>
          </div>
        )}
      </div>
    </IOSFlowDialog>
  );
}
