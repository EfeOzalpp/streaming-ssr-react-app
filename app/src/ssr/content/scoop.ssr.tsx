// src/ssr/projects/scoop.ssr.tsx
import type { SsrDescriptor } from '../types';
import { getProjectData } from '../../services/sanity/get-project-data';
import {
  getMediumImageUrl,
  getHighQualityImageUrl,
} from '../../services/media/image-builder';
import PannableMedia from '../../services/media/useMediaPannable';

export const scoopSSR: SsrDescriptor = {
  fetch: () => getProjectData('ice-scoop'),
  render: (data) => {
    const m1 = data?.mediaOne || {};
    const m2 = data?.mediaTwo || {};

    // LEFT / TOP media (image only)
    const m1Medium =
      m1?.image
        ? getMediumImageUrl(m1.image)
        : (m1?.imageUrl as string | undefined);
    const m1High =
      m1?.image
        ? getHighQualityImageUrl(m1.image, 1920, 90)
        : (m1?.imageUrl as string | undefined);

    // RIGHT / BOTTOM media (video always)
    const m2PosterMedium = m2?.video?.poster
      ? getMediumImageUrl(m2.video.poster)
      : undefined;

    const m2PosterHigh = m2?.video?.poster
      ? getHighQualityImageUrl(m2.video.poster, 1920, 90)
      : undefined;

    return (
      <section
        id="scoop-ssr"
        className="block-type-1 ssr-initial-split"
        style={{
          position: 'relative',
          width: '100%',
          overflow: 'hidden',
        }}
      >
        {/* LEFT / TOP container */}
        <div
          id="scoop-media-1-container"
          className="media-content-1"
          style={{ position: 'absolute' }}
        >
          {m1Medium && (
            <PannableMedia sensitivity={2}>
              <img
                id="icecream-media-1"
                className="media-item-1 tooltip-ice-scoop"
                src={m1Medium}
                {...(m1High ? { 'data-src-full': m1High } : {})}
                alt={m1?.alt ?? 'Ice Cream Scoop media'}
                draggable={false}
                decoding="async"
                fetchPriority="high"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                }}
              />
            </PannableMedia>
          )}
        </div>

        {/* SPLITTER mount point */}
        <div id="scoop-enhancer-mount" />

        {/* RIGHT / BOTTOM container (video always) */}
        <div
          id="scoop-media-2-container"
          className="media-content-2"
          style={{ position: 'absolute' }}
        >
          {m2PosterMedium && (
            <PannableMedia sensitivity={2}>
              <video
                id="icecream-media-2"
                className="media-item-2 tooltip-ice-scoop"
                poster={m2PosterMedium}
                {...(m2PosterHigh ? { 'data-src-full': m2PosterHigh } : {})}
                muted
                playsInline
                loop
                preload="auto"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                }}
              >
                {m2?.video?.webmUrl && (
                  <source src={m2.video.webmUrl} type="video/webm" />
                )}
                {m2?.video?.mp4Url && (
                  <source src={m2.video.mp4Url} type="video/mp4" />
                )}
              </video>
            </PannableMedia>
          )}
        </div>
      </section>
    );
  },
  criticalCssFiles: ['src/styles/block-type-1.css'],
};
