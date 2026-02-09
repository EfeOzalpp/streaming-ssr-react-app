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
  'dynamic': ['#Shadow-Scoped Rendering', '#Explicit CSS Scoping', '#Frame-Based Layout'],
  ...sharedEntries,
};

const TITLE_BY_KEY: Record<string, string> = {
  'rotary-lamp': 'Rotary Lamp',
  'ice-scoop': 'Ice Cream Scoop',
  'data-viz': 'Data Visualization',
  'block-g': 'Evade the Rock',
  'dynamic': 'Dynamic App',
};

function bgForKey(key: string) {
  const colorInfo = projectColors[TITLE_BY_KEY[key]];
  const alpha = colorInfo?.tooltipAlpha ?? 0.6;
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

const showTooltip = () => {
  if (!tooltipEl) return;
  if (hideTimeout) clearTimeout(hideTimeout);
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
};

function positionTooltip(x: number, y: number) {
  if (!tooltipEl) return;
  const rect = tooltipEl.getBoundingClientRect();
  const padding = 0;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const nearTop = y < rect.height + padding + 20;
  const nearBottom = y + rect.height + padding > vh - 20;
  const nearRight = x + rect.width + padding > vw - 20;
  const nearLeft = x < rect.width + padding + 20;

  let left: number, top: number;
  if (nearBottom) { top = y - rect.height - padding - 8; left = x - rect.width * 0; }
  else if (nearTop) { top = y + padding - 14; left = x - rect.width * 0; }
  else if (nearRight) { top = y - rect.height / 2; left = x - rect.width - padding - 24; }
  else if (nearLeft) { top = y - rect.height / 2; left = x + padding - 4; }
  else { top = y - rect.height / 2; left = x + padding - 4; }

  left = Math.max(padding, Math.min(left, vw - rect.width - padding));
  top  = Math.max(padding, Math.min(top,  vh - rect.height - padding));

  tooltipEl.style.left = `${left}px`;
  tooltipEl.style.top  = `${top}px`;
}

export function initGlobalTooltip(isRealMobile: boolean) {
  if (tooltipEl) return () => {};
  tooltipEl = createTooltipDOM();

  let lastMouseX = -1;
  let lastMouseY = -1;
  let ticking = false;
  let scrollCheckTimeout: ReturnType<typeof setTimeout> | null = null;

  const updateForElement = async (el: Element | null) => {
    if (!(el instanceof HTMLElement)) { hideTooltip(); return; }
    const tooltipClass = [...el.classList].find(c => c.startsWith('tooltip-'));
    if (!tooltipClass) { hideTooltip(); return; }

    const key = tooltipClass.replace('tooltip-', '');
    if (key !== currentKey) {
      currentKey = key;
      const info = await fetchTooltipDataForKey(key);

      if (!info.tags.length) { hideTooltip(); return; }
      tooltipEl!.innerHTML = info.tags.map(t => `<p class="tooltip-tag">${t}</p>`).join('');
      tooltipEl!.style.backgroundColor = info.backgroundColor;
      showTooltip();
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
      window.requestAnimationFrame(() => { checkHoveredElementOnScroll(); ticking = false; });
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
  };
}