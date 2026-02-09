// src/behaviors/useVideoObserver.tsx
import { useEffect } from 'react';

export const useVideoVisibility = (
  videoRef: React.RefObject<HTMLVideoElement> | null,
  containerRef: React.RefObject<HTMLElement> | null,
  threshold: number = 0.4
) => {
  useEffect(() => {
    if (!videoRef?.current || !containerRef?.current) return;

    const t = typeof threshold === 'number' && threshold >= 0 && threshold <= 1 ? threshold : 0.4;

    let observer: IntersectionObserver | undefined;

    const video = videoRef.current!;
    const container = containerRef.current!;

    // load even when using <source> children
    // (video.src is empty in that case; currentSrc is set after load())
    video.load();
    video.muted = true;

    observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play().catch(() => setTimeout(() => video.play().catch(() => {}), 500));
        } else {
          video.pause();
        }
      },
      { threshold: t }
    );

    observer.observe(container);

    // kick once if already in view
    const rect = container.getBoundingClientRect();
    const ratio = Math.min(Math.max((window.innerHeight - rect.top) / window.innerHeight, 0), 1);
    if (ratio >= t) video.play().catch(() => {});

    return () => observer?.disconnect();
  }, [videoRef, containerRef, threshold]);
};
