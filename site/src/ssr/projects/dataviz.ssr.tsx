// src/ssr/dataviz.ssr.tsx
import type { SsrDescriptor } from '../types';
import { getProjectData } from '../../utils/get-project-data';
import { getMediumImageUrl, getHighQualityImageUrl } from '../../utils/media-providers/image-builder';
import PannableViewport from '../../utils/split+drag/pannable-object-position';

export const datavizSSR: SsrDescriptor = {
  fetch: () => getProjectData('data-viz'),
  render: (data) => {
    const m1 = data?.mediaOne || {};
    const video = m1.video || {};

    const posterMedium = video.poster ? getMediumImageUrl(video.poster) : undefined;
    const posterHigh = video.poster
      ? getHighQualityImageUrl(video.poster, 1920, 90)
      : undefined;

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
          {posterMedium && (
            <PannableViewport sensitivity={2}>
              <video
                id="dataviz-media-video"
                className="tooltip-data-viz"
                poster={posterMedium}
                {...(posterHigh ? { 'data-src-full': posterHigh } : {})}
                muted
                playsInline
                loop
                preload="auto"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: '50% 50%', // ensures SSR/client match
                  display: 'block',
                }}
              >
                {video.webmUrl && <source src={video.webmUrl} type="video/webm" />}
                {video.mp4Url && <source src={video.mp4Url} type="video/mp4" />}
              </video>
            </PannableViewport>
          )}
        </div>
      </section>
    );
  },
  criticalCssFiles: ['src/styles/block-type-1.css'],
};
