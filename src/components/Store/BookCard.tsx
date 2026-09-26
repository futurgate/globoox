'use client';

import { useState, useEffect, useMemo, type CSSProperties } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { StarIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import BookActionsMenu from './BookActionsMenu';
import { useAuth } from '@/lib/hooks/useAuth';

// Resize base64 cover to card thumbnail size via Canvas.
// HTTPS URLs are returned as-is (handled by next/image optimizer).
function useCompressedCover(src: string, maxWidth = 480): string {
  const [compressed, setCompressed] = useState(src);
  const isDataUri = src.startsWith('data:');

  // Reset compressed to new src when src changes (fixes stale cover race condition)
  useEffect(() => {
    setCompressed(src);
  }, [src]);

  useEffect(() => {
    if (!isDataUri) return;
    let cancelled = false;
    const img = new window.Image();
    img.src = src;
    // Use decode() to ensure image data is fully ready before canvas draw.
    // Safari fires onload before pixel data is decoded, producing black canvas.
    img.decode().then(() => {
      if (cancelled) return;
      if (img.naturalWidth === 0 || img.naturalHeight === 0) return;
      const scale = Math.min(1, maxWidth / img.naturalWidth);
      const w = Math.round(img.naturalWidth * scale);
      const h = Math.round(img.naturalHeight * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, w, h);
      const webp = canvas.toDataURL('image/webp', 0.80);
      setCompressed(webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/jpeg', 0.75));
    }).catch(() => {
      // Keep original src on decode failure
    });
    return () => { cancelled = true; };
  }, [src, maxWidth, isDataUri]);

  return isDataUri ? compressed : src;
}

function useThemeIsDark(): boolean {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      setIsDark(
        root.dataset.themeMode === 'dark' ||
        root.classList.contains('dark') ||
        root.classList.contains('forest-dark')
      );
    };

    apply();
    const observer = new MutationObserver(apply);
    observer.observe(root, { attributes: true, attributeFilter: ['class', 'data-theme-mode'] });
    return () => observer.disconnect();
  }, []);

  return isDark;
}

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function clampChannel(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function rgbToCss(r: number, g: number, b: number): string {
  return `${clampChannel(r)} ${clampChannel(g)} ${clampChannel(b)}`;
}

function isProbablyNeutral(r: number, g: number, b: number): boolean {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max - min < 16;
}

function useCoverAccent(src: string): string {
  const [accent, setAccent] = useState<string>('120 120 128');

  useEffect(() => {
    let cancelled = false;

    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.src = src;
    img.decode().then(() => {
      if (cancelled) return;
      try {
        const sampleW = 32;
        const sampleH = 48;
        const canvas = document.createElement('canvas');
        canvas.width = sampleW;
        canvas.height = sampleH;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, sampleW, sampleH);
        const { data } = ctx.getImageData(0, 0, sampleW, sampleH);

        let totalWeight = 0;
        let rSum = 0;
        let gSum = 0;
        let bSum = 0;

        // Emphasize bottom-center area where Apple Books-like reflection is most visible.
        for (let y = 0; y < sampleH; y += 1) {
          for (let x = 0; x < sampleW; x += 1) {
            const idx = (y * sampleW + x) * 4;
            const a = data[idx + 3] / 255;
            if (a < 0.08) continue;

            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
            if (luma < 12 || luma > 245) continue;

            const sat = (Math.max(r, g, b) - Math.min(r, g, b)) / 255;
            const xCenterDist = Math.abs(x - sampleW / 2) / (sampleW / 2);
            const yBias = y / sampleH;
            const weight = a * (0.35 + sat * 0.9) * (1 - xCenterDist * 0.7) * (0.5 + yBias);

            totalWeight += weight;
            rSum += r * weight;
            gSum += g * weight;
            bSum += b * weight;
          }
        }

        if (totalWeight < 0.001) return;

        let r = rSum / totalWeight;
        let g = gSum / totalWeight;
        let b = bSum / totalWeight;

        // Slightly boost saturation so reflex reads, but avoid neon.
        const avg = (r + g + b) / 3;
        const satBoost = 1.12;
        r = avg + (r - avg) * satBoost;
        g = avg + (g - avg) * satBoost;
        b = avg + (b - avg) * satBoost;

        // For near-neutral covers use warm-neutral fallback to avoid muddy gray glow.
        if (isProbablyNeutral(r, g, b)) {
          setAccent('138 132 120');
          return;
        }

        setAccent(rgbToCss(r, g, b));
      } catch {
        // keep fallback accent
      }
    }).catch(() => {
      // keep fallback accent
    });

    return () => {
      cancelled = true;
    };
  }, [src]);

  return accent;
}

function useImageAspect(src: string, versionKey?: string): { aspect: number | null; isReady: boolean } {
  const cacheKey = useMemo(() => `globoox:cover-aspect:${hashString(versionKey || src)}`, [src, versionKey]);
  const cachedAspect = useMemo(() => {
    if (!src || typeof window === 'undefined') return null;
    try {
      const cached = window.localStorage.getItem(cacheKey);
      const parsed = cached ? Number(cached) : NaN;
      return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    } catch {
      return null;
    }
  }, [src, cacheKey]);
  const [aspect, setAspect] = useState<number | null>(() => {
    if (!src || typeof window === 'undefined') return null;
    try {
      const cached = window.localStorage.getItem(cacheKey);
      const parsed = cached ? Number(cached) : NaN;
      return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (!src) return;

    if (cachedAspect !== null) return;

    let cancelled = false;
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.src = src;
    img.decode().then(() => {
      if (cancelled || img.naturalHeight === 0) return;
      const nextAspect = img.naturalWidth / img.naturalHeight;
      setAspect(nextAspect);
      try {
        window.localStorage.setItem(cacheKey, String(nextAspect));
      } catch {
        // noop
      }
    }).catch(() => {
      if (cancelled) return;
    });
    return () => {
      cancelled = true;
    };
  }, [src, cacheKey, cachedAspect]);

  if (!src) return { aspect: null, isReady: true };
  return { aspect: cachedAspect ?? aspect, isReady: true };
}

function getContainFrameStyle(imageAspect: number | null): CSSProperties {
  const containerAspect = 2 / 3;

  if (!imageAspect || imageAspect <= 0) {
    return { width: '100%', height: '100%' };
  }

  if (imageAspect > containerAspect) {
    return { width: '100%', height: `${(containerAspect / imageAspect) * 100}%` };
  }

  return { width: `${(imageAspect / containerAspect) * 100}%`, height: '100%' };
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const sat = Math.max(0, Math.min(1, s));
  const lig = Math.max(0, Math.min(1, l));
  const c = (1 - Math.abs(2 * lig - 1)) * sat;
  const hp = ((h % 360) + 360) % 360 / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let [r1, g1, b1] = [0, 0, 0];

  if (hp >= 0 && hp < 1) [r1, g1, b1] = [c, x, 0];
  else if (hp < 2) [r1, g1, b1] = [x, c, 0];
  else if (hp < 3) [r1, g1, b1] = [0, c, x];
  else if (hp < 4) [r1, g1, b1] = [0, x, c];
  else if (hp < 5) [r1, g1, b1] = [x, 0, c];
  else [r1, g1, b1] = [c, 0, x];

  const m = lig - c / 2;
  return [
    clampChannel((r1 + m) * 255),
    clampChannel((g1 + m) * 255),
    clampChannel((b1 + m) * 255),
  ];
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const toLinear = (value: number) => {
    const n = value / 255;
    return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
  };
  const [rl, gl, bl] = [toLinear(r), toLinear(g), toLinear(b)];
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
}

function contrastRatio(l1: number, l2: number): number {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function buildFallbackCoverTheme(key: string): {
  baseHsl: string;
  gradient: string;
  textColor: string;
  borderColor: string;
} {
  const hash = hashString(key);
  const hue = hash % 360;
  const saturation = 56 + ((hash >> 4) % 14); // 56..69
  const topLightness = 44 + ((hash >> 8) % 7); // 44..50
  let bottomLightness = 20 + ((hash >> 12) % 6); // 20..25

  // Ensure white text has sufficient contrast against the darker gradient stop.
  for (let i = 0; i < 8; i += 1) {
    const rgb = hslToRgb(hue, saturation / 100, bottomLightness / 100);
    const ratio = contrastRatio(relativeLuminance(rgb), 1);
    if (ratio >= 4.5) break;
    bottomLightness = Math.max(12, bottomLightness - 2);
  }

  return {
    baseHsl: `hsl(${hue} ${saturation}% ${bottomLightness}%)`,
    gradient: `linear-gradient(180deg, hsl(${hue} ${saturation}% ${topLightness}%) 0%, hsl(${hue} ${saturation}% ${bottomLightness}%) 100%)`,
    textColor: '#FFFFFF',
    borderColor: 'rgba(255,255,255,0.50)',
  };
}

function FallbackCover({
  id,
  title,
  author,
}: {
  id: string;
  title: string;
  author: string;
}) {
  const coverTheme = useMemo(() => buildFallbackCoverTheme(`${id}::${title}::${author}`), [id, title, author]);

  return (
    <div
      className="relative h-full w-full [container-type:inline-size]"
      style={{ background: coverTheme.gradient }}
      aria-hidden="true"
    >
      <div
        className="pointer-events-none absolute inset-[6px] rounded-[2px]"
        style={{ border: `1px solid ${coverTheme.borderColor}` }}
      />
      <div className="absolute inset-0 px-[10%] pt-[14%] pb-[16%] flex flex-col justify-between text-center">
        <p
          className="line-clamp-4 text-[clamp(12px,9cqw,24px)] font-semibold leading-tight"
          style={{ color: coverTheme.textColor }}
        >
          {title}
        </p>
        <p
          className="line-clamp-3 text-[clamp(11px,7cqw,18px)] font-medium leading-tight opacity-90"
          style={{ color: coverTheme.textColor }}
        >
          {author}
        </p>
      </div>
    </div>
  );
}

interface BookCardProps {
  id: string;
  title: string;
  author: string;
  cover?: string | null;
  coverLoading?: boolean;
  coverVersionKey?: string;
  languages?: string[];
  progress?: number;
  isDemo?: boolean;
  onHide?: (id: string) => void;
  onDelete?: (id: string) => void;
  hideLabel?: string;
  onOpen?: () => void;
}

export default function BookCard({
  id,
  title,
  author,
  cover,
  coverLoading = false,
  coverVersionKey,
  progress = 0,
  onHide,
  onDelete,
  hideLabel,
  onOpen,
}: BookCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [canHover, setCanHover] = useState<boolean | null>(null);
  const [isCardHovered, setIsCardHovered] = useState(false);
  const [isCardFocused, setIsCardFocused] = useState(false);
  const { isAuthenticated } = useAuth();
  const hasActions = isAuthenticated && Boolean(onHide || onDelete);
  const sourceCover = (cover ?? '').trim();
  const displayCover = sourceCover;
  const [failedCoverSrc, setFailedCoverSrc] = useState<string | null>(null);
  const hasValidCover = Boolean(displayCover) && failedCoverSrc !== displayCover;
  const { aspect: coverAspect, isReady: isAspectReady } = useImageAspect(hasValidCover ? displayCover : '', coverVersionKey);
  const coverAccent = useMemo(() => {
    const hash = hashString(`${id}-${title}`);
    const r = 110 + (hash % 90);
    const g = 100 + ((hash >> 3) % 90);
    const b = 95 + ((hash >> 6) % 90);
    return rgbToCss(r, g, b);
  }, [id, title]);
  const coverFrameStyle = getContainFrameStyle(coverAspect);
  const effectiveCoverFrameStyle = isAspectReady ? coverFrameStyle : { width: '100%', height: '100%' };
  const showMenuButton = canHover === null
    ? false
    : (!canHover || isCardHovered || isCardFocused || isMenuOpen);
  const isDarkTheme = useThemeIsDark();
  const fallbackColor = useMemo(() => buildFallbackCoverTheme(`${id}::${title}::${author}`).baseHsl, [id, title, author]);
  const fallbackShadow = useMemo(() => (
    `0 1px 2px color-mix(in srgb, ${fallbackColor} 32%, transparent), 0 12px 26px color-mix(in srgb, ${fallbackColor} 40%, transparent)`
  ), [fallbackColor]);
  const ambientShadowColor = hasValidCover
    ? (isDarkTheme ? 'rgba(196, 202, 212, 0.20)' : 'rgba(18, 24, 36, 0.16)')
    : `color-mix(in srgb, ${fallbackColor} 46%, transparent)`;

  useEffect(() => {
    const mediaQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
    const apply = () => setCanHover(mediaQuery.matches);

    apply();
    mediaQuery.addEventListener('change', apply);
    return () => mediaQuery.removeEventListener('change', apply);
  }, []);

  return (
    <div
      className="w-full relative"
      onMouseEnter={() => setIsCardHovered(true)}
      onMouseLeave={() => setIsCardHovered(false)}
      onFocusCapture={() => setIsCardFocused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setIsCardFocused(false);
        }
      }}
    >
      <div className="relative mb-2">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-[4%] right-[4%] bottom-[-14px] h-[34px] rounded-full blur-[8px]"
          style={{
            opacity: 'var(--book-reflex-opacity)',
            background: `radial-gradient(ellipse at center, rgba(${coverAccent} / 0.72) 0%, rgba(${coverAccent} / 0.52) 42%, rgba(${coverAccent} / 0.20) 70%, rgba(${coverAccent} / 0) 90%)`,
          }}
        />
        {hasActions && (
          <div
            className={`absolute z-20 pointer-events-none transition-opacity ${showMenuButton ? 'opacity-100' : 'opacity-0'}`}
            style={{ ...effectiveCoverFrameStyle, left: 0, bottom: 0 }}
          >
            <div className="absolute top-1 right-1 pointer-events-auto">
              <BookActionsMenu
                onHide={() => onHide?.(id)}
                onDelete={() => onDelete?.(id)}
                hideLabel={hideLabel}
                onOpenChange={setIsMenuOpen}
              />
            </div>
          </div>
        )}
        <Link
          href={`/reader/${id}`}
          className={`block transition-transform ${isMenuOpen ? 'pointer-events-none' : 'active:scale-[0.98]'}`}
          tabIndex={isMenuOpen ? -1 : 0}
          aria-disabled={isMenuOpen}
          onClick={(event) => {
            if (isMenuOpen) {
              event.preventDefault();
            } else {
              onOpen?.();
            }
          }}
        >
          <div className="aspect-[2/3] relative">
            <div className="absolute left-0 bottom-0" style={effectiveCoverFrameStyle}>
              <div className="relative h-full w-full">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 -z-10 rounded-[3px]"
                  style={{ boxShadow: hasValidCover ? 'var(--book-card-shadow)' : fallbackShadow }}
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute left-[7%] right-[7%] -bottom-[8px] h-[14px] -z-10 rounded-full blur-[8px]"
                  style={{ background: ambientShadowColor }}
                />
                <div className="relative h-full w-full overflow-hidden rounded-[3px]">
                  {hasValidCover ? (
                    <Image
                      src={displayCover}
                      alt={title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 45vw, 180px"
                      unoptimized={displayCover.startsWith('blob:')}
                      onError={() => setFailedCoverSrc(displayCover)}
                    />
                  ) : coverLoading ? (
                    <Skeleton className="h-full w-full" aria-label="Loading cover" />
                  ) : (
                    <FallbackCover id={id} title={title} author={author} />
                  )}

                  {progress > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Link>
      </div>
      <Link
        href={`/reader/${id}`}
        className={`block ${isMenuOpen ? 'pointer-events-none' : ''}`}
        tabIndex={isMenuOpen ? -1 : 0}
        aria-disabled={isMenuOpen}
        onClick={(event) => {
          if (isMenuOpen) {
            event.preventDefault();
          } else {
            onOpen?.();
          }
        }}
      >
        <p className="text-sm font-medium mb-0.5 line-clamp-2 leading-snug">{title}</p>
        <p className="text-xs text-muted-foreground line-clamp-1">{author}</p>
      </Link>
    </div>
  );
}

interface StoreBookCardProps {
  id: string;
  title: string;
  author: string;
  cover: string;
  rating: number;
  reviews: number;
  price: string;
  hasDemo?: boolean;
  demoBookId?: string;
}

export function StoreBookCard({
  id,
  title,
  author,
  cover,
  rating,
  reviews,
  price,
  hasDemo,
}: StoreBookCardProps) {
  const sourceCover = (cover ?? '').trim();
  const [failedCoverSrc, setFailedCoverSrc] = useState<string | null>(null);
  const hasValidCover = Boolean(sourceCover) && failedCoverSrc !== sourceCover;
  const { aspect: coverAspect, isReady: isAspectReady } = useImageAspect(hasValidCover ? sourceCover : '');
  const coverFrameStyle = getContainFrameStyle(coverAspect);
  const effectiveCoverFrameStyle = isAspectReady ? coverFrameStyle : { width: '100%', height: '100%' };
  const isDarkTheme = useThemeIsDark();
  const fallbackColor = useMemo(() => buildFallbackCoverTheme(`${id}::${title}::${author}`).baseHsl, [id, title, author]);
  const fallbackShadow = useMemo(() => (
    `0 1px 2px color-mix(in srgb, ${fallbackColor} 32%, transparent), 0 12px 26px color-mix(in srgb, ${fallbackColor} 40%, transparent)`
  ), [fallbackColor]);
  const ambientShadowColor = hasValidCover
    ? (isDarkTheme ? 'rgba(196, 202, 212, 0.20)' : 'rgba(18, 24, 36, 0.16)')
    : `color-mix(in srgb, ${fallbackColor} 46%, transparent)`;

  return (
    <Link href={`/store/${id}`} className="block active:scale-[0.98] transition-transform">
      <Card className="w-full">
        <CardContent className="p-3">
          <div className="aspect-[2/3] mb-2 relative">
            <div className="absolute left-0 bottom-0" style={effectiveCoverFrameStyle}>
              <div className="relative h-full w-full">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 -z-10 rounded-[3px]"
                  style={{ boxShadow: hasValidCover ? 'var(--book-card-shadow)' : fallbackShadow }}
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute left-[7%] right-[7%] -bottom-[8px] h-[14px] -z-10 rounded-full blur-[8px]"
                  style={{ background: ambientShadowColor }}
                />
                <div className="relative h-full w-full overflow-hidden rounded-[3px]">
                  {hasValidCover && isAspectReady ? (
                    <Image
                      src={sourceCover}
                      alt={title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 45vw, 180px"
                      onError={() => setFailedCoverSrc(sourceCover)}
                    />
                  ) : hasValidCover ? (
                    <Skeleton className="h-full w-full rounded-[3px] bg-muted animate-pulse" />
                  ) : (
                    <FallbackCover id={id} title={title} author={author} />
                  )}
                  {hasDemo && (
                    <Badge className="absolute top-2 left-2">
                      Demo
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
          <CardTitle className="text-sm mb-1 line-clamp-2">{title}</CardTitle>
          <CardDescription className="text-xs mb-2 line-clamp-1">
            {author}
          </CardDescription>
          <div className="flex items-center space-x-1 mb-2">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((star) => (
                <StarIcon
                  key={star}
                  className={`h-3 w-3 ${
                    star <= Math.round(rating)
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
            <span className="text-xs text-muted-foreground">
              ({reviews >= 1000 ? `${(reviews / 1000).toFixed(1)}K` : reviews})
            </span>
          </div>
          <span className="text-sm font-bold">{price}</span>
        </CardContent>
      </Card>
    </Link>
  );
}
