"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import Image from "next/image";
import { useEditorialLocale } from "./EditorialLocale";
import styles from "./ProductRecording.module.css";

type Device = "desktop" | "tablet" | "phone";

const devices = ["desktop", "tablet", "phone"] as const;
const recordings = {
  desktop: {
    src: "/screenrecordings/mac_screen_record_1280w_h264.mp4",
    poster: "/images/device-posters/mac.webp",
    width: 1280,
    height: 820,
  },
  tablet: {
    src: "/screenrecordings/ipad_screen_record_768x1170_h264.mp4",
    poster: "/images/device-posters/ipad.webp",
    width: 768,
    height: 1170,
  },
  phone: {
    src: "/screenrecordings/iphone_screen_record_540x1170_h264.mp4",
    poster: "/images/device-posters/iphone.webp",
    width: 540,
    height: 1170,
  },
};

function subscribeInitialViewport() {
  // The viewport chooses only the first recording. Resizing must not replace
  // a recording the reader is already watching or has selected manually.
  return () => {};
}

function viewportDevice(): Device {
  if (window.matchMedia("(max-width: 600px)").matches) return "phone";
  if (window.matchMedia("(max-width: 1100px)").matches) return "tablet";
  return "desktop";
}

function serverDevice(): Device | null {
  return null;
}

/** Real, existing product recordings. The surrounding frame adds no simulated UI. */
export default function ProductRecording() {
  const { ui: { recording: recordingUi } } = useEditorialLocale();
  const [readInitialViewport] = useState(() => {
    let initialDevice: Device | null = null;
    return () => {
      initialDevice ??= viewportDevice();
      return initialDevice;
    };
  });
  // Keep the server and hydration markup identical. The first client snapshot
  // resolves the viewport before a recording URL is assigned, then stays fixed.
  const initialDevice = useSyncExternalStore(subscribeInitialViewport, readInitialViewport, serverDevice);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [failedDevice, setFailedDevice] = useState<Device | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const id = useId();
  const device = selectedDevice ?? initialDevice ?? "desktop";
  const recording = recordings[device];
  const ready = initialDevice !== null;

  useEffect(() => {
    const video = videoRef.current;
    const stage = stageRef.current;
    if (!ready || !video || !stage) return;

    // Autoplay is controlled here rather than by the HTML attribute, so an
    // offscreen recording does not start until the hero is visible.
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    const bounds = stage.getBoundingClientRect();
    let onScreen = bounds.bottom > 0 && bounds.top < window.innerHeight;

    const syncPlayback = () => {
      if (onScreen && document.visibilityState === "visible") {
        void video.play().catch(() => {
          // Keep a native fallback if the browser refuses muted autoplay.
          video.controls = true;
        });
      } else {
        video.pause();
      }
    };

    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0];
      onScreen = entry.isIntersecting && entry.intersectionRatio >= 0.1;
      syncPlayback();
    }, { threshold: [0, 0.1] });

    observer.observe(stage);
    video.addEventListener("canplay", syncPlayback);
    document.addEventListener("visibilitychange", syncPlayback);
    syncPlayback();

    return () => {
      observer.disconnect();
      video.removeEventListener("canplay", syncPlayback);
      document.removeEventListener("visibilitychange", syncPlayback);
      video.pause();
    };
  }, [device, ready]);

  function chooseDevice(next: Device) {
    if (next === device) return;
    setSelectedDevice(next);
    setFailedDevice(null);
  }

  function navigateTabs(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % devices.length;
    else if (event.key === "ArrowLeft") next = (index + devices.length - 1) % devices.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = devices.length - 1;
    else return;

    event.preventDefault();
    chooseDevice(devices[next]);
    tabRefs.current[next]?.focus();
  }

  return (
    <figure className={styles.showcase} aria-label={recordingUi.figureLabel}>
      <figcaption className={styles.controls}>
        <div className={styles.tabs} role="tablist" aria-label={recordingUi.chooseDevice}>
          {devices.map((item, index) => {
            const label = recordingUi.devices[item];
            return (
              <button
                key={item}
                ref={(node) => { tabRefs.current[index] = node; }}
                type="button"
                role="tab"
                id={`${id}-${item}-tab`}
                aria-selected={device === item}
                aria-controls={`${id}-panel`}
                tabIndex={device === item ? 0 : -1}
                onClick={(event) => { chooseDevice(item); if (event.detail > 0) event.currentTarget.blur(); }}
                onKeyDown={(event) => navigateTabs(event, index)}
              >{label}</button>
            );
          })}
        </div>

      </figcaption>

      <div
        ref={stageRef}
        className={styles.stage}
        data-device={device}
        role="tabpanel"
        tabIndex={0}
        id={`${id}-panel`}
        aria-labelledby={`${id}-${device}-tab`}
      >
        <div className={styles.botanicalWindow} aria-hidden="true">
          <div className={styles.ginkgo}>
            <Image src="/redesign/hero-botanical/ginkgo.png" alt="" fill sizes="240px" />
          </div>
          <div className={styles.grass}>
            <Image src="/redesign/hero-botanical/meadow-grass.png" alt="" fill sizes="320px" />
          </div>
        </div>
        <div className={styles.frame} data-device={device}>
          <video
            key={device}
            ref={videoRef}
            id={`${id}-video`}
            className={styles.video}
            // No video file is requested before the client resolves the device.
            // Only the selected recording exists in the DOM or preloads.
            src={ready ? recording.src : undefined}
            poster={recording.poster}
            width={recording.width}
            height={recording.height}
            preload="metadata"
            muted
            loop
            playsInline
            aria-label={recordingUi.videoLabel(recordingUi.devices[device])}
            aria-describedby={`${id}-description`}
            onError={() => setFailedDevice(device)}
          />
        </div>
      </div>

      <p id={`${id}-description`} className={styles.srOnly}>
        {recordingUi.description}
      </p>
      {failedDevice === device && <p className={styles.error} role="status">{recordingUi.error}</p>}
    </figure>
  );
}
