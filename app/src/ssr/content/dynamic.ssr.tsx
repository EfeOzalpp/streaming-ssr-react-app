// src/ssr/projects/dynamic.ssr.tsx
import type { SsrDescriptor } from '../types';
import { getProjectData } from '../../services/sanity/get-project-data';

type SvgDoc = { title?: string; file?: { asset?: { url?: string } } };
type SvgMap = Record<'laptop' | 'tablet' | 'phone', string | undefined>;

export const dynamicSSR: SsrDescriptor = {
  fetch: async (): Promise<SvgMap> => {
    const rows = (await getProjectData<SvgDoc[]>('dynamic-frame')) ?? [];
    const byTitle = Object.fromEntries(
      rows.map(r => [String(r.title || '').toLowerCase(), r.file?.asset?.url])
    ) as Record<string, string | undefined>;

    return {
      laptop: byTitle['laptop'],
      tablet: byTitle['tablet'],
      phone : byTitle['phone'],
    };
  },

  render: (svgMap: SvgMap) => {
    const laptop = svgMap.laptop ?? undefined;
    const tablet = svgMap.tablet ?? undefined;
    const phone  = svgMap.phone  ?? undefined;
    const fallback = laptop ?? tablet ?? phone;

    return (
      <section className="block-type-a tooltip-dynamic">
        <div className="device-wrapper">
          {fallback && (
            <picture>
              {phone  ? <source media="(max-width: 767.98px)" srcSet={phone} /> : null}
              {tablet ? <source media="(min-width: 768px) and (max-width: 1025px)" srcSet={tablet} /> : null}
              <img
                id="dynamic-device-frame"
                src={fallback}
                alt="device"
                className="device-frame"
                decoding="async"
                loading="eager"
                draggable={false}
              />
            </picture>
          )}
          <div className="screen-overlay" />
        </div>
      </section>
    );
  },

  // Tell the server how to build preloads for the first project
  buildPreloads: (svgMap: SvgMap) => {
    const links: string[] = [];
    const push = (u?: string) => { if (u) links.push(`<link rel="preload" as="image" href="${u}">`); };
    push(svgMap.phone);
    push(svgMap.tablet);
    push(svgMap.laptop);
    return links;
  },

  criticalCssFiles: ['src/styles/block-type-a.css'],
};
