// src/components/general-iu/tooltip/index.ts
import '../../../styles/tooltip.css';
import { projectColors } from '../../../shared/color-map';

type TooltipInfo = { tags: string[]; backgroundColor: string };
const tooltipDataCache: Record<string, TooltipInfo> = {};

const shared = [
  'Representative media payload',
  'Used to benchmark image',
  'and video loading behavior.',
];

const sharedEntries = Object.fromEntries(
  ['rotary-lamp', 'ice-scoop', 'data-viz'].map((k) => [k, shared])
) as Record<string, string[]>;

const LOCAL_FALLBACK_TAGS: Record<string, string[]> = {
  'block-g': ['#User Event Handling', '#Animated UI Feedback', '#Persistent Server State'],
  dynamic: ['#Shadow-Scoped Rendering', '#Explicit CSS Scoping', '#Frame-Based Layout'],
  ...sharedEntries,
};

const TITLE_BY_KEY: Record<string, string> = {
  'rotary-lamp': 'Rotary Lamp',
  'ice-scoop': 'Ice Cream Scoop',
  'data-viz': 'Data Visualization',
  'block-g': 'Evade the Rock',
  dynamic: 'Dynamic App',
};

function bgForKey(key: string) {
  const colorInfo = projectColors[TITLE_BY_KEY[key]];
  const alpha = colorInfo?.tooltipAlpha ?? 0.4;
  return colorInfo ? `rgba(${colorInfo.rgb}, ${alpha})` : 'rgba(85,95,90,0.6)';
}

function createTooltipDOM() {
  const el = document.createElement('div');
  el.id = 'custom-global-tooltip';
  el.style.position = 'fixed';
  el.style.pointerEvents = 'none';
  el.style.zIndex = '9999';
  el.style.opacity = '0';
  el.style.visibility = 'hidden';
  el.style.backdropFilter = 'blur(8px)';
  el.style.color = '#fff';
  el.style.transition = 'opacity 0.3s ease, visibility 0.3s ease';
  el.className = 'custom-tooltip-blur';
  const root = document.getElementById('main-shell') || document.body;
  root.appendChild(el);
  return el as HTMLDivElement;
}

let tooltipEl: HTMLDivElement | null = null;
let currentKey = '';
let hideTimeout: ReturnType<typeof setTimeout> | null = null;

export const fetchTooltipDataForKey = async (key: string): Promise<TooltipInfo> => {
  if (tooltipDataCache[key]) return tooltipDataCache[key];

  const bg = bgForKey(key);

  // local fallback
  if (LOCAL_FALLBACK_TAGS[key]) {
    const info = { tags: LOCAL_FALLBACK_TAGS[key], backgroundColor: bg };
    tooltipDataCache[key] = info;
    return info;
  }

  // CMS fetch by slug
  try {
    const client = (await import('../../../services/sanity')).default;
    const res = await client.fetch<{ tags?: string[] } | null>(
      `*[_type=="mediaBlock" && slug.current == $key][0]{ tags }`,
      { key }
    );
    const info: TooltipInfo = { tags: res?.tags ?? [], backgroundColor: bg };
    tooltipDataCache[key] = info;
    return info;
  } catch {
    const info: TooltipInfo = { tags: [], backgroundColor: bg };
    tooltipDataCache[key] = info;
    return info;
  }
};

type Side = 'right' | 'left';

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(n, max));
}

// Cursor tracking state (needed for “decide once on show”)
let lastMouseX = -1;
let lastMouseY = -1;

// Sticky side (prevents top/bottom + prevents left/right thrash)
let lockedSide: Side | null = null;

// Right-edge forcing zone (only go left when cursor is in rightmost 5%)
const RIGHT_EDGE_FORCE_PCT = 0.95;

const showTooltip = () => {
  if (!tooltipEl) return;
  if (hideTimeout) clearTimeout(hideTimeout);

  // Decide a side once, when showing (or after being hidden)
  if (!lockedSide) {
    const vw = window.innerWidth;
    // Flip to left only when cursor is in the rightmost 5%
    lockedSide = lastMouseX > vw * RIGHT_EDGE_FORCE_PCT ? 'left' : 'right';
  }

  tooltipEl.style.opacity = '1';
  tooltipEl.style.visibility = 'visible';
  hideTimeout = setTimeout(() => hideTooltip(), 1_500);
};

const hideTooltip = () => {
  if (!tooltipEl) return;
  if (hideTimeout) clearTimeout(hideTimeout);
  tooltipEl.style.opacity = '0';
  tooltipEl.style.visibility = 'hidden';
  currentKey = '';
  lockedSide = null; // reset so next show can decide again
};

function chooseSideIfNeeded(rectWidth: number) {
  // Flip ONLY if current side cannot fit at all.
  if (!lockedSide) return;

  const vw = window.innerWidth;
  const padding = 12;
  const offset = 14;

  const canFitRight = lastMouseX + offset + rectWidth <= vw - padding;
  const canFitLeft = lastMouseX - offset - rectWidth >= padding;

  if (lockedSide === 'right' && !canFitRight && canFitLeft) lockedSide = 'left';
  if (lockedSide === 'left' && !canFitLeft && canFitRight) lockedSide = 'right';
}

function positionTooltip(x: number, y: number) {
  if (!tooltipEl) return;

  const rect = tooltipEl.getBoundingClientRect();
  const w = rect.width || 0;
  const h = rect.height || 0;

  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const padding = 12; // space from viewport edges
  const offset = 14; // cursor → tooltip distance

  // Ensure we have a side decision (in case position runs before show)
  if (!lockedSide) {
    lockedSide = x > vw * RIGHT_EDGE_FORCE_PCT ? 'left' : 'right';
  }

  // Force RIGHT whenever not in the rightmost 5%; force LEFT only in the rightmost 5%.
  // This prevents "staying left" after briefly touching the right edge.
  if (x > vw * RIGHT_EDGE_FORCE_PCT) {
    lockedSide = 'left';
  } else if (lockedSide === 'left') {
    lockedSide = 'right';
  }

  // Only flip when required (no thrash)
  chooseSideIfNeeded(w);

  let left = lockedSide === 'right' ? x + offset : x - w - offset;

  // Always track vertically (centered on cursor), but clamp inside viewport
  let top = y - h / 2;

  left = clamp(left, padding, vw - w - padding);
  top = clamp(top, padding, vh - h - padding);

  tooltipEl.style.left = `${left}px`;
  tooltipEl.style.top = `${top}px`;
}

export function initGlobalTooltip(isRealMobile: boolean) {
  if (tooltipEl) return () => {};
  tooltipEl = createTooltipDOM();

  let ticking = false;
  let scrollCheckTimeout: ReturnType<typeof setTimeout> | null = null;

  const updateForElement = async (el: Element | null) => {
    if (!(el instanceof HTMLElement)) {
      hideTooltip();
      return;
    }

    // IMPORTANT: only the hovered element itself can trigger tooltips (no ancestor walk)
    const tooltipClass = [...el.classList].find((c) => c.startsWith('tooltip-'));
    if (!tooltipClass) {
      hideTooltip();
      return;
    }

    const key = tooltipClass.replace('tooltip-', '');

    if (key !== currentKey) {
      currentKey = key;

      // New key => new open decision
      lockedSide = null;

      const info = await fetchTooltipDataForKey(key);

      if (!info.tags.length) {
        hideTooltip();
        return;
      }

      tooltipEl!.innerHTML = info.tags.map((t) => `<p class="tooltip-tag">${t}</p>`).join('');
      tooltipEl!.style.backgroundColor = info.backgroundColor;

      showTooltip();

      // Content changed => size changed. Reposition right away.
      requestAnimationFrame(() => positionTooltip(lastMouseX, lastMouseY));
    } else if (tooltipEl!.style.opacity === '0' || tooltipEl!.style.visibility === 'hidden') {
      showTooltip();
    }
  };

  const onMouseMove = (e: MouseEvent) => {
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    requestAnimationFrame(() => positionTooltip(lastMouseX, lastMouseY));
    updateForElement(e.target as Element);
  };

  const checkHoveredElementOnScroll = () => {
    const el = document.elementFromPoint(lastMouseX, lastMouseY);
    updateForElement(el);
    requestAnimationFrame(() => positionTooltip(lastMouseX, lastMouseY));
  };

  const onScroll = () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        checkHoveredElementOnScroll();
        ticking = false;
      });
      ticking = true;
    }
    if (scrollCheckTimeout) clearTimeout(scrollCheckTimeout);
    scrollCheckTimeout = setTimeout(() => {}, 120);
  };

  const onMouseOut = (e: MouseEvent) => {
    if (!e.relatedTarget) hideTooltip();
  };

  // only attach scroll observer for non-mobile real viewports
  if (!isRealMobile) window.addEventListener('scroll', onScroll, true);
  document.addEventListener('mousemove', onMouseMove, { passive: true });
  document.addEventListener('mouseout', onMouseOut, { passive: true });

  return () => {
    if (!tooltipEl) return;
    if (!isRealMobile) window.removeEventListener('scroll', onScroll, true);
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseout', onMouseOut);
    tooltipEl.remove();
    tooltipEl = null;
    if (hideTimeout) clearTimeout(hideTimeout);
    lockedSide = null;
  };
}