// src/behaviors/useVideoObserver.tsx
import { useEffect, useRef } from 'react';

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

function isRenderable(el: HTMLElement) {
  const r = el.getBoundingClientRect();
  return r.width > 32 && r.height > 32;
}

function ensureOverlay(container: HTMLElement) {
  let overlay = container.querySelector<HTMLDivElement>('[data-video-play-overlay="1"]');
  if (overlay) return overlay;

  overlay = document.createElement('div');
  overlay.dataset.videoPlayOverlay = '1';
  overlay.style.position = 'absolute';
  overlay.style.inset = '0';
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.zIndex = '10';
  overlay.style.opacity = '0';
  overlay.style.pointerEvents = 'none';
  overlay.style.transition = 'opacity 160ms ease';

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.dataset.videoPlayButton = '1';
  btn.textContent = 'Play';
  btn.style.pointerEvents = 'auto';
  btn.style.border = '0';
  btn.style.borderRadius = '2px';
  btn.style.padding = '10px 14px';
  btn.style.fontSize = '14px';
  btn.style.fontWeight = '300';
  btn.style.color = '#fff';
  btn.style.background = 'rgba(0,0,0,0.48)';
  btn.style.backdropFilter = 'blur(10px)';
  (btn.style as any).webkitBackdropFilter = 'blur(10px)';

  overlay.appendChild(btn);

  // make sure the container can host absolute children
  const cs = window.getComputedStyle(container);
  if (cs.position === 'static') container.style.position = 'relative';

  container.appendChild(overlay);
  return overlay;
}

function showOverlay(container: HTMLElement) {
  const overlay = ensureOverlay(container);
  overlay.style.pointerEvents = 'auto';
  overlay.style.opacity = '1';
}

function hideOverlay(container: HTMLElement) {
  const overlay = container.querySelector<HTMLDivElement>('[data-video-play-overlay="1"]');
  if (!overlay) return;
  overlay.style.pointerEvents = 'none';
  overlay.style.opacity = '0';
}

function primeSafariVideo(video: HTMLVideoElement) {
  // Props
  video.muted = true;
  (video as any).defaultMuted = true;
  video.playsInline = true;

  // Attributes (Safari sometimes only respects these)
  video.setAttribute('muted', '');
  video.setAttribute('playsinline', '');
  video.setAttribute('webkit-playsinline', '');
  video.setAttribute('autoplay', '');

  // these are safe to mirror (doesn’t force sound)
  if (video.loop) video.setAttribute('loop', '');
  // preload is handled by caller; don’t override if they intentionally chose metadata/none
}

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

    const ENTER = clamp01(threshold);
    const EXIT = clamp01(Math.min(ENTER, ENTER - 0.12));

    primeSafariVideo(video);

    // Avoid forcing load repeatedly
    if (video.readyState === 0) {
      try { video.load(); } catch {}
    }

    let cancelled = false;
    let raf = 0;

    const attemptPlay = async (reason: 'io' | 'ready' | 'gesture' | 'initial') => {
      if (cancelled) return;

      // If the element hasn’t been laid out meaningfully yet, don’t burn the gesture
      if (!isRenderable(container)) {
        if (reason === 'gesture') showOverlay(container);
        return;
      }

      try {
        // load again if still stuck
        if (video.readyState === 0) {
          try { video.load(); } catch {}
        }

        const p = video.play();
        if (p && typeof (p as any).catch === 'function') {
          await p;
        }

        hideOverlay(container);
      } catch {
        // Autoplay blocked OR not ready => require user gesture
        showOverlay(container);
      }
    };

    const want = (shouldPlay: boolean) => {
      if (cancelled) return;
      if (lastWantedRef.current === shouldPlay) return;
      lastWantedRef.current = shouldPlay;

      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (cancelled) return;
        if (shouldPlay) void attemptPlay('io');
        else {
          hideOverlay(container);
          video.pause();
        }
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

    // Initial kick
    const rect = container.getBoundingClientRect();
    const visiblePx = Math.min(window.innerHeight, rect.bottom) - Math.max(0, rect.top);
    const ratio = rect.height > 0 ? Math.max(0, visiblePx) / rect.height : 0;
    if (ratio >= ENTER) {
      lastWantedRef.current = true;
      void attemptPlay('initial');
    }

    // Retry when the browser tells us it’s ready
    const onReady = () => {
      if (lastWantedRef.current) void attemptPlay('ready');
    };
    video.addEventListener('canplay', onReady);
    video.addEventListener('loadeddata', onReady);

    // Gesture fallback: tapping the container starts playback reliably on iPhone
    const onGesture = (e: Event) => {
      // Only intercept if we *need* it
      const overlayVisible =
        container.querySelector<HTMLDivElement>('[data-video-play-overlay="1"]')?.style.opacity === '1';

      if (overlayVisible || video.paused) {
        e.preventDefault();
        void attemptPlay('gesture');
      }
    };

    // capture helps when inner media wrappers intercept touches
    container.addEventListener('pointerdown', onGesture, { passive: false, capture: true });
    container.addEventListener('touchstart', onGesture, { passive: false, capture: true });

    return () => {
      cancelled = true;
      if (raf) cancelAnimationFrame(raf);
      io.disconnect();
      video.removeEventListener('canplay', onReady);
      video.removeEventListener('loadeddata', onReady);
      container.removeEventListener('pointerdown', onGesture, true as any);
      container.removeEventListener('touchstart', onGesture, true as any);
    };
  }, [videoRef, containerRef, threshold, enabled]);
};