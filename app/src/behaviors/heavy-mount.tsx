// src/behaviors/heavy-mount.tsx
import { useEffect, useRef, useState, Suspense, type ComponentType, lazy } from 'react';

type MountMode = 'io' | 'idle' | 'immediate';

type Props = {
  load: () => Promise<{ default: ComponentType<any> }>;
  fallback?: React.ReactNode;

  /** Mount strategy */
  mountMode?: MountMode;            // 'io' | 'idle' | 'immediate' (default 'io')

  /** IO config (only when mountMode === 'io') */
  enterThreshold?: number;          // default 0.2   -> start showing at/after this ratio
  exitThreshold?: number;           // default 0.05  -> consider out-of-view at/below
  unmountDelayMs?: number;          // default 150ms -> delay before unmounting after exit
  root?: Element | null;            // viewport by default
  rootMargin?: string;              // default '0px'
  observeTargetId?: string;         // observe specific element; else our own wrapper

  /** Preloading */
  preloadOnIdle?: boolean;          // default true
  preloadIdleTimeout?: number;      // default 2000
  preloadOnFirstIO?: boolean;       // default true

  /** Layout/UX */
  placeholderMinHeight?: number;    // default 360
  fadeMs?: number;                  // default 300
  fadeEasing?: string;              // default 'ease'

  /** Forward child props */
  componentProps?: Record<string, any>;
};

const hasWindow = typeof window !== 'undefined';
const hasRIC = hasWindow && 'requestIdleCallback' in (window as any);
const hasCIC = hasWindow && 'cancelIdleCallback' in (window as any);
const ric = (cb: any, opts?: any) =>
  hasRIC ? (window as any).requestIdleCallback(cb, opts) : setTimeout(cb, opts?.timeout ?? 0);
const cic = (id: any) =>
  hasCIC ? (window as any).cancelIdleCallback(id) : clearTimeout(id);

export default function HeavyMount({
  load,
  fallback = null,

  // strategy
  mountMode = 'io',

  // IO
  enterThreshold = 0.2,
  exitThreshold = 0.05,
  unmountDelayMs = 150,
  root = null,
  rootMargin = '0px',
  observeTargetId,

  // preload
  preloadOnIdle = true,
  preloadIdleTimeout = 2000,
  preloadOnFirstIO = true,

  // layout/UX
  placeholderMinHeight = 360,
  fadeMs = 300,
  fadeEasing = 'ease',

  componentProps,
}: Props) {
  const isServer = !hasWindow;

  const selfRef = useRef<HTMLDivElement | null>(null);
  const [Comp, setComp] = useState<ComponentType | null>(null);

  // mount/visibility
  const mountedRef = useRef(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // timers
  const unmountTimer = useRef<number | null>(null);
  const fadeTimer = useRef<number | null>(null);
  const idleId = useRef<any>(null);

  // preload promise cache
  const preloadPromiseRef = useRef<Promise<{ default: ComponentType<any> }> | null>(null);

  // IO edge tracking
  const lastRatio = useRef<number>(0);
  const lastIntersecting = useRef<boolean>(false);
  const firstIOSeen = useRef(false);

  /** Preload once */
  const ensurePreloaded = () => {
    if (!preloadPromiseRef.current) {
      preloadPromiseRef.current = load();
    }
    return preloadPromiseRef.current;
  };

  const clearTimers = () => {
    if (unmountTimer.current != null) { window.clearTimeout(unmountTimer.current); unmountTimer.current = null; }
    if (fadeTimer.current != null)     { window.clearTimeout(fadeTimer.current);   fadeTimer.current = null; }
  };

  const mountNow = () => {
    if (mountedRef.current) {
      // already mounted; just ensure visible
      setIsVisible(true);
      return;
    }
    mountedRef.current = true;
    const p = ensurePreloaded();
    setComp(prev => prev ?? (lazy(() => p) as unknown as ComponentType));
    setIsMounted(true);
    // next frame -> allow CSS transition
    requestAnimationFrame(() => setIsVisible(true));
  };

  const unmountSoon = () => {
    if (!mountedRef.current) return;
    clearTimers();
    // fade out -> unmount
    unmountTimer.current = window.setTimeout(() => {
      setIsVisible(false);
      fadeTimer.current = window.setTimeout(() => {
        setIsMounted(false);
        mountedRef.current = false;
      }, fadeMs);
    }, unmountDelayMs);
  };

  /** Preload on idle */
  useEffect(() => {
    if (isServer || !preloadOnIdle) return;
    if (idleId.current) cic(idleId.current);
    idleId.current = ric(() => { void ensurePreloaded(); }, { timeout: preloadIdleTimeout });
    return () => { if (idleId.current) { cic(idleId.current); idleId.current = null; } };
  }, [isServer, preloadOnIdle, preloadIdleTimeout, load]);

  /** Mount behavior per mode */
  useEffect(() => {
    if (isServer) return;

    if (mountMode === 'immediate') {
      mountNow();
      return;
    }

    if (mountMode === 'idle') {
      const id = ric(() => mountNow(), { timeout: preloadIdleTimeout });
      return () => { if (id) cic(id); };
    }

    // ---- IO MODE ----
    const target =
      (observeTargetId ? document.getElementById(observeTargetId) : null) ||
      selfRef.current;

    if (!target) return;

    if (typeof IntersectionObserver === 'undefined') {
      // no IO support -> just mount
      mountNow();
      return;
    }

    // ensure sensible thresholds (enter > exit)
    const enter = Math.max(0, Math.min(1, enterThreshold));
    const exit  = Math.max(0, Math.min(enter, exitThreshold)); // cap at enter
    const thresholds = Array.from(new Set([0, exit, enter, 1])).sort((a, b) => a - b);

    const io = new IntersectionObserver(([entry]) => {
      const ratio = entry?.intersectionRatio ?? 0;
      const intersecting = !!entry?.isIntersecting;

      // first IO → optional preload
      if (!firstIOSeen.current) {
        firstIOSeen.current = true;
        if (preloadOnFirstIO) void ensurePreloaded();
      }

      // Compute edge crossings (prevents jitter in the gray zone)
      const crossedEnter = lastRatio.current < enter && ratio >= enter;
      const crossedExit  = lastRatio.current > exit  && ratio <= exit;
      const becameIntersecting = !lastIntersecting.current && intersecting;
      const leftIntersecting   = lastIntersecting.current && !intersecting;

      // ENTER: on intersection or crossing the enter threshold
      if (becameIntersecting || crossedEnter) {
        clearTimers();
        mountNow();
      }
      // EXIT: when leaving intersection OR crossing exit threshold
      else if (leftIntersecting || crossedExit) {
        unmountSoon();
      }

      // save last values
      lastRatio.current = ratio;
      lastIntersecting.current = intersecting;
    }, { root, rootMargin, threshold: thresholds });

    io.observe(target);
    return () => { io.disconnect(); clearTimers(); };
  }, [
    isServer,
    mountMode,
    root,
    rootMargin,
    enterThreshold,
    exitThreshold,
    observeTargetId,
    preloadIdleTimeout,
    preloadOnFirstIO,
    fadeMs,
    unmountDelayMs,
  ]);

  const CompAny = Comp as any;

  return (
    <div
      ref={selfRef}
      style={{ width: '100%', minHeight: placeholderMinHeight, position: 'relative' }}
    >
      {isMounted && CompAny ? (
        <div
          style={{
            opacity: isVisible ? 1 : 0,                 // 1 in view, 0 out of view
            transition: `opacity ${fadeMs}ms ${fadeEasing}`,
            willChange: 'opacity',
          }}
        >
          <Suspense fallback={fallback}>
            <CompAny {...(componentProps || {})} />
          </Suspense>
        </div>
      ) : (
        fallback
      )}
    </div>
  );
}
