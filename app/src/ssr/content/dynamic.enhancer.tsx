// src/ssr/projects/dynamic.enhancer.tsx
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDynamicOverlay } from '../../components/dynamic-app/useDynamicOverlay';
import { useRealMobileViewport } from '../../behaviors/useRealMobile';
import LoadingHub from '../../state/loading/loading-hub';
import { useTooltipInit } from '../../components/general-ui/tooltip/tooltipInit';

// add: shared cache/dedupe + URL builder for LQ warm
import { ensureDynamicPreload } from '../../dynamic-app/preload-dynamic-app';
import { urlFor } from '../../services/media/image-builder';

type ShadowInboundProps = { onFocusChange?: (f: boolean) => void; onReady?: () => void };
type ShadowInboundType = React.ComponentType<ShadowInboundProps>;

function scheduleIdle(cb: () => void, timeout = 2000): () => void {
  const w = window as any;
  if (typeof w.requestIdleCallback === 'function') {
    const id = w.requestIdleCallback(cb, { timeout });
    return () => w.cancelIdleCallback?.(id);
  }
  const t = window.setTimeout(cb, timeout);
  return () => window.clearTimeout(t);
}

// module-level dedupe so warm only runs once per page load
let warmedOnce = false;
function warmDynamicLowQuality(maxUrls = 32) {
  if (warmedOnce) return;
  warmedOnce = true;

  (async () => {
    try {
      const { images } = await ensureDynamicPreload(); // deduped at source
      if (!Array.isArray(images) || images.length === 0) return;

      // Collect low-quality URLs for both image1 and image2, then cap
      const urls: string[] = [];
      for (const it of images) {
        const s1 = it?.image1 ? urlFor(it.image1).width(320).quality(35).auto('format').url() : null;
        const s2 = it?.image2 ? urlFor(it.image2).width(320).quality(35).auto('format').url() : null;
        if (s1) urls.push(s1);
        if (s2) urls.push(s2);
        if (urls.length >= maxUrls) break;
      }

      const head = document.head;
      const seen = new Set<string>();

      for (const src of urls) {
        if (!src || seen.has(src)) continue;
        seen.add(src);

        // <link rel="preload" as="image"> (avoid duplicates)
        if (!document.querySelector(`link[rel="preload"][as="image"][href="${src}"]`)) {
          const link = document.createElement('link');
          link.rel = 'preload';
          link.as = 'image';
          link.href = src;
          link.crossOrigin = 'anonymous';
          // TS-safe way to hint priority
          link.setAttribute('fetchpriority', 'low');
          head.appendChild(link);
        }

        // Kick actual network regardless of preload support
        const img = new Image();
        img.decoding = 'async';
        img.crossOrigin = 'anonymous';
        img.src = src;
      }
    } catch {
      /* ignore warm errors */
    }
  })();
}

const DynamicEnhancer: React.FC = () => {
  // find SSR nodes
  const frameRef = useRef<HTMLElement | null>(null);
  const [overlayEl, setOverlayEl] = useState<HTMLElement | null>(null);

  useTooltipInit();

  useLayoutEffect(() => {
    const img = document.getElementById('dynamic-device-frame') as HTMLElement | null;
    frameRef.current = img;
    const overlay = img?.closest('.device-wrapper')?.querySelector('.screen-overlay') as HTMLElement | null;
    setOverlayEl(overlay ?? null);
  }, []);

  // overlay sizing
  const overlaySize = useDynamicOverlay(frameRef);
  const isRealMobile = useRealMobileViewport();

  useEffect(() => {
    if (!overlayEl) return;
    const isPhone = window.matchMedia('(max-width: 767.98px)').matches;

    if (isPhone) {
      overlayEl.style.width = `${overlaySize.width}px`;
      overlayEl.style.height = isRealMobile
        ? `${overlaySize.heightSet2}px`
        : `${overlaySize.heightSet1}svh`;
    } else {
      overlayEl.style.removeProperty('width');
      overlayEl.style.removeProperty('height');
    }
  }, [overlayEl, overlaySize.width, overlaySize.heightSet1, overlaySize.heightSet2, isRealMobile]);

  // prewarm low-quality images (SSR path needs this; client-only path will no-op thanks to warmedOnce)
  useEffect(() => {
    // Gate by visibility with idle fallback, same as mounting
    const container = document.getElementById('block-dynamic');
    let cancelIdle: (() => void) | null = null;
    let io: IntersectionObserver | null = null;

    const run = () => warmDynamicLowQuality(32);

    if (!container || typeof IntersectionObserver === 'undefined') {
      // No IO → just warm on idle
      cancelIdle = scheduleIdle(run, 500);
    } else {
      io = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting) {
            run();
            io?.disconnect();
          }
        },
        { root: null, rootMargin: '600px 0px', threshold: 0 }
      );
      io.observe(container);
      // backstop so we still warm if user never scrolls
      cancelIdle = scheduleIdle(run, 1200);
    }

    return () => {
      io?.disconnect();
      cancelIdle?.();
    };
  }, []);

  // gate mounting of shadow app
  const [shouldMountShadow, setShouldMountShadow] = useState(false);

  useEffect(() => {
    const container = document.getElementById('block-dynamic');
    if (!container) { setShouldMountShadow(true); return; }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.intersectionRatio >= 0.3) {
          setShouldMountShadow(true);
          io.disconnect();
        }
      },
      { threshold: [0, 0.3] }
    );
    io.observe(container);

    const cancel = scheduleIdle(() => setShouldMountShadow(true), 2000);
    return () => { io.disconnect(); cancel(); };
  }, []);

  // ----- lazy import
  const [ShadowInbound, setShadowInbound] = useState<ShadowInboundType | null>(null);

  useEffect(() => {
    if (!shouldMountShadow) return;
    let alive = true;
    import('../../dynamic-app/dynamic-app-shadow.jsx')
      .then(m => { if (alive) setShadowInbound(() => m.default as ShadowInboundType); })
      .catch(err => console.warn('[DynamicEnhancer] shadow import failed:', err));
    return () => { alive = false; };
  }, [shouldMountShadow]);

  // ----- loader visibility
  const [showLoader, setShowLoader] = useState(false); // start hidden until we begin mount
  const watchdogRef = useRef<number | null>(null);

  // when we start mounting, show loader (and arm watchdog)
  useEffect(() => {
    if (!shouldMountShadow) return;
    setShowLoader(true);
    if (watchdogRef.current) window.clearTimeout(watchdogRef.current);
    watchdogRef.current = window.setTimeout(() => {
      // fail-safe: hide after 8s even if onReady never fires
      setShowLoader(false);
      hideSsrSpinner();
    }, 8000);
    return () => {
      if (watchdogRef.current) {
        window.clearTimeout(watchdogRef.current);
        watchdogRef.current = null;
      }
    };
  }, [shouldMountShadow]);

  // listen to global hydrated event (secondary path)
  useEffect(() => {
    const onHydrated = () => {
      setShowLoader(false);
      hideSsrSpinner();
    };
    window.addEventListener('dynamic-app:hydrated', onHydrated as EventListener);
    return () => window.removeEventListener('dynamic-app:hydrated', onHydrated as EventListener);
  }, []);

  const hideSsrSpinner = () => {
    const loader = document.getElementById('dynamic-overlay-loader');
    if (loader) loader.style.display = 'none';
  };

  if (!overlayEl) return null;

  const handleReady = () => {
    setShowLoader(false);
    hideSsrSpinner();
    window.dispatchEvent(new CustomEvent('dynamic-app:hydrated'));
  };

  return createPortal(
    <>
      {showLoader && (
          <LoadingHub
            className="loading-hub--dynamic loading-hub--center"
            keyword="dynamic"
            lines={[
              'Measuring app frame…',
              'Creating shadow root…',
              'Injecting app styles…',
              'Loading SVG icons…',
              'Mounting app shell…',
              'Wiring observers and input…',
            ]}
            minHeight={72}
          />
      )}

      {ShadowInbound && shouldMountShadow && (
        <ShadowInbound onFocusChange={() => {}} onReady={handleReady} />
      )}
    </>,
    overlayEl
  );
};

export default DynamicEnhancer;
