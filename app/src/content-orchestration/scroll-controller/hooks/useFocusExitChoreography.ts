import { useEffect, useRef } from 'react';
import { getScroller, getOffsetTopWithin, setScrollTop } from '../lib/scroll';

function hardPlaceAtKey(
  scrollContainerRef: React.RefObject<HTMLElement | null>,
  projectRefs: React.RefObject<Record<string, HTMLDivElement | null>>,
  key: string
) {
  const scroller = getScroller(scrollContainerRef);
  if (!scroller) return;

  const el =
    projectRefs.current[key] ??
    (document.getElementById(`block-${key}`) as HTMLDivElement | null);
  if (!el) return;

  const targetTop = getOffsetTopWithin(el, scroller);

  const prevBehavior = scroller.style.scrollBehavior;
  const prevOverflow = scroller.style.overflowY;

  scroller.style.scrollBehavior = 'auto';
  scroller.style.overflowY = 'hidden';
  void (scroller as any).offsetHeight;

  setScrollTop(scroller, targetTop);
  void (scroller as any).offsetHeight;

  scroller.style.overflowY = prevOverflow || 'auto';
  scroller.style.scrollBehavior = prevBehavior || '';
}

function animatePlaceToKey(
  scrollContainerRef: React.RefObject<HTMLElement | null>,
  projectRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>,
  key: string,
  ms = 240
) {
  const scroller = getScroller(scrollContainerRef);
  if (!scroller) return;

  const el =
    projectRefs.current[key] ??
    (document.getElementById(`block-${key}`) as HTMLDivElement | null);
  if (!el) return;

  const targetTop = getOffsetTopWithin(el, scroller);
  const startTop = scroller.scrollTop || 0;
  const delta = targetTop - startTop;

  if (Math.abs(delta) < 1) {
    hardPlaceAtKey(scrollContainerRef, projectRefs, key);
    return;
  }

  const duration = ms;
  const start = performance.now();

  const prevBehavior = scroller.style.scrollBehavior;
  const prevOverflow = scroller.style.overflowY;

  scroller.style.scrollBehavior = 'auto';
  scroller.style.overflowY = 'hidden';

  const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

  let raf = 0;
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / duration);
    const y = startTop + delta * easeOutCubic(t);
    setScrollTop(scroller, y);

    if (t < 1) raf = requestAnimationFrame(step);
    else {
      scroller.style.overflowY = prevOverflow || 'auto';
      scroller.style.scrollBehavior = prevBehavior || '';
    }
  };

  raf = requestAnimationFrame(step);

  return () => {
    if (raf) cancelAnimationFrame(raf);
    scroller.style.overflowY = prevOverflow || 'auto';
    scroller.style.scrollBehavior = prevBehavior || '';
  };
}

export function useFocusExitChoreography(opts: {
  enabled: boolean;
  scrollContainerRef: React.RefObject<HTMLElement | null>;
  focusedProjectKey: string | null;
  projectRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  lastFocusedKeyRef: React.MutableRefObject<string | null>;
  exitTargetKeyRef: React.MutableRefObject<string | null>;
}) {
  const {
    enabled,
    scrollContainerRef,
    focusedProjectKey,
    projectRefs,
    lastFocusedKeyRef,
    exitTargetKeyRef,
  } = opts;

  const orchRef = useRef<{ cancelTween?: () => void; timers: number[] }>({
    timers: [],
  });

  useEffect(() => {
    if (!enabled) return;

    const container = scrollContainerRef.current;
    if (!container) return;
    if (focusedProjectKey) return;

    const preferredKey = exitTargetKeyRef.current || lastFocusedKeyRef.current;
    if (!preferredKey) return;

    const state = orchRef.current;

    const SNAP_RAMP_MS = 300;
    const MIN_LINGER_MS = 200;

    container.classList.add('no-snap');

    const cleanup = () => {
      state.cancelTween?.();
      state.cancelTween = undefined;
      state.timers.forEach((t) => clearTimeout(t));
      state.timers = [];
      container.classList.remove('no-snap');
      container.classList.remove('snap-proximity');
    };

    state.cancelTween = animatePlaceToKey(scrollContainerRef, projectRefs, preferredKey, 240);

    const rampTimer = window.setTimeout(() => {
      container.classList.add('snap-proximity');
      container.classList.remove('no-snap');

      const removeRamp = window.setTimeout(() => {
        container.classList.remove('snap-proximity');
      }, SNAP_RAMP_MS);

      state.timers.push(removeRamp);
      exitTargetKeyRef.current = null;
    }, MIN_LINGER_MS);

    state.timers.push(rampTimer);

    return cleanup;
  }, [
    enabled,
    focusedProjectKey,
    scrollContainerRef,
    projectRefs,
    lastFocusedKeyRef,
    exitTargetKeyRef,
  ]);
}