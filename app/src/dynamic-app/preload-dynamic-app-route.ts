// src/dynamic-app/preload-dynamic-app-route.ts
import fetchSVGIcons from './lib/fetchSVGIcons';
import { fetchImages } from './lib/fetchUser';

export type DynThemeCache = {
  icons?: Record<string, string>;
  images?: any[];
  seed?: number; // informational only
};

type IconLike = { title?: string; icon?: string; url?: string };

let cache: DynThemeCache = {};
let inFlight: Promise<DynThemeCache> | null = null;

export function getPreloadedDynamicTheme(): DynThemeCache {
  return cache;
}

export function primeDynamicThemeFromSSR(data?: Partial<DynThemeCache>) {
  if (!data) return;
  cache = { ...cache, ...data };
}

export async function whenDynamicThemePreloadReady(): Promise<DynThemeCache> {
  if (cache.icons && cache.images) return cache;
  if (inFlight) {
    await inFlight;
    return cache;
  }
  return cache;
}

function toIconMap(list: IconLike[]): Record<string, string> {
  return (list || []).reduce((acc, it) => {
    if (!it?.title) return acc;
    const val = it.icon ?? it.url;
    if (typeof val === 'string' && val.length > 0) acc[it.title] = val;
    return acc;
  }, {} as Record<string, string>);
}

export async function ensureDynamicThemeIcons(): Promise<Record<string, string>> {
  if (!cache.icons && inFlight) {
    await inFlight;
    return cache.icons || {};
  }
  if (cache.icons) return cache.icons;

  let iconsRaw: unknown = [];
  try { iconsRaw = await fetchSVGIcons(); } catch {}
  const list = Array.isArray(iconsRaw) ? (iconsRaw as IconLike[]) : [];
  const icons = toIconMap(list);
  cache.icons = icons;
  return icons;
}

/**
 * IMPORTANT: no seeding/reshuffle here.
 * If SSR provided images, we keep them as-is.
 * If not, we fetch and keep the API order.
 */
export async function ensureDynamicThemeImages(): Promise<any[]> {
  if (!cache.images && inFlight) {
    await inFlight;
    return cache.images || [];
  }
  if (cache.images) return cache.images;

  let imagesRaw: unknown = [];
  try { imagesRaw = await fetchImages(); } catch {}
  const images = Array.isArray(imagesRaw) ? (imagesRaw as any[]) : [];
  cache.images = images;
  return cache.images;
}

export async function ensureDynamicThemePreload(): Promise<DynThemeCache> {
  if (cache.icons && cache.images) return cache;
  if (inFlight) return inFlight;

  inFlight = Promise
    .all([ensureDynamicThemeIcons(), ensureDynamicThemeImages()])
    .then(([icons, images]) => {
      cache = { ...cache, icons, images };
      return cache;
    })
    .finally(() => { inFlight = null; });

  return inFlight;
}

/* ---- hydrate from SSR bootstrap (window.__DYNAMIC_THEME_PRELOAD__) ---- */
declare global {
  interface Window {
    __DYNAMIC_THEME_PRELOAD__?: DynThemeCache;
  }
}
if (typeof window !== 'undefined' && (window as any).__DYNAMIC_THEME_PRELOAD__) {
  primeDynamicThemeFromSSR((window as any).__DYNAMIC_THEME_PRELOAD__);
}
