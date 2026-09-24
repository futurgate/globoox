import { ContentBlock } from '@/lib/api'
import { renderInlineMarks } from '@/lib/inlineMarks'
import { getLineHeightStyle } from '@/lib/readerTypography'
import { useReaderTheme } from '@/lib/hooks/useReaderTheme'
import { getReaderContentTokens, getReaderHeadingTypography, getReaderWeightClass, type ReaderThemeConfig } from '@/lib/readerTheme'

interface ContentBlockRendererProps {
  block: ContentBlock
  fontSize?: number
  isPending?: boolean // True if translation is pending (from API or local request)
  showTranslatingLabel?: boolean // True only for the first pending block to show "Translating..." text
  pendingLabel?: string
  coverUrl?: string | null // Book cover URL to use for images with relative paths
  isCoverImage?: boolean // True only for the first image block (the actual book cover)
  imageMaxHeight?: number
  lineHeightScale?: number
}

function getHeadingTypography(
  level: number,
  readerTheme: ReaderThemeConfig,
): {
  className: string
  sizeScale: number
  italic: boolean
} {
  return getReaderHeadingTypography(level, readerTheme)
}

// Wrapper component for pending translation overlay
function PendingWrapper({
  children,
  isPending,
  showLabel,
  pendingLabel = 'Translating...',
  mutedTextColor,
}: {
  children: React.ReactNode;
  isPending?: boolean;
  showLabel?: boolean;
  pendingLabel?: string;
  mutedTextColor?: string;
}) {
  if (!isPending) return <>{children}</>;
  
  return (
    <div className="relative">
      <div className="blur-[3px] opacity-40">
        {children}
      </div>
      {showLabel && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-sm font-medium animate-pulse-text" style={mutedTextColor ? { color: mutedTextColor } : undefined}>
            {pendingLabel}
          </span>
        </div>
      )}
    </div>
  );
}

export default function ContentBlockRenderer({
  block,
  fontSize,
  isPending,
  showTranslatingLabel,
  pendingLabel,
  coverUrl,
  isCoverImage,
  imageMaxHeight,
  lineHeightScale = 1,
}: ContentBlockRendererProps) {
  const readerTheme = useReaderTheme()
  const contentTokens = getReaderContentTokens(readerTheme)
  const style = fontSize ? { fontSize: `${fontSize}px` } : undefined
  const textStyle = fontSize
    ? { ...style, lineHeight: getLineHeightStyle(fontSize, lineHeightScale * readerTheme.typography.lineHeightScale) }
    : style
  const resolvedImageMaxHeight = imageMaxHeight ? Math.max(160, imageMaxHeight - 24) : undefined

  if (block.type === 'hr') {
    return <hr className="my-5" style={{ borderColor: contentTokens.skeletonFill }} />
  }

  if (block.type === 'image') {
    // For relative EPUB paths, only substitute coverUrl for the first image (the actual cover).
    // Other in-chapter images with relative paths cannot be resolved and are skipped.
    let imageSrc = block.src
    if (imageSrc && !imageSrc.startsWith('http://') && !imageSrc.startsWith('https://') && !imageSrc.startsWith('data:') && !imageSrc.startsWith('/')) {
      if (isCoverImage && coverUrl) {
        imageSrc = coverUrl
      } else {
        return null
      }
    }
    
    return (
      <figure className="my-4 select-none">
        {/* EPUB images are dynamic runtime content; next/image cannot precompute dimensions here. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageSrc}
          alt={block.alt}
          draggable={false}
          className="mx-auto block h-auto max-w-full rounded-md object-contain"
          style={resolvedImageMaxHeight ? { maxHeight: `${resolvedImageMaxHeight}px` } : undefined}
        />
        {block.caption && (
          <figcaption className="mt-1 text-center text-xs" style={{ color: contentTokens.captionText }}>
            {block.caption}
          </figcaption>
        )}
      </figure>
    )
  }

  if (block.type === 'heading') {
    const normalizedLevel = Math.max(1, Math.min(6, Number(block.level) || 1))
    const Tag = `h${normalizedLevel}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
    const headingTypography = getHeadingTypography(normalizedLevel, readerTheme)
    const headingStyle = fontSize
      ? { fontSize: `${fontSize * headingTypography.sizeScale}px`, fontStyle: headingTypography.italic ? 'italic' : 'normal' as const }
      : { fontStyle: headingTypography.italic ? 'italic' : 'normal' as const }
    return (
      <PendingWrapper isPending={isPending} showLabel={showTranslatingLabel} pendingLabel={pendingLabel} mutedTextColor={contentTokens.pendingLabelText}>
        <Tag className={headingTypography.className} style={headingStyle}>{renderInlineMarks(block.text, block.marks)}</Tag>
      </PendingWrapper>
    )
  }

  if (block.type === 'paragraph') {
    const isLast = block.isLastPart ?? true;
    const mbClass = isLast ? 'mb-2' : 'mb-0';
    const bodyWeightClass = getReaderWeightClass(readerTheme.typography.bodyWeight)
    return (
      <PendingWrapper isPending={isPending} showLabel={showTranslatingLabel} pendingLabel={pendingLabel} mutedTextColor={contentTokens.pendingLabelText}>
        <p
          className={`${mbClass} ${bodyWeightClass}`}
          style={{ ...textStyle, hyphens: 'auto', WebkitHyphens: 'auto' }}
        >
          {renderInlineMarks(block.text, block.marks)}
        </p>
      </PendingWrapper>
    )
  }

  if (block.type === 'quote') {
    const bodyWeightClass = getReaderWeightClass(readerTheme.typography.bodyWeight)
    return (
      <PendingWrapper isPending={isPending} showLabel={showTranslatingLabel} pendingLabel={pendingLabel} mutedTextColor={contentTokens.pendingLabelText}>
        <blockquote className={`border-l-1 pl-3 my-4 italic ${bodyWeightClass}`} style={{ ...style, borderColor: contentTokens.quoteBorder, color: contentTokens.quoteText }}>
          {renderInlineMarks(block.text, block.marks)}
        </blockquote>
      </PendingWrapper>
    )
  }

  if (block.type === 'list') {
    const Tag = block.ordered ? 'ol' : 'ul'
    const listClass = block.ordered ? 'list-decimal' : 'list-disc'
    const isLast = block.isLastPart ?? true;
    const mbClass = isLast ? 'mb-3' : 'mb-1';
    const bodyWeightClass = getReaderWeightClass(readerTheme.typography.bodyWeight)
    const startProp = block.ordered && block.partIndex !== undefined ? block.partIndex + 1 : undefined;

    return (
      <PendingWrapper isPending={isPending} showLabel={showTranslatingLabel} pendingLabel={pendingLabel} mutedTextColor={contentTokens.pendingLabelText}>
        <Tag className={`${listClass} pl-6 ${mbClass} space-y-1 ${bodyWeightClass}`} style={style} start={startProp}>
          {block.items.map((item, i) => (
            <li key={i} style={{ ...textStyle, hyphens: 'auto', WebkitHyphens: 'auto' }}>{item}</li>
          ))}
        </Tag>
      </PendingWrapper>
    )
  }

  return null
}
