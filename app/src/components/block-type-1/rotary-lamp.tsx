// src/components/block-type-1/rotary-lamp.tsx
import { useEffect, useRef, useState } from 'react';
import { getProjectData } from '../../services/sanity/get-project-data';
import SplitDragHandler from '../general-ui/split-feature/split-controller';
import PannableMedia from '../../services/media/useMediaPannable';
import MediaLoader from '../../services/media/useMediaLoader';
import { useTooltipInit } from '../general-ui/tooltip/tooltipInit';
import {
  applySplitStyle,
  getPortraitMinSplit,
} from '../general-ui/split-feature/split-pre-hydration';
import '../../styles/block-type-1.css';

type MediaSlot = { alt?: string; image?: any; video?: { asset?: { url?: string } } };
type RotaryData = { mediaOne: MediaSlot; mediaTwo: MediaSlot };

export default function RotaryLamp() {
  const [data, setData] = useState<RotaryData | null>(null);
  const [split, setSplit] = useState(() => (window.innerWidth < 768 ? 55 : 50));
  const [isPortrait, setIsPortrait] = useState(window.innerHeight > window.innerWidth);

  useTooltipInit();

  // Keep IDs identical to SSR enhancer so applySplitStyle works the same everywhere
  const ids = useRef({ m1: 'rotary-media-1-container', m2: 'rotary-media-2-container' }).current;

  useEffect(() => {
    getProjectData<RotaryData>('rotary-lamp').then((d) => setData(d));
  }, []);

  // Track portrait/landscape (same notion as SSR enhancer)
  useEffect(() => {
    const onResize = () => setIsPortrait(window.innerHeight > window.innerWidth);
    window.addEventListener('resize', onResize, { passive: true });
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);

  // Drive layout through the shared imperative function (same as SSR path)
  useEffect(() => {
    const vw = window.innerWidth;
    const minPortrait = getPortraitMinSplit(vw);
    applySplitStyle(split, isPortrait, ids, minPortrait);
  }, [split, isPortrait, ids]);

  if (!data) return null;

  // Keep the same media swap semantics you had:
  // swap media in landscape, keep original order in portrait
  const media1 = isPortrait ? data.mediaOne : data.mediaTwo;
  const media2 = isPortrait ? data.mediaTwo : data.mediaOne;

  return (
    <section className="block-type-1" id="no-ssr" style={{ position: 'relative', width: '100%', overflow: 'hidden' }}>
      {/* LEFT / TOP container (layout handled by applySplitStyle) */}
      <div id={ids.m1} className="media-content-1" style={{ position: 'absolute' }}>
        <PannableMedia sensitivity={2}>
          <MediaLoader
            type="image"
            src={media2.image}
            alt={media2.alt || 'Rotary Lamp media'}
            id="rotary-media-1"
            className="media-item-1 tooltip-rotary-lamp"
            style={{ width: '100%', height: '100%' }}
          />
        </PannableMedia>
      </div>

      {/* Split handle */}
      <SplitDragHandler
        split={split}
        setSplit={setSplit}
        ids={{ m1: ids.m1, m2: ids.m2 }}
      />

      {/* RIGHT / BOTTOM container (layout handled by applySplitStyle) */}
      <div id={ids.m2} className="media-content-2" style={{ position: 'absolute' }}>
        <PannableMedia sensitivity={2}>
          <MediaLoader
            type="image"
            src={media1.image}
            alt={media1.alt || 'Rotary Lamp media'}
            id="rotary-media-2"
            className="media-item-2 tooltip-rotary-lamp"
            style={{ width: '100%', height: '100%' }}
          />
        </PannableMedia>
      </div>
    </section>
  );
}