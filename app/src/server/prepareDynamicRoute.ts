// src/server/prepareDynamicRoute.ts
import { fetchImages } from '../dynamic-app/lib/fetchUser';
import fetchSVGIcons from '../dynamic-app/lib/fetchSVGIcons';
import { seededShuffle } from '../content-orchestration/seed/index';

type Cache = { icons?: Record<string, string>; images?: any[]; seed?: number };
type IconLike = { title?: string; icon?: string; url?: string };

function toIconMap(list: IconLike[]): Record<string, string> {
  return (list || []).reduce((acc, it) => {
    if (!it?.title) return acc;
    const val = it.icon ?? it.url;
    if (typeof val === 'string' && val) acc[it.title] = val;
    return acc;
  }, {} as Record<string, string>);
}

/**
 * Seed is ONLY used on the server to set first-paint order.
 * We also return it for debugging/telemetry, but the client shouldn't reshuffle with it.
 */
export async function prepareDynamicRoute(seed?: number): Promise<Cache> {
  const [iconsRaw, imagesRaw] = await Promise.all([
    fetchSVGIcons().catch(() => []),
    fetchImages().catch(() => []),
  ]);

  const icons = toIconMap(Array.isArray(iconsRaw) ? iconsRaw : []);
  const images = Array.isArray(imagesRaw) ? imagesRaw : [];

  const ordered = Number.isFinite(seed) ? seededShuffle(images, seed as number) : images;

  // ok to include seed for logs — client strips/ignores it
  return { icons, images: ordered, seed };
}
