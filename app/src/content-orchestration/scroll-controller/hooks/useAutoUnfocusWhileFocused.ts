import { useEffect, useRef } from 'react';
import { getScroller } from '../lib/scroll';

type ProjectLike = { key: string };

export function useAutoUnfocusWhileFocused(opts: {
  enabled: boolean;
  scrollContainerRef: React.RefObject<HTMLElement | null>;
  focusedProjectKey: string | null;
  setFocusedProjectKey: (k: string | null) => void;
  projects: ProjectLike[];
  exitTargetKeyRef: React.RefObject<string | null>;
  visRatioToExit?: number; // default 0.2
  visDwellMs?: number;     // default 120
}) {
  const {
    enabled,
    scrollContainerRef,
    focusedProjectKey,
    setFocusedProjectKey,
    projects,
    exitTargetKeyRef,
    visRatioToExit = 0.2,
    visDwellMs = 120,
  } = opts;

  const lastScrollTopRef = useRef(0);
  const lastScrollDirRef = useRef<'up' | 'down'>('down');

  useEffect(() => {
    if (!enabled) return;

    const scroller = getScroller(scrollContainerRef);
    if (!focusedProjectKey || !scroller) return;

    let raf = 0;
    let dwellTimer: number | null = null;
    let pendingKey: string | null = null;

    const getViewportH = () =>
      (scroller.clientHeight as number) ||
      (scroller.getBoundingClientRect?.().height as number) ||
      (window.visualViewport?.height ??
        window.innerHeight ??
        document.documentElement.clientHeight ??
        0);

    const focusedIdx = projects.findIndex((p) => p.key === focusedProjectKey);

    const clampAdjacentKey = (dir: 'up' | 'down') => {
      if (focusedIdx < 0) return null;
      const nextIdx =
        dir === 'down'
          ? Math.min(focusedIdx + 1, projects.length - 1)
          : Math.max(focusedIdx - 1, 0);
      if (nextIdx === focusedIdx) return null;
      return projects[nextIdx].key;
    };

    const pickCandidate = () => {
      const vh = getViewportH();
      const viewportCenter = vh * 0.5;

      let bestKey: string | null = null;
      let bestDist = Infinity;

      for (const p of projects) {
        if (p.key === focusedProjectKey) continue;
        const el = document.getElementById(`block-${p.key}`) as HTMLElement | null;
        if (!el) continue;

        const r = el.getBoundingClientRect();
        if (r.bottom <= 0 || r.top >= vh) continue;

        const visible = Math.min(r.bottom, vh) - Math.max(r.top, 0);
        const ratio = Math.max(0, visible) / Math.max(1, r.height);
        if (ratio < visRatioToExit) continue;

        const center = r.top + r.height / 2;
        const dist = Math.abs(center - viewportCenter);
        if (dist < bestDist) {
          bestDist = dist;
          bestKey = p.key;
        }
      }
      return bestKey;
    };

    const onTick = () => {
      raf = 0;

      const curr = scroller.scrollTop || 0;
      const dir: 'up' | 'down' =
        curr < lastScrollTopRef.current
          ? 'up'
          : curr > lastScrollTopRef.current
          ? 'down'
          : lastScrollDirRef.current;

      lastScrollDirRef.current = dir;
      lastScrollTopRef.current = curr;

      const candidate = pickCandidate();
      if (candidate) {
        const neighbor = clampAdjacentKey(dir) ?? candidate;
        if (neighbor && pendingKey !== neighbor) {
          pendingKey = neighbor;
          if (dwellTimer) window.clearTimeout(dwellTimer);
          dwellTimer = window.setTimeout(() => {
            exitTargetKeyRef.current = neighbor;
            setFocusedProjectKey(null);
          }, visDwellMs);
        }
      } else {
        pendingKey = null;
        if (dwellTimer) {
          window.clearTimeout(dwellTimer);
          dwellTimer = null;
        }
      }
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(onTick);
    };

    scroller.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    return () => {
      scroller.removeEventListener('scroll', onScroll as any);
      if (raf) cancelAnimationFrame(raf);
      if (dwellTimer) window.clearTimeout(dwellTimer);
    };
  }, [
    enabled,
    focusedProjectKey,
    scrollContainerRef,
    projects,
    setFocusedProjectKey,
    exitTargetKeyRef,
    visRatioToExit,
    visDwellMs,
  ]);
}