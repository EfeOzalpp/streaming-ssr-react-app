// src/dynamic-app/preload-dynamic-app.ts
import fetchSVGIcons from './lib/fetchSVGIcons';
import { fetchImages } from './lib/fetchUser';

export type Cache = { icons?: Record<string, string>; images?: any[] };

type IconLike = { title?: string; icon?: string; url?: string };

let cache: Cache = {};
let inFlight: Promise<Cache> | null = null;

export function getPreloadedDynamicApp(): Cache {
  return cache;
}

export function primeFromSSR(data?: Partial<Cache>) {
  if (!data) return;
  cache = { ...cache, ...data };
}

function toIconMap(list: IconLike[]): Record<string, string> {
  return list.reduce((acc, it) => {
    if (!it?.title) return acc;
    const val = it.icon ?? it.url; // inline SVG takes precedence; else URL
    if (typeof val === 'string' && val.length > 0) acc[it.title] = val;
    return acc;
  }, {} as Record<string, string>);
}

/** Wait for current preloading (if any), then return cache */
export async function whenDynamicPreloadReady(): Promise<Cache> {
  if (cache.icons && cache.images) return cache;
  if (inFlight) {
    await inFlight;
    return cache;
  }
  return cache;
}

export async function ensureIconsPreload(): Promise<Record<string, string>> {
  // If a full preloading is in-flight, wait for it instead of double-fetching
  if (!cache.icons && inFlight) {
    await inFlight;
    return cache.icons || {};
  }
  if (cache.icons) return cache.icons;

  let iconsRaw: unknown;
  try {
    iconsRaw = await fetchSVGIcons();
  } catch {
    iconsRaw = [];
  }
  const list = Array.isArray(iconsRaw) ? (iconsRaw as IconLike[]) : [];
  const icons = toIconMap(list);
  cache.icons = icons;
  return icons;
}

export async function ensureImagesPreload(): Promise<any[]> {
  // If a full preloading is in-flight, wait for it instead of double-fetching
  if (!cache.images && inFlight) {
    await inFlight;
    return cache.images || [];
  }
  if (cache.images) return cache.images;

  let imagesRaw: unknown;
  try {
    imagesRaw = await fetchImages();
  } catch {
    imagesRaw = [];
  }
  const images = Array.isArray(imagesRaw) ? (imagesRaw as any[]) : [];
  cache.images = images;
  return images;
}

/** Convenience: ensure both icons + images (with in-flight dedupe) */
export async function ensureDynamicPreload(): Promise<Cache> {
  if (cache.icons && cache.images) return cache;
  if (inFlight) return inFlight;

  inFlight = Promise.all([ensureIconsPreload(), ensureImagesPreload()])
    .then(([icons, images]) => {
      cache = { icons, images };
      return cache;
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}

// Optional: hydrate from SSR
declare global {
  interface Window {
    __DYNAMIC_PRELOAD__?: Cache;
  }
}
if (typeof window !== 'undefined' && (window as any).__DYNAMIC_PRELOAD__) {
  primeFromSSR((window as any).__DYNAMIC_PRELOAD__);
}
