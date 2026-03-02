// src/server/render/buildRenderHead.ts
import { loadManifestIfAny } from '../assets';
import { buildHtmlOpen, buildHtmlClose } from '../html';
import type { StandardRouteData } from './standardRoute';
import type { DynamicRouteData } from './dynamicRoute';

interface ExtractorLike {
  getLinkTags: () => string;
  getStyleTags: () => string;
  getScriptTags: () => string;
}

export interface BuildRenderHeadOpts {
  IS_DEV: boolean;
  routePath: string;
  ASSET_MANIFEST: string;
  extractor: ExtractorLike;
  emotionStyleTags: string;
  isDynamicTheme: boolean;
  routeData: StandardRouteData | DynamicRouteData;
}

export function buildRenderHead(opts: BuildRenderHeadOpts): { htmlOpen: string; htmlClose: string } {
  const { IS_DEV, routePath, ASSET_MANIFEST, extractor, emotionStyleTags, isDynamicTheme, routeData } = opts;

  const manifest = loadManifestIfAny(IS_DEV, ASSET_MANIFEST);
  const iconSvg = '/freshmedia-icon.svg';
  const iconIco = !IS_DEV && manifest?.files?.['favicon.ico'] ? manifest.files['favicon.ico'] : '/favicon.ico';

  // Dynamic theme: drop CRA stylesheet <link> tags but keep JS preloads
  const rawLinkTags = extractor.getLinkTags();
  const extractorLinkTags = isDynamicTheme
    ? rawLinkTags.replace(/<link[^>]+rel=["']stylesheet["'][^>]*>/g, '')
    : rawLinkTags;
  const extractorStyleTags = isDynamicTheme ? '' : extractor.getStyleTags();

  const scriptTags = extractor.getScriptTags();
  console.log('[SSR] scriptTags length:', scriptTags.length);

  let preloadLinks: string[];
  let extraCriticalCss: string;
  let fontsCss: { rubikCss: string; orbitronCss: string; poppinsCss: string; epilogueCss: string };
  let ssrPayload: any;
  let dynamicBootstrap = '';
  let injectBeforeRoot = '';

  if (isDynamicTheme) {
    const d = routeData as DynamicRouteData;
    preloadLinks = d.dynamicPreloadLinks;
    extraCriticalCss = d.extraCriticalCss;
    fontsCss = d.fontsCss;
    ssrPayload = { seed: null, preloaded: {}, preloadLinks: [] };
    injectBeforeRoot = d.dynamicSnapshotHtml;
    dynamicBootstrap = `<script>window.__DYNAMIC_PRELOAD__=${JSON.stringify({
      ...(d.dynamicPreload || {}),
      seed: d.dynamicSeed,
    }).replace(/</g, '\\u003c')}</script>`;
  } else {
    const s = routeData as StandardRouteData;
    preloadLinks = s.preloadLinks;
    extraCriticalCss = s.extraCriticalCss;
    fontsCss = s.fontsCss;
    ssrPayload = s.ssrPayload;
  }

  const htmlOpen = buildHtmlOpen({
    IS_DEV,
    routePath,
    iconSvg,
    iconIco,
    preloadLinks,
    fontsCss,
    extractorLinkTags,
    extractorStyleTags,
    emotionStyleTags,
    extraCriticalCss,
    injectBeforeRoot,
  });

  const htmlClose = buildHtmlClose(ssrPayload, scriptTags, dynamicBootstrap);

  return { htmlOpen, htmlClose };
}
