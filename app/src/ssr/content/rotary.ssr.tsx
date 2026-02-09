// src/ssr/projects/rotary.ssr.tsx
import type { SsrDescriptor } from '../types';
import { getProjectData } from '../../services/sanity/get-project-data';
import {
  getMediumImageUrl,
  getHighQualityImageUrl,
} from '../../services/media/image-builder';
import PannableMedia from '../../services/media/useMediaPannable';

export const rotarySSR: SsrDescriptor = {
  fetch: () => getProjectData('rotary-lamp'),
  render: (data) => {
    const m1 = data?.mediaOne || {};
    const m2 = data?.mediaTwo || {};

    // Build medium + high URLs safely
    const m1Medium =
      m1?.image ? getMediumImageUrl(m1.image) : (m1?.imageUrl as string | undefined);
    const m1High =
      m1?.image ? getHighQualityImageUrl(m1.image, 1920, 90) : (m1?.imageUrl as string | undefined);

    const m2Medium =
      m2?.image ? getMediumImageUrl(m2.image) : (m2?.imageUrl as string | undefined);
    const m2High =
      m2?.image ? getHighQualityImageUrl(m2.image, 1920, 90) : (m2?.imageUrl as string | undefined);

    return (
      <section
        id="rotary-ssr"
        className="block-type-1 ssr-initial-split"
        style={{
          position: 'relative',
          width: '100%',
          overflow: 'hidden',
        }}
      >
        {/* LEFT / TOP container */}
        <div id="rotary-media-1-container" className="media-content-1" style={{ position: 'absolute' }}>
          {m1Medium && (
            <PannableMedia sensitivity={2}>
              <img
                id="rotary-media-1"
                className="media-item-1 tooltip-rotary-lamp"
                src={m1Medium}
                {...(m1High ? { 'data-src-full': m1High } : {})}
                alt={m1?.alt ?? 'Rotary Lamp media'}
                draggable={false}
                decoding="async"
                fetchPriority="high"
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            </PannableMedia>
          )}
        </div>

        {/* SPLITTER mount point */}
        <div id="rotary-enhancer-mount" />

        {/* RIGHT / BOTTOM container */}
        <div id="rotary-media-2-container" className="media-content-2" style={{ position: 'absolute' }}>
          {m2Medium && (
            <PannableMedia sensitivity={2}>
              <img
                id="rotary-media-2"
                className="media-item-2 tooltip-rotary-lamp"
                src={m2Medium}
                {...(m2High ? { 'data-src-full': m2High } : {})}
                alt={m2?.alt ?? 'Rotary Lamp media'}
                draggable={false}
                decoding="async"
                fetchPriority="high"
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            </PannableMedia>
          )}
        </div>
      </section>
    );
  },
  criticalCssFiles: ['src/styles/block-type-1.css'],
};
