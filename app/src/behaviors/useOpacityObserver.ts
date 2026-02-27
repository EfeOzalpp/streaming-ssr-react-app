// src/behaviors/useOpacityObserver.ts
import { useEffect, useMemo, useRef } from 'react';
import { useRealMobileViewport } from '../shared/useRealMobile';

type Options = {
  /** Ref to the element whose opacity will be controlled */
  targetRef: React.RefObject<HTMLElement | null>;

  /** IntersectionObserver root (scroll container). null => viewport */
  root?: HTMLElement | null;

  /** When true, disables observing and forces opacity = 1 */
  disabled?: boolean;

  /** Opacity becomes 1 when ratio >= fullAt */
  fullAt?: number;

  /** Minimum opacity when ratio is 0 (desktop vs real mobile) */
  baseMinDesktop?: number;
  baseMinMobile?: number;

  /** Threshold count (20 => 21 thresholds). Keep small to reduce callback spam */
  thresholdSteps?: number;
};

export function useOpacityObserver({
  targetRef,
  root = null,
  disabled = false,
  fullAt = 0.75,
  baseMinDesktop = 0.3,
  baseMinMobile = 0.1,
  thresholdSteps = 20,
}: Options) {
  const isRealMobile = useRealMobileViewport();

  const thresholds = useMemo(() => {
    const steps = Math.max(1, Math.min(100, Math.floor(thresholdSteps)));
    return Array.from({ length: steps + 1 }, (_, i) => i / steps);
  }, [thresholdSteps]);

  const baseMin = isRealMobile ? baseMinMobile : baseMinDesktop;

  const lastOpacityRef = useRef<string>(''); // last applied value
  const rafRef = useRef<number | null>(null);
  const pendingOpacityRef = useRef<string | null>(null);

  useEffect(() => {
    const el = targetRef.current;
    if (!el) return;

    const commitOpacity = (value: string) => {
      pendingOpacityRef.current = value;
      if (rafRef.current != null) return;

      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;

        const next = pendingOpacityRef.current;
        pendingOpacityRef.current = null;
        if (next == null) return;

        if (lastOpacityRef.current === next) return;
        lastOpacityRef.current = next;
        el.style.opacity = next;
      });
    };

    // disabled => force visible, no observer
    if (disabled) {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      pendingOpacityRef.current = null;

      if (lastOpacityRef.current !== '1') {
        lastOpacityRef.current = '1';
        el.style.opacity = '1';
      }
      return;
    }

    // Guard against weird settings
    const clampedFullAt = Math.max(0.05, Math.min(1, fullAt));
    const clampedBaseMin = Math.max(0, Math.min(0.999, baseMin));

    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        const ratio = entry?.intersectionRatio ?? 0;

        if (ratio >= clampedFullAt) {
          commitOpacity('1');
          return;
        }

        const mapped = clampedBaseMin + (ratio / clampedFullAt) * (1 - clampedBaseMin);

        // limit float noise so we don't spam updates
        const next = String(Math.max(clampedBaseMin, Math.min(1, mapped)).toFixed(3));
        commitOpacity(next);
      },
      { threshold: thresholds, root }
    );

    io.observe(el);

    // Ensure a sane starting value
    commitOpacity('1');

    return () => {
      io.disconnect();
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      pendingOpacityRef.current = null;
    };
  }, [targetRef, root, disabled, thresholds, baseMin, fullAt]);
}