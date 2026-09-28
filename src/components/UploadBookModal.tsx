'use client';

import { useState, useRef } from 'react';
import { Upload, Loader2, CheckCircle, FileText } from 'lucide-react';
import { IOSAction, IOSActionStack } from '@/components/ui/ios-action-group';
import IOSFlowDialog from '@/components/ui/ios-flow-dialog';
import IOSDialogFooter from '@/components/ui/ios-dialog-footer';
import { getSignedUploadUrl, uploadToStorage, processBook, getJobStatus } from '@/lib/api';
import { trackBookUploadStarted, trackBookUploaded, trackBookUploadFailed } from '@/lib/posthog';
import * as Sentry from '@sentry/nextjs';

interface UploadBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploaded?: (bookId: string) => void;
}

const SUPPORT_EMAIL = 'support@globoox.co'

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback
}

const JOB_POLL_INTERVAL_MS = 2000
const JOB_POLL_TIMEOUT_MS = 5 * 60 * 1000

/**
 * Poll a queued EPUB-processing job until it completes. The heavy parse runs in
 * the backend worker (queue mode), so the modal waits here instead of blocking
 * on a synchronous response.
 */
async function waitForBookJob(
  jobId: string,
  onProgress: (pct: number) => void,
): Promise<{ bookId: string; chapterCount: number }> {
  const deadline = Date.now() + JOB_POLL_TIMEOUT_MS
  while (Date.now() < deadline) {
    const status = await getJobStatus(jobId)
    if (typeof status.progress === 'number') {
      // Worker reports 0-100; map into the 50-100 band the UI reserves for processing.
      const pct = Math.min(100, Math.max(0, status.progress))
      onProgress(50 + Math.round((pct / 100) * 50))
    }
    if (status.state === 'completed' && status.result) {
      return { bookId: status.result.bookId, chapterCount: status.result.chapterCount ?? 0 }
    }
    if (status.state === 'failed') {
      throw new Error(status.failReason || 'Book processing failed')
    }
    await new Promise((r) => setTimeout(r, JOB_POLL_INTERVAL_MS))
  }
  throw new Error('Book processing timed out. Please try again.')
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

export default function UploadBookModal({ isOpen, onClose, onUploaded }: UploadBookModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isDropActive, setIsDropActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
    if (!file) return;

    setUploading(true);
    setProgress(10);
    setMessage('Preparing upload…');
    setError(null);

    const fileSizeKb = Math.round(file.size / 1024);
    trackBookUploadStarted({ file_size_kb: fileSizeKb });

    try {
      Sentry.addBreadcrumb({
        category: 'upload',
        message: 'upload.started',
        data: { fileName: file.name, fileSize: file.size },
        level: 'info',
      });

      // Generate unique file path
      const fileName = createUploadFileName(file.name);

      // Step 1: Get signed URL for direct upload
      setProgress(15);
      setMessage('Getting upload URL…');
      const { signedUrl } = await getSignedUploadUrl('books', fileName);

      // Step 2: Upload directly to Supabase Storage (bypasses server limits)
      setProgress(25);
      setMessage('Uploading book…');
      await uploadToStorage(signedUrl, file, 'application/epub+zip');

      // Step 3: Process the book on the server. In queue mode the response is
      // { jobId, bookId } and we poll for completion; in sync mode it's the
      // finished book { id, chapter_count }.
      setProgress(50);
      setMessage('Processing book…');
      const response = await processBook(fileName, file.name, file.size);

      let bookId: string;
      let chapterCount: number;
      if ('jobId' in response) {
        const done = await waitForBookJob(response.jobId, setProgress);
        bookId = done.bookId;
        chapterCount = done.chapterCount;
      } else {
        bookId = response.id;
        chapterCount = response.chapter_count ?? 0;
      }

      // Success
      trackBookUploaded({
        title: file.name,
        author: 'Unknown',
        language: 'unknown',
        chapter_count: chapterCount,
        file_size_kb: fileSizeKb,
      });

      Sentry.addBreadcrumb({ category: 'upload', message: 'upload.success', data: { bookId }, level: 'info' });
      setProgress(100);
      setMessage('Book uploaded successfully!');

      setTimeout(() => { onUploaded?.(bookId); handleClose() }, 1500);
    } catch (err: unknown) {
      const message = getErrorMessage(err, 'Upload failed')
      console.error('Upload error:', err);
      Sentry.captureException(err, {
        contexts: { upload: { fileName: file.name, fileSize: file.size, fileSizeKb } },
      });
      trackBookUploadFailed({ error: message, file_size_kb: fileSizeKb });
      setError(message);
      setUploading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setUploading(false);
    setProgress(0);
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
            {progress < 100 ? (
              <Loader2 className="mx-auto mb-3 h-10 w-10 animate-spin text-muted-foreground" />
            ) : (
              <CheckCircle className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            )}
            <p className="mb-3 text-sm text-muted-foreground">{message}</p>
            <div className="h-2 w-full rounded-full bg-[var(--fill-quaternary)]">
              <div
                className="h-2 rounded-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </IOSFlowDialog>
  );
}
