// src/behaviors/priority-gate.tsx
import { useEffect, useRef, useState, Suspense, type ComponentType } from 'react';

type Props = {
  load?: () => Promise<{ default: ComponentType<any> }>;
  fallback?: React.ReactNode;
  serverRender?: React.ReactNode; // SSR-provided markup for first paint
  eager?: boolean;                // start visible immediately (SSR and client)
  allowIdle?: boolean;
  observeTargetId?: string;      // observe external element if provided
  rootMargin?: string;           // IO margin
  threshold?: number | number[]; // IO threshold(s)
  placeholderMinHeight?: number;
  debugLabel?: string;           // console tag
};

const hasWindow = typeof window !== 'undefined';
const hasRIC = hasWindow && 'requestIdleCallback' in (window as any);
const hasCIC = hasWindow && 'cancelIdleCallback' in (window as any);
const ric = (cb: any, opts?: any) =>
  hasRIC ? (window as any).requestIdleCallback(cb, opts) : setTimeout(cb, opts?.timeout ?? 0);
const cic = (id: any) =>
  hasCIC ? (window as any).cancelIdleCallback(id) : clearTimeout(id);

export default function PriorityGateRender({
  load,
  fallback = null,
  serverRender,
  eager = false,
  allowIdle = false,

  observeTargetId,
  rootMargin = '0px',
  threshold = 0.05,
  placeholderMinHeight = 360,
  debugLabel,
}: Props) {

  // Make SSR and client's first render agree:
  // If we SSR-ed content (serverRender) or set eager, start visible; otherwise start hidden.
  const initialVisible = eager || !!serverRender;
  const [isVisible, setIsVisible] = useState<boolean>(initialVisible);

  const [Component, setComponent] = useState<ComponentType | null>(null);
  const selfRef = useRef<HTMLDivElement | null>(null);
  const idleId = useRef<any>(null);

  // IntersectionObserver: flip visible when in view
  useEffect(() => {
    // If already visible (SSR or eager), nothing to observe.
    if (isVisible) return;

    const target =
      (observeTargetId ? document.getElementById(observeTargetId) : null) ||
      selfRef.current;

    if (!target || typeof IntersectionObserver === 'undefined') {
      setIsVisible(true);
      return;
    }

    const io = new IntersectionObserver(([entry]) => {
      const vis = !!entry.isIntersecting;
      const ratio = entry.intersectionRatio ?? 0;
      if (debugLabel) console.log(`[PriorityGateRender:${debugLabel}] IO`, { ratio, vis });

      if (vis) {
        setIsVisible(true);
        io.disconnect();
        if (idleId.current) {
          cic(idleId.current);
          idleId.current = null;
        }
      }
    }, { threshold, root: null, rootMargin });

    io.observe(target);
    return () => io.disconnect();
  }, [isVisible, observeTargetId, rootMargin, threshold, debugLabel]);

  // Idle preloading (optional): if still hidden and allowed, show after an idle slot
  useEffect(() => {
    if (isVisible || !allowIdle) return;
    idleId.current = ric(() => setIsVisible(true), { timeout: 2000 });
    return () => {
      if (idleId.current) {
        cic(idleId.current);
        idleId.current = null;
      }
    };
  }, [isVisible, allowIdle]);

  // Load component when visible
  useEffect(() => {
    if (!isVisible || Component || !load) return;
    let cancelled = false;
    load().then((mod) => { if (!cancelled) setComponent(() => mod.default); });
    return () => { cancelled = true; };
  }, [isVisible, Component, load]);

  const content = Component
    ? <Suspense fallback={fallback}><Component /></Suspense>
    : (serverRender ?? fallback);

  return (
    <div
      ref={selfRef}
      className={debugLabel ? `liv--${debugLabel}` : undefined}
      style={{
        width: '100%',
        height: '100%',
        minHeight: placeholderMinHeight,
        position: 'relative',
        // First render matches SSR exactly via initialVisible
        opacity: isVisible ? 1 : 0,
        transition: 'opacity 220ms ease',
      }}
    >
      {content}
    </div>
  );
}
