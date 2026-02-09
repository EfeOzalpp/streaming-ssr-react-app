// src/content-orchestration/scroll-controller.tsx
import { useEffect, useRef, useMemo } from 'react';
import { useProjectVisibility } from '../state/providers/project-context';
import { baseProjects } from './component-loader';
import { ProjectPane } from './project-pane';
import { useSsrData } from '../state/providers/ssr-data-context';
import { orderProjectsTopTwoSeeded } from './seed/project-order';

/* ===========================
   Synthetic Drag For Dynamic Component
   =========================== */
declare global {
  interface DocumentEventMap {
    'synthetic-drag': CustomEvent<{
      phase: 'start' | 'move' | 'end';
      direction: 'up' | 'down';
      magnitude: number; // px intention applied to the OUTER scroller
      velocity?: number; // px/ms (optional)
      source: 'touch' | 'wheel';
      ts: number; // performance.now()
    }>;
    'focus-exit-start': CustomEvent<{ key: string }>;
    'focus-exit-unlock': CustomEvent<{ key: string }>;
  }
}

const ScrollController = () => {
  const {
    scrollContainerRef,
    focusedProjectKey,
    currentIndex,
    setFocusedProjectKey,
  } = useProjectVisibility();
  const { seed = 12345 } = useSsrData() || {};

  // Shuffle once on mount; never recompute order during this session
  const projectsRef = useRef(orderProjectsTopTwoSeeded(baseProjects, seed));
  const projects = projectsRef.current;

  // Keep DOM refs to each block for precise scrolling
  const projectRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Track last outer scrollTop and direction while focused
  const lastScrollTopRef = useRef<number>(0);
  const lastScrollDirRef = useRef<'up' | 'down'>('down');

  // ---- Tunables ----
  const VIS_RATIO_TO_EXIT = 0.2; // 20% of any OTHER pane => auto-unfocus
  const VIS_DWELL_MS = 120; // must remain candidate for this long
  const MIN_LINGER_MS = 200; // shorter: require at least this much time before unlock
  const SNAP_RAMP_MS = 300; // proximity ramp
  const KB_FALLBACK_MS = 900; // snap re-enable fallback
  const UNLOCK_FALLBACK_MS = 1100; // unlock fallback if scroll events don’t fire

  // Track the last non-null focused key so we can anchor (fallback) on exit
  const lastFocusedKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (focusedProjectKey) lastFocusedKeyRef.current = focusedProjectKey;
  }, [focusedProjectKey]);

  // Preferred exit target (set when user scrolls away during focus)
  const exitTargetKeyRef = useRef<string | null>(null);

  // Helper: element's offsetTop within a custom scroller
  const getOffsetTopWithin = (
    el: HTMLElement,
    scroller: HTMLElement | any
  ) => {
    const r1 = el.getBoundingClientRect();
    const r2 = (scroller as HTMLElement).getBoundingClientRect?.() ?? {
      top: 0,
    };
    const st =
      ('scrollTop' in scroller
        ? scroller.scrollTop
        : document.documentElement.scrollTop) || 0;
    return r1.top - r2.top + st;
  };

  // Temporarily disable snap after index changes, to allow smooth momentum handoff
  // Only do this while focused; when NOT focused we want strong snap.
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    if (!focusedProjectKey) return; // keep snap strong outside focus
    container.classList.add('no-snap');
    const timeout = setTimeout(
      () => container.classList.remove('no-snap'),
      800
    );
    return () => clearTimeout(timeout);
  }, [currentIndex, focusedProjectKey, scrollContainerRef]);

  /* ===========================
     Focus entry scroll choreography
     - On entering focus: align the focused block, then bump slightly
     =========================== */
  useEffect(() => {
    if (!focusedProjectKey) return;

    const scroller =
      scrollContainerRef.current ??
      (document.scrollingElement as unknown as HTMLElement | null);
    if (!scroller) return;

    const targetEl =
      projectRefs.current[focusedProjectKey] ??
      (document.getElementById(
        `block-${focusedProjectKey}`
      ) as HTMLDivElement | null);

    const getViewportH = () =>
      (scroller?.clientHeight as number) ||
      (scroller?.getBoundingClientRect?.().height as number) ||
      (window.visualViewport?.height ??
        window.innerHeight ??
        document.documentElement.clientHeight ??
        0);

    requestAnimationFrame(() => {
      if (targetEl?.scrollIntoView) {
        targetEl.scrollIntoView({ block: 'start', behavior: 'smooth' });
      }
      const bump = Math.round(getViewportH() * 0.1); // softer: 10% vh
      if (bump > 0) {
        requestAnimationFrame(() => {
          scroller.scrollBy?.({
            top: bump,
            left: 0,
            behavior: 'smooth',
          });
        });
      }
    });
  }, [focusedProjectKey, scrollContainerRef]);

  // --------------------------
  // Scrolling helpers
  // --------------------------
  const setScrollTop = (scroller: any, top: number) => {
    if ('scrollTop' in scroller) {
      scroller.scrollTop = top;
    } else {
      scroller.scrollTo?.({ top, left: 0, behavior: 'auto' });
    }
  };

  // Kill inertia, then instantly place (used for re-anchors after layout changes)
  const hardPlaceAtKey = (key: string) => {
    const scroller =
      scrollContainerRef.current ??
      (document.scrollingElement as unknown as HTMLElement | null);
    if (!scroller) return;
    const el =
      projectRefs.current[key] ??
      (document.getElementById(`block-${key}`) as HTMLDivElement | null);
    if (!el) return;

    const targetTop = getOffsetTopWithin(el, scroller);

    const prevBehavior = (scroller as HTMLElement).style.scrollBehavior;
    const prevOverflow = (scroller as HTMLElement).style.overflowY;

    (scroller as HTMLElement).style.scrollBehavior = 'auto';
    (scroller as HTMLElement).style.overflowY = 'hidden';
    // @ts-ignore force sync
    void scroller.offsetHeight;

    setScrollTop(scroller, targetTop);

    // @ts-ignore force sync
    void scroller.offsetHeight;

    (scroller as HTMLElement).style.overflowY = prevOverflow || 'scroll';
    (scroller as HTMLElement).style.scrollBehavior = prevBehavior || '';

    lastScrollTopRef.current = scroller.scrollTop || 0;
  };

  // Kill inertia, then tween to a key over ~260ms ease-out (nice transition)
  const animatePlaceToKey = (key: string, ms = 260) => {
    const scroller =
      scrollContainerRef.current ??
      (document.scrollingElement as unknown as HTMLElement | null);
    if (!scroller) return;

    const el =
      projectRefs.current[key] ??
      (document.getElementById(`block-${key}`) as HTMLDivElement | null);
    if (!el) return;

    const targetTop = getOffsetTopWithin(el, scroller);
    const startTop = scroller.scrollTop || 0;
    const delta = targetTop - startTop;
    if (Math.abs(delta) < 1) {
      hardPlaceAtKey(key);
      return;
    }

    const reduce =
      typeof window !== 'undefined' &&
      (window.matchMedia?.('(prefers-reduced-motion: reduce)')
        .matches ?? false);

    const duration = reduce ? 80 : ms;
    const start = performance.now();

    const prevBehavior = (scroller as HTMLElement).style.scrollBehavior;
    const prevOverflow = (scroller as HTMLElement).style.overflowY;
    (scroller as HTMLElement).style.scrollBehavior = 'auto';
    (scroller as HTMLElement).style.overflowY = 'hidden';

    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    let raf = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const y = startTop + delta * easeOutCubic(t);
      setScrollTop(scroller, y);
      if (t < 1) {
        raf = requestAnimationFrame(step);
      } else {
        (scroller as HTMLElement).style.overflowY = prevOverflow || 'scroll';
        (scroller as HTMLElement).style.scrollBehavior = prevBehavior || '';
        lastScrollTopRef.current = scroller.scrollTop || 0;
      }
    };

    // @ts-ignore
    void scroller.offsetHeight;
    raf = requestAnimationFrame(step);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      (scroller as HTMLElement).style.overflowY = 'scroll';
      (scroller as HTMLElement).style.scrollBehavior = '';
    };
  };

  /* ===========================
     AUTO-UNFOCUS while focused
     =========================== */
  useEffect(() => {
    const scroller =
      scrollContainerRef.current ??
      (document.scrollingElement as unknown as HTMLElement | null);
    if (!focusedProjectKey || !scroller) return;

    let raf = 0;
    let dwellTimer: number | null = null;
    let pendingKey: string | null = null;

    const getViewportH = () =>
      (scroller?.clientHeight as number) ||
      (scroller?.getBoundingClientRect?.().height as number) ||
      (window.visualViewport?.height ??
        window.innerHeight ??
        document.documentElement.clientHeight ??
        0);

    const focusedIdx = projects.findIndex(
      (p) => p.key === focusedProjectKey
    );

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
        const el = document.getElementById(
          `block-${p.key}`
        ) as HTMLElement | null;
        if (!el) continue;

        const r = el.getBoundingClientRect();
        if (r.bottom <= 0 || r.top >= vh) continue;

        const visible =
          Math.min(r.bottom, vh) - Math.max(r.top, 0);
        const ratio =
          Math.max(0, visible) /
          Math.max(1, r.height);
        if (ratio < VIS_RATIO_TO_EXIT) continue;

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

      const anyVisibleOther = Boolean(pickCandidate());
      if (anyVisibleOther) {
        const neighbor = clampAdjacentKey(dir) ?? pickCandidate();
        if (neighbor && pendingKey !== neighbor) {
          pendingKey = neighbor;
          if (dwellTimer) window.clearTimeout(dwellTimer);
          dwellTimer = window.setTimeout(() => {
            exitTargetKeyRef.current = neighbor;
            setFocusedProjectKey(null);
          }, VIS_DWELL_MS);
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

    scroller.addEventListener('scroll', onScroll, {
      passive: true,
    });
    onScroll();

    return () => {
      scroller.removeEventListener(
        'scroll',
        onScroll as any
      );
      if (raf) cancelAnimationFrame(raf);
      if (dwellTimer) window.clearTimeout(dwellTimer);
    };
  }, [
    focusedProjectKey,
    projects,
    scrollContainerRef,
    setFocusedProjectKey,
  ]);

  /* ===========================
     Focus EXIT choreography
     =========================== */
  const exitOrchRef = useRef<{
    cancelTween?: () => void;
    timers: number[];
    inputAttached: boolean;
  }>({ timers: [], inputAttached: false });

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    if (focusedProjectKey) return; // only when exiting focus

    const preferredKey =
      exitTargetKeyRef.current || lastFocusedKeyRef.current;
    if (!preferredKey) return;

    const scroller =
      scrollContainerRef.current ??
      (document.scrollingElement as unknown as HTMLElement | null);
    if (!scroller) return;

    const state = exitOrchRef.current;

    container.classList.add('no-snap');

    const cleanup = () => {
      state.cancelTween?.();
      state.cancelTween = undefined;
      state.timers.forEach((t) => clearTimeout(t));
      state.timers = [];
      if (state.inputAttached) {
        detachInputCancels();
      }
      container.classList.remove('no-snap');
      container.classList.remove('snap-proximity');
    };

    document.dispatchEvent(
      new CustomEvent('focus-exit-start', {
        detail: { key: preferredKey },
      })
    );

    state.cancelTween = animatePlaceToKey(preferredKey, 240);

    const INTERACTION_EVENTS: Array<
      keyof DocumentEventMap | 'mousedown'
    > = [
      'wheel',
      'touchstart',
      'keydown',
      'mousedown',
      'synthetic-drag',
    ];

    const onUserCancel = () => {
      cleanup();
      container.classList.add('snap-proximity');
      const t = window.setTimeout(() => {
        container.classList.remove('snap-proximity');
      }, SNAP_RAMP_MS);
      state.timers.push(t);
    };

    const attachInputCancels = () => {
      if (state.inputAttached) return;
      state.inputAttached = true;
      for (const ev of INTERACTION_EVENTS) {
        // @ts-ignore
        document.addEventListener(ev, onUserCancel, {
          passive: true,
        });
      }
    };
    const detachInputCancels = () => {
      if (!state.inputAttached) return;
      state.inputAttached = false;
      for (const ev of INTERACTION_EVENTS) {
        // @ts-ignore
        document.removeEventListener(
          ev,
          onUserCancel as any
        );
      }
    };

    attachInputCancels();

    const oldKey = lastFocusedKeyRef.current;
    const oldEl = oldKey
      ? projectRefs.current[oldKey] ??
        (document.getElementById(
          `block-${oldKey}`
        ) as HTMLDivElement | null)
      : null;

    let ro: ResizeObserver | null = null;
    if (oldEl && typeof ResizeObserver !== 'undefined') {
      let prevH = oldEl.offsetHeight || 0;
      ro = new ResizeObserver(() => {
        const h = oldEl.offsetHeight || 0;
        if (h < prevH - 8) {
          hardPlaceAtKey(preferredKey);
          ro?.disconnect();
          ro = null;
        }
        prevH = h;
      });
      ro.observe(oldEl);
    }

    const unlockTimer = window.setTimeout(() => {
      document.dispatchEvent(
        new CustomEvent('focus-exit-unlock', {
          detail: { key: preferredKey },
        })
      );

      requestAnimationFrame(() => {
        container.classList.add('snap-proximity');
        container.classList.remove('no-snap');
        const ramp = window.setTimeout(() => {
          container.classList.remove(
            'snap-proximity'
          );
        }, SNAP_RAMP_MS);
        state.timers.push(ramp);
      });

      exitTargetKeyRef.current = null;
      detachInputCancels();
    }, MIN_LINGER_MS);
    state.timers.push(unlockTimer);

    const postAnchor = window.setTimeout(() => {
      hardPlaceAtKey(preferredKey);
    }, 600);
    const kbFallback = window.setTimeout(() => {
      container.classList.remove('no-snap');
    }, KB_FALLBACK_MS);
    const unlockFallback = window.setTimeout(() => {
      document.dispatchEvent(
        new CustomEvent('focus-exit-unlock', {
          detail: { key: preferredKey },
        })
      );
      container.classList.add('snap-proximity');
      const ramp = window.setTimeout(() => {
        container.classList.remove(
          'snap-proximity'
        );
      }, SNAP_RAMP_MS);
      state.timers.push(ramp);
      detachInputCancels();
    }, UNLOCK_FALLBACK_MS);
    state.timers.push(
      postAnchor,
      kbFallback,
      unlockFallback
    );

    return () => {
      ro?.disconnect();
      cleanup();
    };
  }, [focusedProjectKey, scrollContainerRef]);

  /* ===========================
     Edge signalling only
     =========================== */
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    let attachedEl: HTMLElement | null = null;

    const atTop = (el: HTMLElement) => el.scrollTop <= 0;
    const atBottom = (el: HTMLElement) => {
      const EPS = Math.max(
        8,
        Math.ceil(
          (window.devicePixelRatio || 1) * 12
        )
      );
      const max =
        el.scrollHeight - el.clientHeight;
      return max - el.scrollTop <= EPS;
    };

    const fireSyntheticDrag = (
      phase: 'start' | 'move' | 'end',
      direction: 'up' | 'down',
      magnitude: number,
      source: 'touch' | 'wheel',
      velocity?: number
    ) => {
      const evt = new CustomEvent('synthetic-drag', {
        detail: {
          phase,
          direction,
          magnitude,
          velocity,
          source,
          ts: performance.now(),
        },
        bubbles: true,
        composed: true,
      });
      scrollContainer.dispatchEvent(evt);
    };

    let lastY = 0;
    let lastTs = 0;

    const handleTouchStart = (e: TouchEvent) => {
      if (!attachedEl) return;
      if (e.touches.length === 1) {
        lastY = e.touches[0].clientY;
        lastTs = performance.now();
        fireSyntheticDrag('start', 'down', 0, 'touch');
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!attachedEl) return;
      if (e.touches.length !== 1) return;
      const y = e.touches[0].clientY;
      const dy = y - lastY;
      const now = performance.now();
      const dt = Math.max(1, now - lastTs);
      const velocity = Math.abs(dy) / dt;
      lastY = y;
      lastTs = now;

      if (
        (dy > 0 && atTop(attachedEl)) ||
        (dy < 0 && atBottom(attachedEl))
      ) {
        fireSyntheticDrag(
          'move',
          dy < 0 ? 'down' : 'up',
          Math.min(600, Math.abs(dy)),
          'touch',
          velocity
        );
      }
    };

    const handleTouchEnd = () => {
      fireSyntheticDrag('end', 'down', 0, 'touch');
    };

    const handleWheel = (e: WheelEvent) => {
      if (!attachedEl) return;
      const { deltaY } = e;
      const top = atTop(attachedEl);
      const bottom = atBottom(attachedEl);
      if (
        (deltaY < 0 && top) ||
        (deltaY > 0 && bottom)
      ) {
        fireSyntheticDrag(
          'move',
          deltaY > 0 ? 'down' : 'up',
          Math.min(600, Math.abs(deltaY)),
          'wheel'
        );
      }
    };

    const cleanupFrom = (el: HTMLElement | null) => {
      if (!el) return;
      el.removeEventListener(
        'touchstart',
        handleTouchStart as any
      );
      el.removeEventListener(
        'touchmove',
        handleTouchMove as any
      );
      el.removeEventListener(
        'touchend',
        handleTouchEnd as any
      );
      el.removeEventListener(
        'wheel',
        handleWheel as any
      );
    };

    const maybeAttach = () => {
      const el = document.querySelector(
        '.embedded-app'
      ) as HTMLElement | null;
      if (!el || el === attachedEl) return;
      cleanupFrom(attachedEl);
      attachedEl = el;
      attachedEl.addEventListener(
        'touchstart',
        handleTouchStart,
        { passive: true }
      );
      attachedEl.addEventListener(
        'touchmove',
        handleTouchMove,
        { passive: true }
      );
      attachedEl.addEventListener(
        'touchend',
        handleTouchEnd,
        { passive: true }
      );
      attachedEl.addEventListener(
        'wheel',
        handleWheel,
        { passive: true }
      );
    };

    if (typeof MutationObserver === 'undefined') {
      // Fallback: single attempt
      maybeAttach();
      return () => {
        cleanupFrom(attachedEl);
      };
    }

    const mo = new MutationObserver(maybeAttach);
    mo.observe(document.body, {
      childList: true,
      subtree: true,
    });
    maybeAttach();

    return () => {
      mo.disconnect();
      cleanupFrom(attachedEl);
      attachedEl = null;
    };
  }, [scrollContainerRef, focusedProjectKey]);

  const blockIds = useMemo(
    () => projects.map((p) => `#block-${p.key}`),
    [projects]
  );
  // blockIds currently unused; kept for possible consumers

  // Example consumer — left in place to react to synthetic-drag if needed
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const onSynthetic = (_e: Event) => {};
    el.addEventListener(
      'synthetic-drag',
      onSynthetic as EventListener
    );
    return () =>
      el.removeEventListener(
        'synthetic-drag',
        onSynthetic as EventListener
      );
  }, [scrollContainerRef]);

  const focusedIdx = focusedProjectKey
    ? projects.findIndex(
        (p) => p.key === focusedProjectKey
      )
    : -1;

  return (
    <div
      ref={scrollContainerRef}
      className="SnappyScrollThingy"
      style={{
        overflowY: 'scroll',
        scrollSnapType: focusedProjectKey
          ? 'none'
          : 'y mandatory',
        scrollBehavior: 'smooth',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      }}
    >
      <style>{`
        .SnappyScrollThingy::-webkit-scrollbar { display: none; }
        .SnappyScrollThingy { overscroll-behavior: auto; }
        .embedded-app { touch-action: pan-y; overscroll-behavior: auto; }

        .SnappyScrollThingy.no-snap { scroll-snap-type: none !important; }
        .SnappyScrollThingy.snap-proximity { scroll-snap-type: y proximity !important; }
      `}</style>

      {projects.map((item, idx) => {
        const isFocused = focusedProjectKey === item.key;
        const collapseBelow =
          focusedIdx >= 0 && idx > focusedIdx;
        return (
          <ProjectPane
            key={item.key}
            item={item}
            isFocused={isFocused}
            collapseBelow={collapseBelow}
            isFirst={idx === 0}
            setRef={(el) => {
              projectRefs.current[item.key] = el;
            }}
          />
        );
      })}
    </div>
  );
};

export default ScrollController;
