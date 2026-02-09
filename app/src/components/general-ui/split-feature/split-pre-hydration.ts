// src/components/general-ui/split-feature/split-pre-hydration.ts 
// One place to control the portrait floor, with a special rule for 768–1024 viewports.
export const PORTRAIT_MIN_RULES: Array<{ maxWidth: number; value: number }> = [
  { maxWidth: 767,  value: 16 }, // phones
  { maxWidth: 1024, value: 12 }, // tablets (your 768–1024 window)
  { maxWidth: Infinity, value: 20 }, // anything larger in portrait
];

// Legacy name kept so existing imports won't break.
// It is only used as a default when no window width exists (very rare here).
export const MIN_PORTRAIT_SPLIT = 18;

// Tiny hysteresis used inside this module for snap animations.
const EPS = 0.25;

// Exported helper so client/non-SSR components can compute the same value.
export function getPortraitMinSplit(viewportWidth: number | null | undefined): number {
  const vw = typeof viewportWidth === 'number' && isFinite(viewportWidth) ? viewportWidth : 1024;
  for (const rule of PORTRAIT_MIN_RULES) {
    if (vw <= rule.maxWidth) return rule.value;
  }
  return PORTRAIT_MIN_RULES[PORTRAIT_MIN_RULES.length - 1].value;
}

/**
 * Apply split to two absolutely-positioned media containers.
 * Back-compat signature; optional 4th param lets callers pin a min floor explicitly.
 */
export function applySplitStyle(
  split: number,
  isPortrait: boolean,
  ids: { m1: string; m2: string },
  explicitMinPortrait?: number
) {
  const media1 = document.getElementById(ids.m1) as HTMLElement | null;
  const media2 = document.getElementById(ids.m2) as HTMLElement | null;
  if (!media1 || !media2) return;

  const sClamped = Math.max(0, Math.min(100, split));

  media1.style.position = 'absolute';
  media2.style.position = 'absolute';

  if (isPortrait) {
    const minPortrait =
      typeof explicitMinPortrait === 'number'
        ? explicitMinPortrait
        : getPortraitMinSplit(typeof window !== 'undefined' ? window.innerWidth : undefined);

    const TOP = minPortrait;
    const BOTTOM = 100 - minPortrait;

    // clamp into the rails so the handle can't hide completely
    const s = Math.max(TOP, Math.min(BOTTOM, sClamped));

    // common portrait rails
    media1.style.left = '0';
    media1.style.width = '100%';
    media2.style.left = '0';
    media2.style.width = '100%';
    media1.style.top = '0';

    if (s <= TOP + EPS) {
      // collapse TOP
      media1.style.height = '0%';
      media1.style.transition = 'height 0.1s ease';

      media2.style.top = '0%';
      media2.style.height = '100%';
      media2.style.transition = 'height 0.1s ease, top 0.1s ease';
    } else if (s >= BOTTOM - EPS) {
      // collapse BOTTOM
      media1.style.height = '100%';
      media1.style.transition = 'height 0.1s ease';

      media2.style.top = '100%';
      media2.style.height = '0%';
      media2.style.transition = 'height 0.1s ease, top 0.1s ease';
    } else {
      // normal split
      media1.style.height = `${s}%`;
      media1.style.transition = 'none';

      media2.style.top = `${s}%`;
      media2.style.height = `${100 - s}%`;
      media2.style.transition = 'none';
    }
  } else {
    // landscape unchanged
    media1.style.top = '0';
    media1.style.height = '100%';
    media2.style.top = '0';
    media2.style.height = '100%';

    media1.style.left = '0';
    media1.style.width = `${sClamped}%`;

    media2.style.left = `${sClamped}%`;
    media2.style.width = `${100 - sClamped}%`;
  }
}
