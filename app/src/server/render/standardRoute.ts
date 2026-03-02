// src/server/render/standardRoute.ts
import { ssrRegistry } from '../../ssr/registry';
import { prepareSsrData } from '../prepareSsrData';
import { buildCriticalCss } from '../cssPipeline';
import { buildPreloadLinks, readFontCss } from '../assets';

export interface StandardRouteData {
  ssrPayload: { seed: number; preloaded: Record<string, any>; preloadLinks: string[] };
  preloadLinks: string[];
  extraCriticalCss: string;
  fontsCss: { rubikCss: string; orbitronCss: string; poppinsCss: string; epilogueCss: string };
}

export async function prepareStandardRoute(seed: number): Promise<StandardRouteData> {
  const ssrPayload = await prepareSsrData(seed);

  const firstKey = Object.keys(ssrPayload.preloaded || {})[0];
  const firstData = firstKey ? ssrPayload.preloaded[firstKey] : null;
  const preloadLinks = buildPreloadLinks(firstData);

  const keys = Object.keys(ssrPayload.preloaded || {}).slice(0, 3);
  const allFiles = keys.flatMap((k) => ssrRegistry[k]?.criticalCssFiles ?? []);
  const uniqueFiles = Array.from(new Set(allFiles));
  let extraCriticalCss = '';
  if (uniqueFiles.length > 0) {
    try {
      extraCriticalCss = await buildCriticalCss(uniqueFiles);
    } catch {
      // silent — non-critical CSS failure shouldn't break the response
    }
  }

  const fontsCss = readFontCss();

  return { ssrPayload, preloadLinks, extraCriticalCss, fontsCss };
}
