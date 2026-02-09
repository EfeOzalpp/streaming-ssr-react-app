// src/ssr/dynamic-app/UIcards.ssr.ts
type ImageDoc = Record<string, any>;

/** Build a Sanity-style URL pair for low and high quality */
function urlPair(img: any) {
  const raw =
    img?.asset?.url ||
    img?.url ||
    (typeof img === 'string' ? img : null);

  if (!raw) return { lq: null, hq: null };

  const sep = raw.includes('?') ? '&' : '?';
  return {
    lq: `${raw}${sep}auto=format&w=320&q=40`,
    hq: `${raw}${sep}auto=format&w=1280&q=80`,
  };
}

/** Normalization helpers (trim, collapse spaces, strip accents, lowercase) */
function normalizeKey(s: string) {
  return s
    .trim()
    .replace(/\s+/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('en');
}

/** Build a loose lookup map once per render */
function buildLooseIconMap(icons: Record<string, string>) {
  const loose = new Map<string, string>();
  for (const [k, v] of Object.entries(icons || {})) {
    loose.set(normalizeKey(k), v);
  }
  return loose;
}

/** Is the string an inline SVG snippet? */
function isInlineSvg(s?: string): boolean {
  return typeof s === 'string' && /^\s*<svg[\s\S]*<\/svg>\s*$/i.test(s);
}

/** Safe attribute escape for URLs */
function escapeAttr(s: string) {
  return String(s).replace(/"/g, '&quot;');
}

/** Turn an icon value into HTML (inline <svg> or <img>) */
function iconToHtml(val?: string): string {
  if (!val) return '';
  if (isInlineSvg(val)) {
    return `<div class="svg-icon">${val}</div>`;
  }
  return `<img class="svg-icon" src="${escapeAttr(val)}" alt="" aria-hidden="true">`;
}

/** Resolve an icon by (iconName | title) using exact → trimmed → normalized */
function resolveIconValue(
  icons: Record<string, string>,
  loose: Map<string, string>,
  iconName?: string,
  title?: string
) {
  const tryKeys = [iconName, title].filter(Boolean) as string[];
  for (const key of tryKeys) {
    if (Object.prototype.hasOwnProperty.call(icons, key)) return icons[key];
    const t = key.trim();
    if (Object.prototype.hasOwnProperty.call(icons, t)) return icons[t];
    const n = normalizeKey(key);
    const hit = loose.get(n);
    if (hit) return hit;
  }
  return undefined;
}

/**
 * Render the server HTML snapshot of the cards.
 * Pass the `icons` map returned by `prepareDynamicRoute()` to SSR-inject the SVG.
 * If no per-item icon is found, defaults to `icons['arrow1']`.
 */
export function renderUIcardsHTML(
  images: ImageDoc[],
  icons: Record<string, string> = {},
  limit = 12
): string {
  const items = (Array.isArray(images) ? images : []).slice(0, limit);
  const looseIcons = buildLooseIconMap(icons);
  const Arrow = icons['arrow1'];

  const cards = items
    .map((it, i) => {
      const { lq: u1Lq, hq: u1Hq } = urlPair(it.image1);
      const { lq: u2Lq, hq: u2Hq } = urlPair(it.image2);

      const alt1 = it?.alt1 ?? it?.title ?? '';
      const alt2 = it?.alt2 ?? it?.title ?? '';
      const url1 = it?.url1 ?? '#';

      // Prefer per-item icon (iconName → title). If none → global arrow
      const iconVal = resolveIconValue(icons, looseIcons, it?.iconName, it?.title) ?? Arrow;
      const iconHtml = iconToHtml(iconVal);

      // first card eager, rest lazy
      const eagerAttrs =
        i === 0
          ? `loading="eager" fetchpriority="high" decoding="async"`
          : `loading="lazy" decoding="async"`;

      return `
        <div class="card-container custom-card-${i}">
          <div class="image-container custom-card-${i}">
            <a href="${url1}" class="ui-link custom-card-${i}">
              ${
                u2Lq
                  ? `<img 
                      src="${u2Lq}" 
                      data-src-full="${u2Hq}" 
                      alt="${escapeHtml(alt1)}" 
                      class="ui-image1 custom-card-${i}" 
                      ${eagerAttrs}
                    >`
                  : ''
              }
            </a>
          </div>
          <div class="image-container2 custom-card-${i}-2">
            <a href="${url1}" class="ui-link-3 custom-card-${i}">
              ${
                u1Lq
                  ? `<img 
                      src="${u1Lq}" 
                      data-src-full="${u1Hq}" 
                      alt="${escapeHtml(alt2)}" 
                      class="ui-image2 custom-card-${i}-2" 
                      loading="lazy" 
                      decoding="async"
                    >`
                  : ''
              }
            </a>
            <h-name class="image-title custom-card-${i}">
              <a href="${url1}" class="ui-link-2 custom-card-${i}">
                <span class="title-text">${escapeHtml(it?.title ?? '')}</span>
                ${iconHtml}
              </a>
            </h-name>
          </div>
        </div>
      `;
    })
    .join('');

  return `
    <div id="dynamic-snapshot" data-ssr-snapshot="1">
      <div class="homePage-container">
        <div class="UI-card-divider">
          ${cards}
        </div>
      </div>
    </div>
  `;
}

function escapeHtml(s: string) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
