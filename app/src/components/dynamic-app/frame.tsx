// src/components/dynamic-app/frame.tsx
import React, { useEffect, useRef, useState } from 'react';
import client from '../../services/sanity';
import { useDynamicOverlay } from './useDynamicOverlay';
import { useSsrData } from '../../state/providers/ssr-data-context';
import { useRealMobileViewport } from '../../behaviors/useRealMobile';
import LoadingHub from '../../state/loading/loading-hub';
import '../../styles/block-type-a.css';

import { ensureDynamicPreload } from '../../dynamic-app/preload-dynamic-app';
import { urlFor } from '../../services/media/image-builder';
import { useTooltipInit } from '../general-ui/tooltip/tooltipInit'; 

const getDeviceType = (w: number): 'phone' | 'tablet' | 'laptop' =>
  w < 768 ? 'phone' : w < 1025 ? 'tablet' : 'laptop';

const Frame: React.FC = () => {
  const ssrData = useSsrData();
  const preloadedMap = (ssrData?.preloaded?.dynamic as Record<string, string>) || {};
  const [svgMap, setSvgMap] = useState<Record<string, string>>(preloadedMap);
  const [device, setDevice] = useState<'phone' | 'tablet' | 'laptop'>(
    getDeviceType(typeof window !== 'undefined' ? window.innerWidth : 1200)
  );
  const [imgLoaded, setImgLoaded] = useState(false);
  const [fetchErr, setFetchErr] = useState<string | null>(null);

  useTooltipInit();

  const frameRef = useRef<HTMLImageElement>(null);
  const overlaySize = useDynamicOverlay(frameRef);
  const isRealMobile = useRealMobileViewport();

  useEffect(() => {
    const onResize = () => setDevice(getDeviceType(window.innerWidth));
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);

  useEffect(() => {
    if (Object.keys(svgMap).length > 0) return;
    client
      .fetch(
        `*[_type == "svgAsset" && title in ["Laptop", "Tablet", "Phone"]]{
          title, file { asset->{url} }
        }`
      )
      .then((results: any[]) => {
        const map: Record<string, string> = {};
        results.forEach((r: any) => {
          map[r.title.toLowerCase()] = r.file?.asset?.url;
        });
        setSvgMap(map);
      })
      .catch((err) => {
        setFetchErr('assets-unavailable');
        console.warn('[Frame] fetch SVG failed:', err);
      });
  }, [svgMap]);

  const svgUrl = svgMap[device];

  useEffect(() => {
    const img = frameRef.current;
    setImgLoaded(Boolean(img && img.complete && svgUrl));
  }, [svgUrl]);

  // When the frame is in place, warm LOW-QUALITY card images into cache
  const warmedOnce = useRef(false);
  useEffect(() => {
    if (!imgLoaded || warmedOnce.current) return;
    warmedOnce.current = true;

    (async () => {
      try {
        const { images } = await ensureDynamicPreload();
        if (!Array.isArray(images) || images.length === 0) return;

        const WARM_COUNT = 16;
        const LQ_WIDTH = 320;
        const LQ_QUALITY = 25;

        const head = document.head;
        let warmed = 0;

        outer: for (const it of images) {
          const candidates = [it?.image1, it?.image2].filter(Boolean);
          for (const srcAsset of candidates) {
            const src = urlFor(srcAsset)
              .width(LQ_WIDTH)
              .quality(LQ_QUALITY)
              .auto('format')
              .url();

            if (!src) continue;

            if (!document.querySelector(`link[rel="preload"][as="image"][href="${src}"]`)) {
              const link = document.createElement('link');
              link.rel = 'preload';
              link.as = 'image';
              link.href = src;
              link.crossOrigin = 'anonymous';
              link.setAttribute('fetchpriority', 'low');
              head.appendChild(link);
            }

            const preImg = new Image();
            preImg.decoding = 'async';
            preImg.crossOrigin = 'anonymous';
            preImg.src = src;

            warmed += 1;
            if (warmed >= WARM_COUNT) break outer;
          }
        }
      } catch {
        // ignore
      }
    })();
  }, [imgLoaded]);

  return (
    <section className="block-type-a tooltip-dynamic">
      <div className="device-wrapper">
        <img
          ref={frameRef}
          id="dynamic-device-frame"
          src={svgUrl || undefined}
          alt={device}
          className={`device-frame ${device}`}
          decoding="async"
          loading="eager"
          onLoad={() => setImgLoaded(true)}
          onError={() => setImgLoaded(true)}
          draggable={false}
          style={{
            visibility: svgUrl ? 'visible' : 'hidden',
            opacity: imgLoaded && svgUrl ? 1 : 0,
            transition: 'opacity 150ms ease',
          }}
          data-src-laptop={svgMap['laptop'] || ''}
          data-src-tablet={svgMap['tablet'] || ''}
          data-src-phone={svgMap['phone'] || ''}
          data-device={device}
        />

        <div
          className="screen-overlay" 
          style={
            device === 'phone'
              ? {
                  width: `${overlaySize.width}px`,
                  height: isRealMobile
                    ? `${overlaySize.heightSet1}svh`
                    : `${overlaySize.heightSet2}px`,
                }
              : undefined
          }
        >
          <div id="dynamic-overlay-loader">
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
          </div>
        </div>

        {fetchErr && <div className="soft-warning">media frame unavailable</div>}
      </div>
    </section>
  );
};

export default Frame;
