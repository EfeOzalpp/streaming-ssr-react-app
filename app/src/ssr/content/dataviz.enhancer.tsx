// src/ssr/project/dataviz.enhancer.tsx
import { useEffect } from 'react';
import { useTooltipInit } from '../../components/general-ui/tooltip/tooltipInit';

type SrcSet = {
  webm?: string;
  mp4?: string;
  posterMed?: string;
  posterFull?: string;
};

function getSrcSetFromDataset(vid: HTMLVideoElement, prefix: string): SrcSet {
  const ds = (vid.dataset || {}) as Record<string, string | undefined>;
  const key = (k: string) => (prefix ? `${prefix}${k}` : k);

  return {
    webm: ds[key('Webm')] || undefined,
    mp4: ds[key('Mp4')] || undefined,
    posterMed: ds[key('PosterMed')] || undefined,
    posterFull: ds[key('PosterFull')] || undefined,
  };
}

function applySources(vid: HTMLVideoElement, set: SrcSet) {
  // Replace <source> children deterministically
  while (vid.firstChild) vid.removeChild(vid.firstChild);

  if (set.webm) {
    const s = document.createElement('source');
    s.src = set.webm;
    s.type = 'video/webm';
    vid.appendChild(s);
  }
  if (set.mp4) {
    const s = document.createElement('source');
    s.src = set.mp4;
    s.type = 'video/mp4';
    vid.appendChild(s);
  }

  // Poster: set medium immediately; stash full in dataset for upgrade step
  if (set.posterMed) vid.poster = set.posterMed;
  if (set.posterFull) (vid.dataset as any).srcFull = set.posterFull;
}

export default function DataVizEnhancer() {
  useTooltipInit();

  useEffect(() => {
    const vid = document.getElementById('dataviz-media-video') as HTMLVideoElement | null;
    if (!vid) return;

    const cleanupFns: Array<() => void> = [];
    let pausedByVisibility = false;

    const horiz = getSrcSetFromDataset(vid, 'h'); // mediaOne
    const vert = getSrcSetFromDataset(vid, 'v');  // mediaTwo

    const pickSet = () => {
      const isVertical = window.innerHeight > window.innerWidth;
      // Only use vertical set if it actually exists; else fallback
      const canUseVert = Boolean(vert.webm || vert.mp4);
      return isVertical && canUseVert ? vert : horiz;
    };

    const ensurePlaying = () => {
      // 1) Upgrade poster to high-res if provided
      const fullPoster = vid.dataset?.srcFull;
      if (fullPoster && vid.poster !== fullPoster) {
        vid.poster = fullPoster;
      }

      // 2) Load eagerly if needed
      if (vid.readyState === 0) {
        vid.preload = 'auto';
        try {
          vid.load();
        } catch {
          // ignore
        }
      }

      // 3) Hide poster after first painted frame
      const hidePoster = () => {
        vid.removeAttribute('poster');
      };

      const onPlay = () => {
        const anyV = vid as any;
        if (typeof anyV.requestVideoFrameCallback === 'function') {
          anyV.requestVideoFrameCallback(() => hidePoster());
        } else {
          const onTime = () => {
            if (vid.currentTime > 0 && vid.readyState >= 2) {
              vid.removeEventListener('timeupdate', onTime);
              hidePoster();
            }
          };
          vid.addEventListener('timeupdate', onTime, { once: true });
          cleanupFns.push(() => vid.removeEventListener('timeupdate', onTime));

          const timer = setTimeout(() => {
            vid.removeEventListener('timeupdate', onTime);
            hidePoster();
          }, 1200);
          cleanupFns.push(() => clearTimeout(timer));
        }
      };

      vid.addEventListener('play', onPlay, { once: true });
      cleanupFns.push(() => vid.removeEventListener('play', onPlay));

      // 4) Try autoplay
      vid.play().catch(() => {
        // Autoplay blocked; user interaction will start it.
      });

      // 5) Pause on hidden, resume only if we paused it
      const onVis = () => {
        if (document.hidden) {
          if (!vid.paused) {
            pausedByVisibility = true;
            vid.pause();
            return;
          }
          if (!vid.ended && vid.currentTime > 0) {
            pausedByVisibility = true;
          }
          return;
        }

        if (pausedByVisibility) {
          pausedByVisibility = false;
          const tryPlay = () => {
            vid.play().catch(() => {});
          };
          if (typeof requestAnimationFrame === 'function') requestAnimationFrame(tryPlay);
          else tryPlay();
        }
      };

      document.addEventListener('visibilitychange', onVis);
      cleanupFns.push(() => document.removeEventListener('visibilitychange', onVis));
    };

    // Apply correct source set now + on resize/orientation changes
    let lastMode: 'h' | 'v' | null = null;
    const applyByViewport = () => {
      const isVertical = window.innerHeight > window.innerWidth;
      const canUseVert = Boolean(vert.webm || vert.mp4);
      const mode: 'h' | 'v' = isVertical && canUseVert ? 'v' : 'h';
      if (mode === lastMode) return;
      lastMode = mode;

      const chosen = pickSet();
      applySources(vid, chosen);

      // Reload with new sources
      try {
        vid.load();
      } catch {
        // ignore
      }

      // Try play again (won’t hurt if already playing)
      vid.play().catch(() => {});
    };

    applyByViewport();
    ensurePlaying();

    const onResize = () => applyByViewport();
    window.addEventListener('resize', onResize, { passive: true });
    cleanupFns.push(() => window.removeEventListener('resize', onResize));

    return () => {
      cleanupFns.forEach((fn) => fn());
    };
  }, []);

  return null;
}
