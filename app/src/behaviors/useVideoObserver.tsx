// src/behaviors/useVideoObserver.tsx
import { useEffect, useRef } from 'react';

export const useVideoVisibility = (
  videoRef: React.RefObject<HTMLVideoElement> | null,
  containerRef: React.RefObject<HTMLElement> | null,
  threshold: number = 0.4,
  enabled: boolean = true
) => {
  const lastWantedRef = useRef<boolean | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const video = videoRef?.current;
    const container = containerRef?.current;
    if (!video || !container) return;

    const t =
      typeof threshold === 'number' && threshold >= 0 && threshold <= 1 ? threshold : 0.4;

    const ENTER = Math.min(1, Math.max(0, t));
    const EXIT = Math.min(ENTER, Math.max(0, ENTER - 0.12));

    // Avoid forcing load repeatedly
    if (video.readyState === 0) {
      try { video.load(); } catch {}
    }

    video.muted = true;

    let cancelled = false;
    let raf = 0;

    const want = (shouldPlay: boolean) => {
      if (cancelled) return;
      if (lastWantedRef.current === shouldPlay) return;
      lastWantedRef.current = shouldPlay;

      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (cancelled) return;
        if (shouldPlay) video.play().catch(() => {});
        else video.pause();
      });
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        const ratio = entry?.intersectionRatio ?? 0;
        if (lastWantedRef.current !== true && ratio >= ENTER) want(true);
        else if (lastWantedRef.current !== false && ratio <= EXIT) want(false);
      },
      { threshold: [0, EXIT, ENTER, 1] }
    );

    io.observe(container);

    // Initial kick (optional)
    const rect = container.getBoundingClientRect();
    const visiblePx = Math.min(window.innerHeight, rect.bottom) - Math.max(0, rect.top);
    const ratio = rect.height > 0 ? Math.max(0, visiblePx) / rect.height : 0;
    if (ratio >= ENTER) want(true);

    return () => {
      cancelled = true;
      if (raf) cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, [videoRef, containerRef, threshold, enabled]);
};