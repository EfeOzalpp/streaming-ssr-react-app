// src/state/providers/style-injector.ts
import { useEffect } from 'react';
import { useShadowRoot } from './shadow-root-context';

// Augment Window locally so TS always sees the field here
declare global {
  interface Window {
    __DYNAMIC_STYLE_IDS__?: Set<string>;
  }
}

// Safe handle to window (SSR-friendly)
const win: (Window & { __DYNAMIC_STYLE_IDS__?: Set<string> }) | undefined =
  typeof window !== 'undefined' ? window : undefined;

// Global dedupe set (persisted on window between renders)
const globalStyleIds: Set<string> = (() => {
  if (!win) return new Set<string>();
  if (!win.__DYNAMIC_STYLE_IDS__) win.__DYNAMIC_STYLE_IDS__ = new Set<string>();
  return win.__DYNAMIC_STYLE_IDS__;
})();

export const useStyleInjection = (css: string, id: string) => {
  const { injectStyle, getShadowRoot } = useShadowRoot() || {};

  useEffect(() => {
    if (!id) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('useStyleInjection: id is required for dedupe');
      }
      return;
    }

    const shadowRoot = getShadowRoot?.();
    const isInShadow = shadowRoot && shadowRoot !== document;

    if (isInShadow && injectStyle) {
      // Shadow DOM dedupe by ID
      if (!shadowRoot.querySelector(`style[data-style-id="${id}"]`)) {
        injectStyle(css, id); // provider handles DOM append
      }
      return;
    }

    // Global dedupe (memo + DOM check as a safety)
    if (!globalStyleIds.has(id)) {
      const existing = document.head.querySelector(`style[data-style-id="${id}"]`);
      if (!existing) {
        const styleEl = document.createElement('style');
        styleEl.textContent = css;
        styleEl.dataset.styleId = id;
        document.head.appendChild(styleEl);
      }
      globalStyleIds.add(id);
    }
  }, [css, id, injectStyle, getShadowRoot]);
};
