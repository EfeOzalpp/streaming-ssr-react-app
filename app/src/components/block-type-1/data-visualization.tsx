// src/components/block-type-1/data-visualization.tsx
import { useEffect, useState } from 'react';
import { getProjectData } from '../../services/sanity/get-project-data';
import MediaLoader from '../../services/media/useMediaLoader';
import PannableMedia from '../../services/media/useMediaPannable';
import { useTooltipInit } from '../general-ui/tooltip/tooltipInit';
import { getHighQualityImageUrl } from '../../services/media/image-builder';
import '../../styles/block-type-1.css';

type VideoSet = { webmUrl?: string; mp4Url?: string; poster?: any };
type MediaSlot = { alt?: string; image?: any; video?: VideoSet };

type DataVizData = {
  mediaOne?: MediaSlot;
  mediaTwo?: MediaSlot;
};

export default function DataVisualizationBlock() {
  const [data, setData] = useState<DataVizData | null>(null);
  const [isVertical, setIsVertical] = useState(window.innerHeight > window.innerWidth);

  useTooltipInit();

  useEffect(() => {
    getProjectData<DataVizData>('data-viz').then((d) => setData(d));
  }, []);

  useEffect(() => {
    const onResize = () => setIsVertical(window.innerHeight > window.innerWidth);
    window.addEventListener('resize', onResize, { passive: true });
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const selectedMedia = isVertical && data?.mediaTwo ? data.mediaTwo : data?.mediaOne;
  if (!selectedMedia) return null;

  const { alt = 'Data Visualization', image, video } = selectedMedia;
  const isVideo = Boolean(video?.webmUrl || video?.mp4Url);

  const highPoster = video?.poster
    ? getHighQualityImageUrl(video.poster, 1920, 90)
    : undefined;

  return (
    <section
      className="block-type-1"
      id="no-ssr"
      style={{ position: 'relative', width: '100%', height: '100dvh', overflow: 'hidden' }}
    >
      <div
        className="media-content"
        style={{
          width: '100%',
          height: '100%',
          position: 'absolute',
          inset: 0,
        }}
      >
        <PannableMedia sensitivity={2}>
          <MediaLoader
            type={isVideo ? 'video' : 'image'}
            src={isVideo ? (video as VideoSet) : image}
            alt={alt}
            id={isVideo ? 'dataviz-media-video' : 'dataviz-media'}
            {...(highPoster ? { 'data-src-full': highPoster } : {})}
            className="tooltip-data-viz"
            objectPosition="center center"
            style={{ width: '100%', height: '100%' }}
            // priority // uncomment if this is the hero
          />
        </PannableMedia>
      </div>
    </section>
  );
}
