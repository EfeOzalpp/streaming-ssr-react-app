// src/services/media/useMediaPannable.tsx
import React, { useEffect, useRef } from 'react';

type Sensitivity = number | { x?: number; y?: number };

/**
 * Wraps a single <img> or <video>.
 * - Pan by dragging (via CSS object-position)
 * - Zoom inside the component only (pinch on touch devices, Ctrl+wheel on desktop)
 * - Double-click resets both pan and zoom
 * - Marks itself with data-allow-zoom="1" so the page-level blocker skips it
 */
export default function PannableMedia({
  className,
  style,
  children,
  sensitivity = 1.75,
  minScale = 1,
  maxScale = 3,
}: {
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
  sensitivity?: Sensitivity;
  minScale?: number;
  maxScale?: number;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);
  const scaleRef = useRef(1);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const media = host.querySelector('img, video') as HTMLImageElement | HTMLVideoElement | null;
    if (!media) return;

    const styleMedia = (media as HTMLElement).style;
    const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

    // Object-fit defaults and object-position baseline
    if (!styleMedia.objectFit) styleMedia.objectFit = 'cover';
    const computed = window.getComputedStyle(media);
    if (!computed.objectPosition || computed.objectPosition === 'initial') {
      styleMedia.objectPosition = '50% 50%';
    }
    (media as any).draggable = false;

    // Element-scoped zoom via transform scale
    styleMedia.transformOrigin = '50% 50%';
    const applyScale = (s: number) => {
      scaleRef.current = clamp(s, minScale, maxScale);
      styleMedia.transform = scaleRef.current === 1 ? '' : `scale(${scaleRef.current})`;
    };

    const sensX =
      typeof sensitivity === 'number' ? sensitivity : clamp(sensitivity?.x ?? 1, 0.1, 10);
    const sensY =
      typeof sensitivity === 'number' ? sensitivity : clamp(sensitivity?.y ?? 1, 0.1, 10);

    let cw = 0, ch = 0; // container
    let mw = 0, mh = 0; // intrinsic
    let dispW = 0, dispH = 0;

    let canPanX = false, canPanY = false;
    let pctPerPxX = 0, pctPerPxY = 0;

    const parseOP = () => {
      const op = window.getComputedStyle(media).objectPosition || '50% 50%';
      const [oxRaw, oyRaw] = op.split(/\s+/).map((t) => t.trim());
      const toPct = (v: string) => {
        if (v.endsWith('%')) return parseFloat(v);
        const n = parseFloat(v);
        return Number.isFinite(n) ? clamp(n, 0, 100) : 50;
      };
      return [toPct(oxRaw), toPct(oyRaw)] as [number, number];
    };

    const setOP = (xPct: number, yPct: number) => {
      const x = clamp(xPct, 0, 100);
      const y = clamp(yPct, 0, 100);
      styleMedia.objectPosition = `${x}% ${y}%`;
    };

    const computeCover = () => {
      const rect = host.getBoundingClientRect();
      cw = rect.width; ch = rect.height;

      if (media instanceof HTMLImageElement) {
        mw = media.naturalWidth || 0; mh = media.naturalHeight || 0;
      } else if (media instanceof HTMLVideoElement) {
        mw = media.videoWidth || 0; mh = media.videoHeight || 0;
      }

      if (!mw || !mh || !cw || !ch) {
        dispW = dispH = 0; canPanX = canPanY = false; pctPerPxX = pctPerPxY = 0;
        return;
      }

      const scale = Math.max(cw / mw, ch / mh); // cover
      dispW = mw * scale; dispH = mh * scale;

      const overflowX = dispW - cw;
      const overflowY = dispH - ch;

      canPanX = overflowX > 1;
      canPanY = overflowY > 1;

      pctPerPxX = canPanX ? (100 / overflowX) * sensX : 0;
      pctPerPxY = canPanY ? (100 / overflowY) * sensY : 0;
    };

    computeCover();

    // Resize observer to keep math fresh
    let ro: ResizeObserver | null = null;
    if ('ResizeObserver' in window) {
      ro = new ResizeObserver(() => computeCover());
      ro.observe(host);
    }

    // Videos: wait for metadata for intrinsic sizes
    let onMeta: (() => void) | null = null;
    if (media instanceof HTMLVideoElement) {
      onMeta = () => computeCover();
      media.addEventListener('loadedmetadata', onMeta);
    }

    // Drag-to-pan
    let startX = 0, startY = 0;
    let startOPX = 50, startOPY = 50;

    const setGestureLock = (on: boolean) => {
      draggingRef.current = on;
      if (on) {
        host.dataset.gestureLock = '1';
        host.style.touchAction = 'none';
        host.style.cursor = 'grabbing';
      } else {
        delete host.dataset.gestureLock;
        host.style.touchAction = '';
        host.style.cursor = '';
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if ((e.target as HTMLElement)?.closest('a,button,[role="button"]')) return;

      const [ox, oy] = parseOP();
      startOPX = ox; startOPY = oy;
      startX = e.clientX; startY = e.clientY;

      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      setGestureLock(true);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!draggingRef.current) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      let nextX = startOPX, nextY = startOPY;
      if (canPanX) nextX = startOPX + dx * pctPerPxX;
      if (canPanY) nextY = startOPY + dy * pctPerPxY;
      setOP(nextX, nextY);
    };

    const endDrag = (e?: PointerEvent) => {
      if (!draggingRef.current) return;
      if (e) (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
      setGestureLock(false);
    };

    // Double-click to reset both pan and zoom
    const onDblClick = () => {
      setOP(50, 50);
      applyScale(1);
    };

    // Element-scoped zoom
    // Desktop/trackpad: Ctrl + wheel is treated as pinch by browsers
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;       // only consume pinch-zoom wheels
      e.preventDefault();           // keep zoom local to this element
      const delta = -e.deltaY;      // wheel up -> zoom in
      const next = scaleRef.current * (1 + delta * 0.0015);
      applyScale(next);
    };

    // iOS Safari: gesture events
    let startScale = 1;
    const onGestureStart = () => { startScale = scaleRef.current; };
    const onGestureChange = (e: any) => {
      const rel = typeof e?.scale === 'number' ? e.scale : 1;
      applyScale(startScale * rel);
    };
    const onGestureEnd = () => {};

    // Listeners
    if ('PointerEvent' in window) {
      host.addEventListener('pointerdown', onPointerDown);
      window.addEventListener('pointermove', onPointerMove, { passive: true });
      window.addEventListener('pointerup', endDrag as any, { passive: true });
    }
    host.addEventListener('dblclick', onDblClick);

    host.addEventListener('wheel', onWheel, { passive: false });
    host.addEventListener('gesturestart', onGestureStart as any);
    host.addEventListener('gesturechange', onGestureChange as any);
    host.addEventListener('gestureend', onGestureEnd as any);

    return () => {
      ro?.disconnect();
      if (media instanceof HTMLVideoElement && onMeta) {
        media.removeEventListener('loadedmetadata', onMeta);
      }
      if ('PointerEvent' in window) {
        host.removeEventListener('pointerdown', onPointerDown);
        window.removeEventListener('pointermove', onPointerMove as any);
        window.removeEventListener('pointerup', endDrag as any);
      }
      host.removeEventListener('dblclick', onDblClick);
      host.removeEventListener('wheel', onWheel as any);
      host.removeEventListener('gesturestart', onGestureStart as any);
      host.removeEventListener('gesturechange', onGestureChange as any);
      host.removeEventListener('gestureend', onGestureEnd as any);

      setGestureLock(false);
      applyScale(1);
    };
  }, [sensitivity, minScale, maxScale]);

  return (
    <div
      ref={hostRef}
      className={['pannable-viewport', className].filter(Boolean).join(' ')}
      data-gesture-lock={draggingRef.current ? '1' : undefined}
      data-allow-zoom="1" // opt-in so FrontPage allows pinch here
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        cursor: 'grab',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
