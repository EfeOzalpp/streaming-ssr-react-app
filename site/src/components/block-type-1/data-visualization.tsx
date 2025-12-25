import { useEffect, useState } from 'react';
import client from '../../utils/sanity';
import MediaLoader from '../../utils/media-providers/media-loader';
import PannableViewport from '../../utils/split+drag/pannable-object-position';
import { useTooltipInit } from '../../utils/tooltip/tooltipInit';
import { useSsrData } from '../../utils/context-providers/ssr-data-context';
import { getHighQualityImageUrl } from '../../utils/media-providers/image-builder';
import '../../styles/block-type-1.css';

type VideoSet = { webmUrl?: string; mp4Url?: string; poster?: any };
type MediaSlot = { alt?: string; image?: any; video?: VideoSet };
type DataVizData = { mediaOne: MediaSlot };

export default function DataVisualizationBlock() {
  const ssrData = useSsrData();
  const [data, setData] = useState<DataVizData | null>(
    (ssrData?.preloaded?.dataviz as DataVizData) || null
  );

  useTooltipInit();

  useEffect(() => {
    if (data) return;
    client
      .fetch<DataVizData>(
        `*[_type == "mediaBlock" && slug.current == $slug][0]{
          mediaOne{
            alt,
            image,
            video{
              "webmUrl": webm.asset->url,
              "mp4Url": mp4.asset->url,
              poster
            }
          }
        }`,
        { slug: 'data-viz' }
      )
      .then(setData)
      .catch((err) => {
        console.warn('[DataVisualizationBlock] GROQ fetch failed:', err);
        setData(null);
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!data?.mediaOne) return null;

  const { alt = 'Data Visualization', image, video } = data.mediaOne;
  const isVideo = Boolean(video?.webmUrl || video?.mp4Url);
  const highPoster = video?.poster
    ? getHighQualityImageUrl(video.poster, 1920, 90)
    : undefined;

  return (
    <section
      className="block-type-1"
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
        <PannableViewport sensitivity={2}>
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
        </PannableViewport>
      </div>
    </section>
  );
}
