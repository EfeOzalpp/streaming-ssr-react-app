// src/ssr/project/dataviz.ssr.tsx
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

    // Default SSR paint uses mediaOne (since SSR doesn't know viewport)
    const posterMediumH = v1.poster ? getMediumImageUrl(v1.poster) : undefined;
    const posterHighH = v1.poster ? getHighQualityImageUrl(v1.poster, 1920, 90) : undefined;

    // Also compute vertical (mediaTwo) posters if present
    const posterMediumV = v2.poster ? getMediumImageUrl(v2.poster) : undefined;
    const posterHighV = v2.poster ? getHighQualityImageUrl(v2.poster, 1920, 90) : undefined;

    // If there's no poster at all, you can still SSR the video tag, but
    // your previous code gated on posterMedium. We'll keep that behavior.
    if (!posterMediumH) return null;

    return (
      <section
        id="dataviz-ssr"
        className="block-type-1"
        style={{
          position: 'relative',
          width: '100%',
          overflow: 'hidden',
        }}
      >
        <div
          id="dataviz-media-container"
          className="media-content"
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
          }}
        >
          <PannableMedia sensitivity={2}>
            <video
              id="dataviz-media-video"
              className="tooltip-data-viz"
              poster={posterMediumH}
              // horizontal (mediaOne)
              data-h-webm={v1.webmUrl || ''}
              data-h-mp4={v1.mp4Url || ''}
              data-h-poster-med={posterMediumH || ''}
              data-h-poster-full={posterHighH || ''}
              // vertical (mediaTwo)
              data-v-webm={v2.webmUrl || ''}
              data-v-mp4={v2.mp4Url || ''}
              data-v-poster-med={posterMediumV || ''}
              data-v-poster-full={posterHighV || ''}
              // Keep your previous high-res upgrade hook too (enhancer overwrites as needed)
              {...(posterHighH ? { 'data-src-full': posterHighH } : {})}
              muted
              playsInline
              loop
              preload="auto"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: '50% 0%',
                display: 'block',
              }}
            >
              {/* Default SSR sources = mediaOne */}
              {v1.webmUrl && <source src={v1.webmUrl} type="video/webm" />}
              {v1.mp4Url && <source src={v1.mp4Url} type="video/mp4" />}
            </video>
          </PannableMedia>
        </div>
      </section>
    );
  },
  criticalCssFiles: ['src/styles/block-type-1.css'],
};
