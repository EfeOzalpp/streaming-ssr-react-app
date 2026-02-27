// src/ssr/projects/dataviz.ssr.tsx
import type { SsrDescriptor } from '../types';
import { getProjectData } from '../../services/sanity/get-project-data';
import { getMediumImageUrl, getHighQualityImageUrl } from '../../services/media/image-builder';
import PannableMedia from '../../services/media/useMediaPannable';

export const datavizSSR: SsrDescriptor = {
  fetch: () => getProjectData('data-viz'),
  render: (data) => {
    const m1 = data?.mediaOne || {};
    const v1 = m1.video || {};

    const m2 = data?.mediaTwo || {};
    const v2 = m2.video || {};

    // Horizontal (mediaOne)
    const posterMediumH = v1.poster ? getMediumImageUrl(v1.poster) : undefined;
    const posterHighH = v1.poster ? getHighQualityImageUrl(v1.poster, 1920, 90) : undefined;

    // Vertical (mediaTwo)
    const posterMediumV = v2.poster ? getMediumImageUrl(v2.poster) : undefined;
    const posterHighV = v2.poster ? getHighQualityImageUrl(v2.poster, 1920, 90) : undefined;

    // Keep your old "must have a poster" behavior
    if (!posterMediumH) return null;

    return (
      <section
        id="dataviz-ssr"
        className="block-type-1"
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          overflow: 'hidden',
        }}
      >
        <div
          id="dataviz-media-container"
          className="media-content"
          // Store all srcsets on the container (CSR enhancer reads this)
          data-h-webm={v1.webmUrl || ''}
          data-h-mp4={v1.mp4Url || ''}
          data-h-poster-med={posterMediumH || ''}
          data-h-poster-full={posterHighH || ''}
          data-v-webm={v2.webmUrl || ''}
          data-v-mp4={v2.mp4Url || ''}
          data-v-poster-med={posterMediumV || ''}
          data-v-poster-full={posterHighV || ''}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
          }}
        >
          {/* SSR: poster only (fast + reliable). */}
          <PannableMedia sensitivity={2}>
            <img
              id="dataviz-ssr-poster"
              className="tooltip-data-viz"
              src={posterMediumH}
              alt={m1?.alt ?? 'Data Visualization'}
              draggable={false}
              decoding="async"
              fetchPriority="high"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: '50% 0%',
                display: 'block',
              }}
            />
          </PannableMedia>

          {/* CSR mounts the real MediaLoader(video) here */}
          <div
            id="dataviz-video-mount"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
            }}
          />
        </div>
      </section>
    );
  },
  criticalCssFiles: ['src/styles/block-type-1.css'],
};