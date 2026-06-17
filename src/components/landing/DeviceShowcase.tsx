'use client';

import Image from 'next/image';
import { useEffect, useRef, useState, type MutableRefObject, type ReactNode } from 'react';

type DeviceType = 'phone' | 'tablet' | 'laptop';
type PlaybackMode = 'autoplay' | 'hover';

interface DeviceShowcaseProps {
  mode: 'hero-tablet' | 'cta-scene';
}

function getDeviceConfig(type: DeviceType) {
  const isPhone = type === 'phone';
  const isTablet = type === 'tablet';
  const isLaptop = type === 'laptop';

  return {
    videoSrc: isPhone
      ? '/screenrecordings/iphone_screen_record_540x1170_h264.mp4'
      : isTablet
        ? '/screenrecordings/ipad_screen_record_768x1170_h264.mp4'
        : '/screenrecordings/mac_screen_record_1280w_h264.mp4',
    posterSrc: isPhone
      ? '/images/device-posters/iphone.webp'
      : isTablet
        ? '/images/device-posters/ipad.webp'
        : '/images/device-posters/mac.webp',
    frameSrc: isLaptop
      ? '/DeviceMockups/MacBook/MacBook Pro 16_ - 5th Gen - Silver.png'
      : isPhone
        ? '/DeviceMockups/iPhone/iPhone 13 Pro - Midnight -  Portrait.png'
        : '/DeviceMockups/iPad/iPad Pro 11 - Space Gray - Portrait.png',
    screenInset: isLaptop
      ? { top: '10.9%', right: '10%', bottom: '10.9%', left: '10%', radius: '0' }
      : isPhone
        ? { top: '2.7%', right: '7.5%', bottom: '2.7%', left: '7.5%', radius: '3%' }
        : { top: '4.1%', right: '5.5%', bottom: '4.1%', left: '5.5%', radius: '0' },
    aspectRatio: isLaptop ? '2170 / 1430' : isPhone ? '454 / 876' : '788 / 1073',
    sizes: isLaptop
      ? '(max-width: 767px) 390px, (max-width: 1199px) 700px, 700px'
      : isPhone
        ? '(max-width: 767px) 105px, 190px'
        : '(max-width: 767px) 150px, 280px',
    objectPosition: isTablet ? 'top center' : 'center center',
  };
}

function DeviceMediaFrame({
  type,
  className,
  children,
}: {
  type: DeviceType;
  className: string;
  children: ReactNode;
}) {
  const config = getDeviceConfig(type);

  return (
    <div
      className={className}
      style={{
        position: 'absolute',
        aspectRatio: config.aspectRatio,
        filter: 'drop-shadow(0 28px 60px rgba(44,59,45,0.18))',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: config.screenInset.top,
          right: config.screenInset.right,
          bottom: config.screenInset.bottom,
          left: config.screenInset.left,
          borderRadius: config.screenInset.radius,
          overflow: 'hidden',
          zIndex: 1,
        }}
      >
        {children}
      </div>
      <Image
        src={config.frameSrc}
        alt=""
        fill
        sizes={config.sizes}
        style={{
          objectFit: 'contain',
          zIndex: 2,
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}

function DeviceFrame({
  type,
  className,
  playbackMode,
  videoRef,
}: {
  type: DeviceType;
  className: string;
  playbackMode: PlaybackMode;
  videoRef: MutableRefObject<HTMLVideoElement | null>;
}) {
  const config = getDeviceConfig(type);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  useEffect(() => {
    if (playbackMode !== 'autoplay') {
      return;
    }

    const video = videoRef.current;

    if (!video) {
      return;
    }

    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', 'true');
    video.setAttribute('webkit-playsinline', 'true');
    video.removeAttribute('controls');

    const playVideo = () => {
      void video.play().catch(() => {
        setIsVideoPlaying(false);
      });
    };

    playVideo();
    video.addEventListener('canplay', playVideo);
    document.addEventListener('visibilitychange', playVideo);
    window.addEventListener('pageshow', playVideo);

    return () => {
      video.removeEventListener('canplay', playVideo);
      document.removeEventListener('visibilitychange', playVideo);
      window.removeEventListener('pageshow', playVideo);
    };
  }, [playbackMode, videoRef]);

  return (
    <DeviceMediaFrame type={type} className={className}>
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
        }}
      >
        {playbackMode === 'hover' ? (
          <Image
            src={config.posterSrc}
            alt=""
            fill
            sizes={config.sizes}
            aria-hidden="true"
            style={{
              objectFit: 'cover',
              objectPosition: config.objectPosition,
              display: 'block',
              background: '#000',
            }}
          />
        ) : (
          <>
            <video
              ref={videoRef}
              className="device-showcase-video"
              autoPlay
              muted
              loop
              playsInline
              controls={false}
              controlsList="nodownload nofullscreen noremoteplayback"
              disablePictureInPicture
              preload="auto"
              aria-hidden="true"
              onPlaying={() => setIsVideoPlaying(true)}
              onPlay={() => setIsVideoPlaying(true)}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: config.objectPosition,
                display: 'block',
                background: '#000',
                pointerEvents: 'none',
              }}
            >
              <source src={config.videoSrc} type="video/mp4" />
            </video>
            {!isVideoPlaying ? (
              <Image
                src={config.posterSrc}
                alt=""
                fill
                priority={type === 'tablet'}
                sizes={config.sizes}
                aria-hidden="true"
                style={{
                  objectFit: 'cover',
                  objectPosition: config.objectPosition,
                  background: '#000',
                  zIndex: 2,
                  pointerEvents: 'none',
                }}
              />
            ) : null}
          </>
        )}
      </div>
    </DeviceMediaFrame>
  );
}

export function PhoneImageFrame({
  className,
  imageSrc,
  imageAlt = '',
  sizes = '(max-width: 767px) 72vw, (max-width: 1023px) 46vw, 420px',
  priority = false,
}: {
  className?: string;
  imageSrc: string;
  imageAlt?: string;
  sizes?: string;
  priority?: boolean;
}) {
  return (
    <DeviceMediaFrame type="phone" className={className ?? ''}>
      <Image
        key={imageSrc}
        src={imageSrc}
        alt={imageAlt}
        fill
        priority={priority}
        sizes={sizes}
        style={{
          objectFit: 'cover',
          transition: 'opacity 260ms ease',
          background: '#ece7df',
        }}
      />
    </DeviceMediaFrame>
  );
}

export function DeviceShowcase({ mode }: DeviceShowcaseProps) {
  const laptopVideoRef = useRef<HTMLVideoElement>(null);
  const tabletVideoRef = useRef<HTMLVideoElement>(null);
  const phoneVideoRef = useRef<HTMLVideoElement>(null);

  if (mode === 'hero-tablet') {
    return (
      <>
        <div className="device-showcase-tablet-wrap">
          <div className="device-showcase-tablet-viewport">
            <div className="device-showcase-tablet-stage">
              <DeviceFrame
                type="tablet"
                className="device-showcase-tablet"
                playbackMode="autoplay"
                videoRef={tabletVideoRef}
              />
            </div>
          </div>
        </div>

        <style>{`
          .device-showcase-tablet-wrap {
            z-index: 1;
            width: 100%;
            margin: 0;
            display: flex;
            justify-content: flex-end;
          }

          .device-showcase-tablet-viewport {
            width: min(400px, 100%);
            overflow: visible;
          }

          .device-showcase-tablet-stage {
            position: relative;
            width: 100%;
            aspect-ratio: 788 / 1073;
            margin: 0;
          }

          .device-showcase-tablet {
            width: 100%;
            left: 0;
            bottom: 0;
          }

          @media (max-width: 767px) {
            .device-showcase-tablet-wrap {
              margin-top: 36px !important;
              justify-content: center !important;
            }

            .device-showcase-tablet-viewport {
              width: min(440px, calc(100vw - 40px)) !important;
              aspect-ratio: 788 / 719 !important;
              margin: 0 auto !important;
              position: relative !important;
            }

            .device-showcase-tablet-stage {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
            }
          }

          @media (min-width: 768px) and (max-width: 1199px) {
            .device-showcase-tablet-wrap {
              margin-top: 36px !important;
              justify-content: center !important;
            }

            .device-showcase-tablet-viewport {
              width: min(560px, 100%) !important;
              aspect-ratio: 788 / 719 !important;
              position: relative !important;
            }

            .device-showcase-tablet-stage {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
            }
          }
        `}</style>
      </>
    );
  }

  return (
    <>
      <div className="device-showcase-scene">
        <div className="device-showcase-stage">
          <DeviceFrame
            type="laptop"
            className="device-showcase device-showcase-laptop"
            playbackMode="hover"
            videoRef={laptopVideoRef}
          />
          <DeviceFrame
            type="tablet"
            className="device-showcase device-showcase-tablet-scene"
            playbackMode="hover"
            videoRef={tabletVideoRef}
          />
          <DeviceFrame
            type="phone"
            className="device-showcase device-showcase-phone"
            playbackMode="hover"
            videoRef={phoneVideoRef}
          />
        </div>
      </div>

      <style>{`
        .device-showcase-scene {
          width: 100%;
          margin: 40px auto 0;
          padding-bottom: 24px;
        }

        .device-showcase-stage {
          position: relative;
          width: min(760px, calc(100% - 24px));
          aspect-ratio: 920 / 540;
          margin: 0 auto;
          transform: translate(-2%, -5%);
        }

        .device-showcase {
          position: absolute;
        }

        .device-showcase-laptop {
          width: 80.4%;
          left: 3.9%;
          bottom: 4.2%;
          z-index: 1;
        }

        .device-showcase-tablet-scene {
          width: 35.4%;
          left: 63.4%;
          bottom: 0;
          z-index: 2;
        }

        .device-showcase-phone {
          width: 18%;
          left: 60.4%;
          bottom: -2.9%;
          z-index: 3;
        }

        @media (max-width: 999px) {
          .device-showcase-stage {
            width: min(680px, calc(100% - 16px)) !important;
            transform: translate(-2%, -5%) !important;
          }
        }

        @media (max-width: 767px) {
          .device-showcase-scene {
            margin-top: 64px !important;
          }

          .device-showcase-stage {
            width: min(560px, calc(100vw - 28px)) !important;
            margin-left: auto !important;
            margin-right: auto !important;
            transform: translate(-2%, -5%) !important;
          }
        }

        @media (max-width: 419px) {
          .device-showcase-stage {
            width: min(100vw - 20px, 340px) !important;
            aspect-ratio: 920 / 540 !important;
            margin-left: auto !important;
            margin-right: auto !important;
            transform: translate(-2%, -5%) !important;
          }
        }
      `}</style>
    </>
  );
}
