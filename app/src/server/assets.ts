// src/server/assets.ts
import fs from 'fs';
import path from 'path';

export function resolveStatsFile() {
  const BUILD_DIR = path.resolve(process.cwd(), 'build');
  const PROD_STATS_FILE = path.resolve(BUILD_DIR, 'loadable-stats.json');
  const DEV_STATS_FILE = path.resolve(process.cwd(), 'loadable-stats.json');
  const statsFile = fs.existsSync(PROD_STATS_FILE) ? PROD_STATS_FILE : DEV_STATS_FILE;
  return { BUILD_DIR, STATS_FILE: statsFile, ASSET_MANIFEST: path.resolve(BUILD_DIR, 'asset-manifest.json') };
}

export function loadManifestIfAny(IS_DEV: boolean, manifestPath: string) {
  if (IS_DEV) return null;
  try {
    return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch {
    return null;
  }
}

export function readFontCss() {
  const safeRead = (file: string) => (fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '');
  const root = process.cwd();
  return {
    rubikCss: safeRead(path.resolve(root, 'public/fonts/rubik.css')),
    orbitronCss: safeRead(path.resolve(root, 'public/fonts/orbitron.css')),
    poppinsCss: safeRead(path.resolve(root, 'public/fonts2/poppins.css')),
    epilogueCss: safeRead(path.resolve(root, 'public/fonts2/epilogue.css')),
  };
}

// Build <link rel="preload"> set based on your normalized media shape
export function buildPreloadLinks(firstData: any): string[] {
  const links: string[] = [];
  if (!firstData?.media) return links;
  const arr = Array.isArray(firstData.media) ? firstData.media : [firstData.media];
  for (const m of arr) {
    if (m?.imageUrl)       links.push(`<link rel="preload" as="image" href="${m.imageUrl}">`);
    if (m?.video?.posterUrl) links.push(`<link rel="preload" as="image" href="${m.video.posterUrl}">`);
    if (m?.video?.mp4Url)    links.push(`<link rel="preload" as="video" href="${m.video.mp4Url}">`);
    if (m?.video?.webmUrl)   links.push(`<link rel="preload" as="video" href="${m.video.webmUrl}">`);
  }
  return links;
}

export function buildDynamicImagePreloads(images: any[], limit = 6): string[] {
  if (!Array.isArray(images) || !images.length) return [];
  const links: string[] = [];
  const seen = new Set<string>();
  let count = 0;

  const toUrl = (img: any) => img?.asset?.url || img?.url || (typeof img === 'string' ? img : null);
  const toLq = (url: string) => {
    // if it's a sanity CDN URL, ask for a smaller version; else leave as is
    return /cdn\.sanity\.io/.test(url)
      ? `${url}${url.includes('?') ? '&' : '?'}auto=format&w=640&q=60`
      : url;
  };

  for (const it of images) {
    const u1 = toUrl(it?.image1);
    const u2 = toUrl(it?.image2);
    for (const raw of [u1, u2]) {
      if (!raw || seen.has(raw)) continue;
      seen.add(raw);

      const href = toLq(raw);
      links.push(`<link rel="preload" as="image" href="${href}" imagesrcset="${href}">`);

      if (++count >= limit) break;
    }
    if (count >= limit) break;
  }
  return links;
}
