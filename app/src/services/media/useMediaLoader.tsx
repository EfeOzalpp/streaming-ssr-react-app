// src/services/media/useMediaLoader.tsx
import { useRef, useState, useEffect, useMemo } from 'react';
import { useVideoVisibility } from '../../behaviors/useVideoObserver';
import LoadingScreen from '../../state/loading';
import { SanityImageSource } from '@sanity/image-url/lib/types/types';
import {
  getLowResImageUrl,
  getMediumImageUrl,
  getHighQualityImageUrl,
  urlFor,
} from './image-builder';
import {
  registerImage,
  notifyLowResLoaded,
  onAllLowResLoaded,
} from './image-upgrade-manager';

import { IMAGE_PRESET, type ImagePreset } from './media-presets';

function useNearViewport<T extends Element>(
  ref: React.RefObject<T>,
  { rootMargin = '900px 0px', threshold = 0, once = true } = {}
) {
  const [near, setNear] = useState(false);
  useEffect(() => {
    if (!ref.current || near) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true);
          if (once) io.disconnect();
        }
      },
      { rootMargin, threshold }
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, [ref, near, rootMargin, threshold, once]);
  return near;
}

type VideoSetSrc = {
  webmUrl?: string;
  mp4Url?: string;
  poster?: SanityImageSource | string;
};

type MediaLoaderProps = {
  type: 'image' | 'video';
  src: string | SanityImageSource | VideoSetSrc | null | undefined;
  alt?: string;
  id?: string;
  className?: string;
  style?: React.CSSProperties;
  objectPosition?: string;
  loop?: boolean;
  muted?: boolean;
  playsInline?: boolean;
  preload?: 'auto' | 'metadata' | 'none';
  enableVisibilityControl?: boolean;
  priority?: boolean;
  controls?: boolean;

  /**
   *  Image preset
   * - default: current behavior (large media okay)
   * - thumb: UI cards / dense grids (caps sizes + disables auto-high wave)
   */
  imagePreset?: ImagePreset;

  // Optional image tuning (Sanity objects + Sanity CDN string URLs)
  // If provided, these override the preset values.
  imgLowWidth?: number;
  imgLowQuality?: number;
  imgMediumWidth?: number;
  imgMediumQuality?: number;
  imgHighWidth?: number;
  imgHighQuality?: number;

  // Optional hover “ultra” upgrade (preloaded, then swapped)
  hovered?: boolean;
  imgHoverWidth?: number;
  imgHoverQuality?: number;
};

function isSanityCdnImageUrl(u: string) {
  return u.includes('cdn.sanity.io/images/');
}

function withSanityParams(src: string, w: number, q: number): string {
  if (!isSanityCdnImageUrl(src)) return src;

  try {
    const url = new URL(src);
    url.searchParams.set('w', String(w));
    url.searchParams.set('q', String(q));
    url.searchParams.set('auto', 'format');
    return url.toString();
  } catch {
    try {
      const url = new URL(
        src,
        typeof window !== 'undefined' ? window.location.href : 'https://cdn.sanity.io/'
      );
      url.searchParams.set('w', String(w));
      url.searchParams.set('q', String(q));
      url.searchParams.set('auto', 'format');
      return url.toString();
    } catch {
      return src;
    }
  }
}

const MediaLoader = ({
  type,
  src,
  alt = '',
  id,
  className = '',
  style = {},
  objectPosition = 'center center',
  loop = true,
  muted = true,
  playsInline = true,
  preload = 'metadata',
  enableVisibilityControl = true,
  priority = false,
  controls = false,

  //  preset selector
  imagePreset = 'default',

  // Caller overrides (if not provided, preset will be used)
  imgLowWidth,
  imgLowQuality,
  imgMediumWidth,
  imgMediumQuality,
  imgHighWidth,
  imgHighQuality,

  hovered = false,
  imgHoverWidth,
  imgHoverQuality = 92,
}: MediaLoaderProps) => {
  const isSSR = typeof window === 'undefined';

  //  Resolve effective tuning
  const preset = IMAGE_PRESET[imagePreset] ?? IMAGE_PRESET.default;

  const effLowW = imgLowWidth ?? preset.imgLowWidth;
  const effLowQ = imgLowQuality ?? preset.imgLowQuality;
  const effMedW = imgMediumWidth ?? preset.imgMediumWidth;
  const effMedQ = imgMediumQuality ?? preset.imgMediumQuality;
  const effHighW = imgHighWidth ?? preset.imgHighWidth;
  const effHighQ = imgHighQuality ?? preset.imgHighQuality;

  const allowAutoHigh = preset.allowAutoHigh;
  const enableHighFallbackTimer = preset.enableHighFallbackTimer;

  const [loaded, setLoaded] = useState(isSSR);
  const [showMedium, setShowMedium] = useState(false);
  const [showHigh, setShowHigh] = useState(false);

  // hover-hires readiness
  const [hoverReady, setHoverReady] = useState(false);

  // Native poster control (no overlay)
  const [posterRemoved, setPosterRemoved] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const isNear = useNearViewport(containerRef);
  const shouldStart = priority || isNear;

  // If already cached, skip fade-in
  useEffect(() => {
    if (type === 'image' && imgRef.current?.complete) setLoaded(true);
    if (type === 'video' && videoRef.current?.readyState >= 2) setLoaded(true);
  }, [type]);

  // Identify "video object" shapes, etc.
  const isVideoSetObj =
    typeof src === 'object' &&
    src !== null &&
    !('asset' in (src as any)) &&
    (('webmUrl' in (src as any)) || ('mp4Url' in (src as any)));

  const vs = isVideoSetObj ? (src as VideoSetSrc) : undefined;
  const legacyVideoUrl = typeof src === 'string' ? src : undefined;

  // Compute image URLs unconditionally (safe; will be unused for video)
  const imageUrls = useMemo(() => {
    const empty = { ultraLow: undefined, medium: undefined, high: undefined, hover: undefined };

    if (type !== 'image' || !src) return empty;

    const hoverW = imgHoverWidth ?? effHighW;

    if (typeof src === 'string') {
      return {
        ultraLow: withSanityParams(src, effLowW, effLowQ),
        medium: withSanityParams(src, effMedW, effMedQ),
        high: withSanityParams(src, effHighW, effHighQ),
        hover: withSanityParams(src, hoverW, imgHoverQuality),
      };
    }

    // Sanity object pipeline
    return {
      ultraLow: getLowResImageUrl(src, effLowW, effLowQ),
      medium: getMediumImageUrl(src, effMedW, effMedQ),
      high: getHighQualityImageUrl(src, effHighW, effHighQ),
      hover: getHighQualityImageUrl(src, hoverW, imgHoverQuality),
    };
  }, [
    type,
    src,
    effLowW,
    effLowQ,
    effMedW,
    effMedQ,
    effHighW,
    effHighQ,
    imgHoverWidth,
    imgHoverQuality,
  ]);

  // IMAGE progressive upgrade
  useEffect(() => {
    if (type !== 'image') return;
    if (!src) return;

    registerImage();

    const w = window as any;
    const ric =
      typeof w.requestIdleCallback === 'function'
        ? w.requestIdleCallback.bind(w)
        : (cb: any) => window.setTimeout(cb, 0);

    const cic =
      typeof w.cancelIdleCallback === 'function'
        ? w.cancelIdleCallback.bind(w)
        : (id: any) => window.clearTimeout(id);

    let id1: any = null;
    let id2: any = null;
    let t2: number | null = null;

    // medium
    if (shouldStart) {
      requestAnimationFrame(() => setShowMedium(true));
    } else {
      id1 = ric(() => setShowMedium(true), { timeout: 2000 });
    }

    // high ( gated to avoid the “thumb grid” decode/raster storm)
    const canHigh = allowAutoHigh || priority;

    if (canHigh) {
      const off = () => {
        id2 = ric(() => setShowHigh(true), { timeout: 1000 });
      };
      onAllLowResLoaded(off);

      if (enableHighFallbackTimer) {
        t2 = window.setTimeout(() => setShowHigh(true), 5000);
      }
    }

    return () => {
      if (id1) cic(id1);
      if (id2) cic(id2);
      if (t2) window.clearTimeout(t2);
    };
  }, [type, src, shouldStart, allowAutoHigh, enableHighFallbackTimer, priority]);

  const onMediaLoaded = () => {
    setLoaded(true);
    if (type === 'image') notifyLowResLoaded();
    if (id) {
      const event = new CustomEvent('mediaReady', { detail: { id } });
      window.dispatchEvent(event);
    }
  };

  // Hover preload (UNCONDITIONAL HOOK, gated inside)
  useEffect(() => {
    if (type !== 'image') {
      setHoverReady(false);
      return;
    }
    if (!hovered) {
      setHoverReady(false);
      return;
    }
    if (!imageUrls.hover) return;

    let cancelled = false;

    const im = new Image();
    im.decoding = 'async';
    im.onload = () => {
      if (!cancelled) setHoverReady(true);
    };
    im.onerror = () => {
      if (!cancelled) setHoverReady(false);
    };
    im.src = imageUrls.hover;

    return () => {
      cancelled = true;
    };
  }, [type, hovered, imageUrls.hover]);

  // ----- Video poster URL -----
  const posterUrl =
    vs?.poster
      ? typeof vs.poster === 'string'
        ? vs.poster
        : urlFor(vs.poster).width(1200).quality(80).auto('format').url()
      : undefined;

  // Keep native poster visible until first painted frame
  useEffect(() => {
    if (type !== 'video' || !videoRef.current) return;
    const v = videoRef.current;

    const hidePoster = () => {
      setPosterRemoved(true);
      v.removeAttribute('poster');
    };

    const onPlay = () => {
      const anyV = v as any;
      if (typeof anyV.requestVideoFrameCallback === 'function') {
        anyV.requestVideoFrameCallback(() => hidePoster());
      } else {
        const onTime = () => {
          if (v.currentTime > 0 && v.readyState >= 2) {
            v.removeEventListener('timeupdate', onTime);
            hidePoster();
          }
        };
        v.addEventListener('timeupdate', onTime);
        const timer = window.setTimeout(() => {
          v.removeEventListener('timeupdate', onTime);
          hidePoster();
        }, 1200);
        return () => window.clearTimeout(timer);
      }
    };

    v.addEventListener('play', onPlay, { once: true });
    return () => v.removeEventListener('play', onPlay);
  }, [type]);

  // VIDEO visibility/autoplay
  useVideoVisibility(videoRef, containerRef, 0.35, type === 'video' && enableVisibilityControl);

  // VIDEO RELIABILITY PATCHES
  useEffect(() => {
    if (type !== 'video' || !videoRef.current) return;
    const v = videoRef.current;

    let retryTimer: number | null = null;
    let promoteTimer: number | null = null;

    const clearTimers = () => {
      if (retryTimer) {
        window.clearTimeout(retryTimer);
        retryTimer = null;
      }
      if (promoteTimer) {
        window.clearTimeout(promoteTimer);
        promoteTimer = null;
      }
    };

    const kickLoad = () => {
      try {
        v.preload = preload ?? 'metadata';
        if (v.preload !== 'none') v.load();
      } catch {}
    };

    const nudgeDecode = () => {
      try {
        if (v.readyState < 2) return;
        const t = v.currentTime;
        v.currentTime = t > 0 ? t : 0.001;
      } catch {}
    };

    const tryPlay = async () => {
      if (!enableVisibilityControl) return;
      try {
        if (v.muted && v.playsInline && v.paused && v.readyState >= 2) {
          await v.play().catch(() => {});
        }
      } catch {}
    };

    const onLoadedMeta = () => {
      setLoaded(true);
      nudgeDecode();
    };

    const onLoadedData = () => {
      setLoaded(true);
      void tryPlay();
    };
    const onCanPlay = () => {
      setLoaded(true);
      void tryPlay();
    };

    if (shouldStart) {
      kickLoad();

      retryTimer = window.setTimeout(() => {
        if (v.readyState < 2) kickLoad();
      }, 2500);

      promoteTimer = window.setTimeout(() => {
        if (v.readyState < 2) {
          try {
            v.preload = 'auto';
            v.load();
          } catch {}
        }
      }, 5000);
    }

    v.addEventListener('loadedmetadata', onLoadedMeta);
    v.addEventListener('loadeddata', onLoadedData);
    v.addEventListener('canplay', onCanPlay);

    const onError = (e: Event) => console.warn('Video error', e);
    const onStalled = () => console.warn('Video stalled');
    const onSuspend = () => {};
    v.addEventListener('error', onError);
    v.addEventListener('stalled', onStalled);
    v.addEventListener('suspend', onSuspend);

    return () => {
      clearTimers();
      v.removeEventListener('loadedmetadata', onLoadedMeta);
      v.removeEventListener('loadeddata', onLoadedData);
      v.removeEventListener('canplay', onCanPlay);
      v.removeEventListener('error', onError);
      v.removeEventListener('stalled', onStalled);
      v.removeEventListener('suspend', onSuspend);
    };
  }, [
    type,
    shouldStart,
    preload,
    enableVisibilityControl,
    isVideoSetObj,
    (vs && vs.webmUrl) || '',
    (vs && vs.mp4Url) || '',
    legacyVideoUrl || '',
  ]);

  const hasVideoSource = Boolean(vs?.webmUrl || vs?.mp4Url || legacyVideoUrl);
  if (!src || (type === 'video' && !hasVideoSource)) return null;

  // ====== IMAGE RENDER ======
  if (type === 'image') {
    const baseSrc = showHigh ? imageUrls.high : showMedium ? imageUrls.medium : imageUrls.ultraLow;

    // only swap to hover image once it’s fully loaded
    const resolvedSrc = hovered && hoverReady ? imageUrls.hover : baseSrc;

    if (!resolvedSrc) return null;

    return (
      <div ref={containerRef} style={{ position: 'relative', width: '100%', height: '100%' }}>
        {!loaded && (
          <div className="absolute-inset">
            <LoadingScreen isFullScreen={false} />
          </div>
        )}
        <img
          ref={imgRef}
          //  Better defaults; priority images still eager
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={hovered || showHigh || priority ? 'high' : showMedium ? 'auto' : 'low'}
          id={id}
          src={resolvedSrc || undefined}
          alt={alt}
          onLoad={onMediaLoaded}
          onError={(e) => console.warn('Image failed', (e.target as HTMLImageElement).src)}
          className={className}
          draggable={false}
          style={{
            ...style,
            objectFit: 'cover',
            objectPosition,
            opacity: loaded ? 1 : 0,
            //  Avoid filter-based raster cost unless you truly need it
            transition: isSSR ? 'none' : 'opacity 0.3s ease',
          }}
        />
      </div>
    );
  }

  // ====== VIDEO RENDER ======
  const showSpinner = !loaded;

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', height: '100%' }}>
      {showSpinner && (
        <div className="absolute-inset">
          <LoadingScreen isFullScreen={false} />
        </div>
      )}

      <video
        id={id}
        ref={videoRef}
        onLoadedData={onMediaLoaded}
        onLoadedMetadata={() => setLoaded(true)}
        onError={(e) => console.warn('Video failed', e)}
        className={className}
        style={{
          ...style,
          objectFit: 'cover',
          objectPosition,
          opacity: loaded ? 1 : 0,
          transition: isSSR ? 'none' : 'opacity 0.3s ease',
          pointerEvents: 'all',
          zIndex: 1,
        }}
        loop={loop}
        muted={muted}
        playsInline={playsInline}
        preload={preload ?? 'metadata'}
        controls={controls}
        poster={posterRemoved ? undefined : posterUrl}
      >
        {vs?.mp4Url && <source src={vs.mp4Url || undefined} type="video/mp4" />}
        {vs?.webmUrl && <source src={vs.webmUrl || undefined} type="video/webm" />}
        {!vs?.webmUrl && !vs?.mp4Url && legacyVideoUrl && (
          <source src={legacyVideoUrl || undefined} />
        )}
      </video>
    </div>
  );
};

export default MediaLoader;