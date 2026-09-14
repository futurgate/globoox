/** A linear, reversible mapping. Nothing keeps moving after scrolling stops. */
function ramp(value: number, start: number, end: number) {
  return Math.max(0, Math.min(1, (value - start) / (end - start)));
}

export const stepPositions = [0.05, 0.5, 0.95] as const;

export function getWalkthroughMotion(progress: number) {
  const first = ramp(progress, 0.1, 0.43);
  const second = ramp(progress, 0.57, 0.9);
  // The left-hand step changes immediately at each transition midpoint.
  const activeStep = progress >= 0.735 ? 2 : progress >= 0.265 ? 1 : 0;

  return {
    activeStep,
    cards: [
      // Retiring content clears before the next screenshot appears. Exposed
      // card edges stay quiet instead of showing clipped status-bar glyphs.
      { opacity: 1, imageOpacity: 1 - ramp(first, 0, 0.3), y: -14 * (first + second), scale: 1 - 0.045 * first - 0.035 * second },
      {
        opacity: ramp(first, 0, 0.18),
        imageOpacity: ramp(first, 0.3, 0.95) * (1 - ramp(second, 0, 0.3)),
        y: 28 * (1 - first) - 14 * second,
        scale: 1 - 0.045 * second,
      },
      { opacity: ramp(second, 0, 0.18), imageOpacity: ramp(second, 0.3, 0.95), y: 28 * (1 - second), scale: 1 },
    ],
  };
}
