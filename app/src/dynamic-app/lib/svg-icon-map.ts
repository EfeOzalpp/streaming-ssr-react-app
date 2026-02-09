// src/dynamic-app/lib/svg-icon-map.ts

export type IconLike = { title?: string; icon?: string; url?: string };

/** remove BOM, <?xml …?>, <!DOCTYPE …> so innerHTML gets a clean <svg> root */
export const stripSvgPreamble = (s = '') =>
  s
    .replace(/^\uFEFF/, '')
    .replace(/^\s*<\?xml[\s\S]*?\?>\s*/i, '')
    .replace(/^\s*<!DOCTYPE[\s\S]*?>\s*/i, '')
    .trim();

export const isInlineSvg = (s?: string) => {
  if (typeof s !== 'string') return false;
  const t = stripSvgPreamble(s);
  return /^\s*<svg[\s\S]*<\/svg>\s*$/i.test(t);
};

export const asInlineSvg = (s?: string) => (isInlineSvg(s) ? stripSvgPreamble(s!) : '');

export const escapeAttr = (s: string) => String(s).replace(/"/g, '&quot;');

export const toImgHtml = (src?: string) =>
  typeof src === 'string' && src.trim()
    ? `<img src="${escapeAttr(src)}" alt="" aria-hidden="true" />`
    : '';

/** normalize a plain { name: value } map (from SSR/window) to safe HTML strings */
export function normalizeIconMap(raw?: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw || {})) {
    out[k] = asInlineSvg(v) || toImgHtml(v);
  }
  return out;
}

/** build a client icon map from Sanity rows (prefer inline; else URL→<img>) */
export function toClientIconMap(list: IconLike[] = []): Record<string, string> {
  const out: Record<string, string> = {};
  for (const it of list) {
    if (!it?.title) continue;
    const inline = asInlineSvg(it.icon);
    out[it.title] = inline || toImgHtml(it.url) || toImgHtml(it.icon);
  }
  return out;
}
