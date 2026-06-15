'use client';

import Image from 'next/image';
import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import { SectionLabel } from './SectionLabel';

interface HeroShowcaseProps {
  eyebrow: string;
  title: string;
  subtitle?: string;
  buttonText: string;
  titleClassName?: string;
}

function PlaceholderScreen({ color }: { color: string }) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: color,
      }}
    />
  );
}

function DeviceFrame({
  type,
  className,
  isSequential,
  onEnded,
  videoRef,
}: {
  type: 'phone' | 'tablet' | 'laptop';
  className: string;
  isSequential: boolean;
  onEnded: () => void;
  videoRef: MutableRefObject<HTMLVideoElement | null>;
}) {
  const isPhone = type === 'phone';
  const isTablet = type === 'tablet';
  const isLaptop = type === 'laptop';
  const videoSrc = isPhone
    ? '/screenrecordings/iphone_screen_record_540x1170_h264.mp4'
    : isTablet
      ? '/screenrecordings/ipad_screen_record_768x1170_h264.mp4'
      : isLaptop
        ? '/screenrecordings/mac_screen_record_1280w_h264.mp4'
      : null;
  const screenColor = isLaptop ? 'rgb(255, 0, 0)' : isPhone ? 'rgb(0, 0, 255)' : 'rgb(0, 255, 0)';
  const frameSrc = isLaptop
    ? '/DeviceMockups/MacBook/MacBook Pro 16_ - 5th Gen - Silver.png'
    : isPhone
      ? '/DeviceMockups/iPhone/iPhone 13 Pro - Midnight -  Portrait.png'
      : '/DeviceMockups/iPad/iPad Pro 11 - Space Gray - Portrait.png';
  const screenInset = isLaptop
    ? { top: '10.9%', right: '10%', bottom: '10.9%', left: '10%', radius: '0' }
    : isPhone
      ? { top: '2.7%', right: '7.5%', bottom: '2.7%', left: '7.5%', radius: '0' }
      : { top: '4.1%', right: '5.5%', bottom: '4.1%', left: '5.5%', radius: '0' };
  const aspectRatio = isLaptop ? '2170 / 1430' : isPhone ? '454 / 876' : '788 / 1073';
  const tryAutoplay = () => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.setAttribute('muted', '');
    video.setAttribute('autoplay', '');
    video.setAttribute('playsinline', 'true');
    video.setAttribute('webkit-playsinline', 'true');
    video.removeAttribute('controls');
    void video.play().catch(() => {});
  };

  return (
    <div
      className={className}
      style={{
        position: 'absolute',
        aspectRatio,
        filter: 'drop-shadow(0 28px 60px rgba(44,59,45,0.18))',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: screenInset.top,
          right: screenInset.right,
          bottom: screenInset.bottom,
          left: screenInset.left,
          borderRadius: screenInset.radius,
          overflow: 'hidden',
          zIndex: 1,
        }}
      >
        {videoSrc ? (
          <video
            ref={(node) => {
              videoRef.current = node;

              if (!node) {
                return;
              }

              node.muted = true;
              node.defaultMuted = true;
              node.playsInline = true;
              node.setAttribute('muted', '');
              node.setAttribute('autoplay', '');
              node.setAttribute('playsinline', 'true');
              node.setAttribute('webkit-playsinline', 'true');
              node.removeAttribute('controls');
            }}
            autoPlay={!isSequential}
            muted
            loop={!isSequential}
            playsInline
            controls={false}
            disablePictureInPicture
            preload="auto"
            aria-hidden="true"
            onEnded={onEnded}
            onLoadedMetadata={tryAutoplay}
            onCanPlay={tryAutoplay}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: isTablet ? 'top center' : 'center center',
              display: 'block',
              background: '#000',
            }}
          >
            <source src={videoSrc} type="video/mp4" />
          </video>
        ) : (
          <PlaceholderScreen color={screenColor} />
        )}
      </div>
      <Image
        src={frameSrc}
        alt=""
        fill
        sizes={isLaptop ? '(max-width: 767px) 390px, (max-width: 1199px) 700px, 700px' : isPhone ? '(max-width: 767px) 105px, 190px' : '(max-width: 767px) 150px, 280px'}
        style={{
          objectFit: 'contain',
          zIndex: 2,
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}

export function HeroShowcase({ eyebrow, title, subtitle, buttonText, titleClassName }: HeroShowcaseProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isDesktopSequential, setIsDesktopSequential] = useState(false);
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const laptopVideoRef = useRef<HTMLVideoElement>(null);
  const tabletVideoRef = useRef<HTMLVideoElement>(null);
  const phoneVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1200px)');

    const syncSequentialMode = (matches: boolean) => {
      setIsDesktopSequential(matches);
      setActiveVideoIndex(0);
    };

    syncSequentialMode(mediaQuery.matches);
    const handleChange = (event: MediaQueryListEvent) => syncSequentialMode(event.matches);
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    const videoRefs = [laptopVideoRef, tabletVideoRef, phoneVideoRef];

    videoRefs.forEach((videoRef, index) => {
      const video = videoRef.current;

      if (!video) {
        return;
      }

      if (!isDesktopSequential) {
        video.muted = true;
        video.defaultMuted = true;
        video.playsInline = true;
        video.setAttribute('muted', '');
        video.setAttribute('autoplay', '');
        video.setAttribute('playsinline', 'true');
        video.setAttribute('webkit-playsinline', 'true');
        video.currentTime = 0;
        void video.play().catch(() => {});
        return;
      }

      if (index === activeVideoIndex) {
        video.muted = true;
        video.defaultMuted = true;
        video.playsInline = true;
        video.setAttribute('muted', '');
        video.setAttribute('autoplay', '');
        video.setAttribute('playsinline', 'true');
        video.setAttribute('webkit-playsinline', 'true');
        video.currentTime = 0;
        void video.play().catch(() => {});
        return;
      }

      video.pause();
      video.currentTime = 0;
    });
  }, [activeVideoIndex, isDesktopSequential]);

  const playNextVideo = () => {
    if (!isDesktopSequential) {
      return;
    }

    setActiveVideoIndex((currentIndex) => (currentIndex + 1) % 3);
  };

  return (
    <>
      <section
        className="hero-showcase"
        style={{
          padding: '42px 0 84px',
          width: '100vw',
          marginLeft: 'calc(50% - 50vw)',
          marginRight: 'calc(50% - 50vw)',
          background:
            'radial-gradient(circle at top left, rgba(232,184,154,0.24) 0%, rgba(232,184,154,0) 34%), radial-gradient(circle at bottom right, rgba(44,59,45,0.08) 0%, rgba(44,59,45,0) 38%), var(--parchment)',
          overflow: 'clip',
          ['--hero-copy-width' as string]: '100%',
          ['--hero-media-width' as string]: '100%',
          ['--hero-stage-width' as string]: '100%',
          ['--hero-laptop-width' as string]: '80.4%',
          ['--hero-laptop-left' as string]: '3.9%',
          ['--hero-laptop-bottom' as string]: '4.2%',
          ['--hero-tablet-width' as string]: '35.4%',
          ['--hero-tablet-left' as string]: '63.4%',
          ['--hero-tablet-bottom' as string]: '0%',
          ['--hero-phone-width' as string]: '18%',
          ['--hero-phone-left' as string]: '60.4%',
          ['--hero-phone-bottom' as string]: '-2.9%',
        }}
      >
        <div
          className="hero-showcase-inner"
          style={{
            width: 'min(1600px, calc(100vw - 128px))',
            margin: '0 auto',
            minHeight: 'calc(100vh - 300px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'stretch',
            gap: '0',
          }}
        >
          <div
            className="hero-showcase-copy"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              zIndex: 2,
              width: 'var(--hero-copy-width)',
              textAlign: 'center',
              padding: '0 40px',
            }}
          >
            <SectionLabel>{eyebrow}</SectionLabel>
            <h1
              className={`hero-showcase-title ${titleClassName || ''}`}
              style={{
                fontSize: titleClassName ? undefined : '64px',
                lineHeight: 1.06,
                marginBottom: subtitle ? '24px' : '34px',
                fontWeight: 500,
                fontFamily: "'Lora', serif",
                color: 'var(--ink)',
                maxWidth: '820px',
              }}
            >
              {title}
            </h1>
            {subtitle ? (
              <p
                className="hero-showcase-subtitle"
                style={{
                  fontSize: '20px',
                  color: 'var(--ash)',
                  marginBottom: '36px',
                  maxWidth: '720px',
                }}
              >
                {subtitle}
              </p>
            ) : null}
            <button
              className="hero-showcase-btn"
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              onClick={() => {
                window.location.href = '/my-books';
              }}
              style={{
                display: 'inline-block',
                background: isHovered ? 'var(--primary-hover)' : 'var(--primary)',
                color: '#fff',
                padding: '18px 40px',
                borderRadius: '999px',
                fontWeight: 600,
                fontSize: '16px',
                transition: 'all 0.2s ease',
                border: 'none',
                cursor: 'pointer',
                boxShadow: `0 16px 34px ${isHovered ? 'rgba(163, 77, 50, 0.24)' : 'rgba(192, 90, 58, 0.2)'}`,
              }}
            >
              {buttonText}
            </button>
          </div>

          <div
            className="hero-showcase-devices"
            style={{
              zIndex: 1,
              width: 'var(--hero-media-width)',
              margin: 'var(--hero-devices-margin-top) auto 0',
            }}
          >
            <div className="hero-device-stage">
              <DeviceFrame
                type="laptop"
                className="hero-device hero-device-laptop"
                isSequential={isDesktopSequential}
                onEnded={playNextVideo}
                videoRef={laptopVideoRef}
              />
              <DeviceFrame
                type="tablet"
                className="hero-device hero-device-tablet"
                isSequential={isDesktopSequential}
                onEnded={playNextVideo}
                videoRef={tabletVideoRef}
              />
              <DeviceFrame
                type="phone"
                className="hero-device hero-device-phone"
                isSequential={isDesktopSequential}
                onEnded={playNextVideo}
                videoRef={phoneVideoRef}
              />
            </div>
          </div>
        </div>
      </section>

      <style>{`
        .hero-showcase {
          --hero-stage-offset-x: -5%;
          --hero-stage-offset-y: 0px;
          --hero-devices-margin-top: -120px;
        }

        .hero-device-stage {
          position: relative;
          width: var(--hero-stage-width);
          aspect-ratio: 920 / 620;
          margin: 0;
          transform: translate(var(--hero-stage-offset-x), var(--hero-stage-offset-y));
        }

        .hero-device {
          position: absolute;
        }

        .hero-device-laptop {
          width: var(--hero-laptop-width);
          left: var(--hero-laptop-left);
          bottom: var(--hero-laptop-bottom);
          transform: none;
          z-index: 1;
        }

        .hero-device-tablet {
          width: var(--hero-tablet-width);
          left: var(--hero-tablet-left);
          bottom: var(--hero-tablet-bottom);
          transform: none;
          z-index: 2;
        }

        .hero-device-phone {
          width: var(--hero-phone-width);
          left: var(--hero-phone-left);
          bottom: var(--hero-phone-bottom);
          transform: none;
          z-index: 3;
        }

        @media (max-width: 1199px) {
          .hero-showcase {
            --hero-media-width: 100%;
            --hero-stage-width: 100%;
            --hero-stage-offset-x: -5%;
            --hero-stage-offset-y: 0px;
            --hero-devices-margin-top: -96px;
          }

          .hero-showcase-inner {
            min-height: auto !important;
            width: 100vw !important;
            margin: 0 !important;
          }

          .hero-showcase-copy {
            padding: 0 40px !important;
          }

          .hero-showcase-devices {
            width: 100% !important;
          }

          .hero-showcase-title {
            width: 100% !important;
            font-size: 48px !important;
            line-height: 1.08 !important;
          }

          .hero-showcase-subtitle {
            width: 100% !important;
            font-size: 20px !important;
          }
        }

        @media (max-width: 999px) {
          .hero-showcase {
            --hero-stage-offset-x: 0px;
            --hero-devices-margin-top: 40px;
          }

          .hero-device-laptop {
            display: none;
          }

          .hero-device-tablet {
            width: 48% !important;
            left: 31% !important;
            bottom: 0% !important;
          }

          .hero-device-phone {
            width: 26% !important;
            left: 24% !important;
            bottom: -3% !important;
          }
        }

        @media (max-width: 767px) {
          .hero-showcase {
            padding: 24px 0 56px !important;
            width: 100vw !important;
            margin-left: calc(50% - 50vw) !important;
            margin-right: calc(50% - 50vw) !important;
            --hero-stage-width: 720px;
            --hero-stage-offset-x: 0px;
            --hero-stage-offset-y: -12px;
            --hero-devices-margin-top: 40px;
          }

          .hero-showcase-inner {
            width: 100vw !important;
            margin: 0 !important;
          }

          .hero-device-stage {
            width: 720px !important;
            max-width: none !important;
            margin-left: calc(50% - 360px) !important;
          }

          .hero-showcase-title {
            font-size: 30px !important;
            margin-bottom: 22px !important;
          }

          .hero-showcase-subtitle {
            font-size: 16px !important;
            margin-bottom: 28px !important;
          }

          .hero-showcase-btn {
            padding: 15px 28px !important;
            font-size: 15px !important;
          }

          .hero-showcase-copy {
            padding: 0 20px !important;
          }
        }

        @media (max-width: 419px) {
          .hero-showcase {
            --hero-stage-width: min(100vw, 360px);
            --hero-stage-offset-x: 0px;
            --hero-stage-offset-y: 0px;
            --hero-devices-margin-top: 56px;
          }

          .hero-device-stage {
            width: min(100vw, 360px) !important;
            aspect-ratio: 454 / 876 !important;
            margin-left: auto !important;
            margin-right: auto !important;
          }

          .hero-device-tablet {
            display: none !important;
          }

          .hero-device-phone {
            width: 100% !important;
            left: 0 !important;
            bottom: 0 !important;
          }
        }
      `}</style>
    </>
  );
}
