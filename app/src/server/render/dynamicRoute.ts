// src/server/render/dynamicRoute.ts
import { renderToString } from 'react-dom/server';
import { routeRegistry } from '../../ssr/route-registry';
import { buildCriticalCss } from '../cssPipeline';
import { buildDynamicImagePreloads, readFontCss } from '../assets';
import { getEphemeralSeed } from '../seed';

export interface DynamicRouteData {
  dynamicPreload: any;
  dynamicSeed: number;
  dynamicSnapshotHtml: string;
  dynamicPreloadLinks: string[];
  extraCriticalCss: string;
  fontsCss: { rubikCss: string; orbitronCss: string; poppinsCss: string; epilogueCss: string };
}

/**
 * Prepares all data for the /dynamic-theme render path.
 * Returns null if the route descriptor is missing or invalid — caller should 500.
 */
export async function prepareDynamicRender(querySeed?: number): Promise<DynamicRouteData | null> {
  const desc = routeRegistry['dynamic-theme'];
  if (!desc || typeof desc.render !== 'function' || typeof desc.fetch !== 'function') {
    return null;
  }

  const dynamicSeed = Number.isFinite(querySeed) ? (querySeed as number) : getEphemeralSeed().seed;
  const doFetch = desc.fetch as (seed?: number) => Promise<any>;
  const dynamicPreload = await doFetch(dynamicSeed);

  const dynamicPreloadLinks = buildDynamicImagePreloads(dynamicPreload?.images || [], 8);

  // Render a synchronous HTML snapshot for above-the-fold paint
  const sectionNode = desc.render(dynamicPreload);
  const dynamicSnapshotHtml = renderToString(sectionNode);

  // Dynamic theme only uses Rubik + Orbitron; drop Poppins/Epilogue
  const allFonts = readFontCss();
  const fontsCss = {
    rubikCss: allFonts.rubikCss,
    orbitronCss: allFonts.orbitronCss,
    poppinsCss: '',
    epilogueCss: '',
  };

  const files = desc.criticalCssFiles ?? [];
  let extraCriticalCss = '';
  if (files.length > 0) {
    try {
      extraCriticalCss = await buildCriticalCss(files);
    } catch {
      // silent — non-critical CSS failure shouldn't break the response
    }
  }

  return { dynamicPreload, dynamicSeed, dynamicSnapshotHtml, dynamicPreloadLinks, extraCriticalCss, fontsCss };
}
