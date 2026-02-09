// src/state/providers/shadow-root-context.tsx
import React, { createContext, useContext, useRef, ReactNode } from 'react';

type ShadowRootFn = () => ShadowRoot | null;
type StyleSheetRaw = string;

const hasDOM = typeof document !== 'undefined';
const hasConstructedSheets =
  hasDOM &&
  typeof (globalThis as any).Document !== 'undefined' &&
  'adoptedStyleSheets' in (Document.prototype as any) &&
  typeof (globalThis as any).CSSStyleSheet !== 'undefined' &&
  'replaceSync' in (CSSStyleSheet.prototype as any);

const isShadowRoot = (node: any): node is ShadowRoot =>
  typeof (globalThis as any).ShadowRoot !== 'undefined' && node instanceof (globalThis as any).ShadowRoot;

type Ctx = {
  getShadowRoot: ShadowRootFn;
  injectStyle: (css: StyleSheetRaw, id: string) => void;
  injectLink: (href: string, id?: string) => void;
  removeStyle?: (id: string) => void;
} | null;

const ShadowRootContext = createContext<Ctx>(null);

let warnedOnce = false;

export const useShadowRoot = () => {
  const ctx = useContext(ShadowRootContext);
  if (!ctx) {
    if (!warnedOnce) {
      // Dev-friendly, harmless in prod too; only once.
      console.warn('useShadowRoot called outside provider; falling back to document.');
      warnedOnce = true;
    }

    const injectStyle = (css: string, id: string) => {
      if (!hasDOM) return;
      const existing = document.head.querySelector<HTMLStyleElement>(`style[data-style-id="${id}"]`);
      if (existing) return;
      const style = document.createElement('style');
      style.dataset.styleId = id;
      style.textContent = css;
      document.head.appendChild(style);
    };

    const injectLink = (href: string, id?: string) => {
      if (!hasDOM) return;
      const selector = id
        ? `link[data-style-id="${id}"]`
        : `link[rel="stylesheet"][href="${href}"]`;
      if (document.head.querySelector(selector)) return;
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      if (id) link.dataset.styleId = id;
      document.head.appendChild(link);
    };

    const removeStyle = (id: string) => {
      if (!hasDOM) return;
      document.head.querySelector(`style[data-style-id="${id}"]`)?.remove();
    };

    return {
      getShadowRoot: () => null,
      injectStyle,
      injectLink,
      removeStyle,
    };
  }
  return ctx;
};

export function ShadowRootProvider({
  getShadowRoot,
  children,
}: {
  getShadowRoot: ShadowRootFn;
  children: ReactNode;
}) {
  // Cache constructed sheets per ID (per provider)
  const sheetCacheRef = useRef<Map<string, CSSStyleSheet>>(new Map());

  const injectStyle = (css: string, id: string) => {
    const root = getShadowRoot();

    // If no shadow root, gracefully inject into document.head
    if (!isShadowRoot(root)) {
      if (!hasDOM) return;
      const existing = document.head.querySelector<HTMLStyleElement>(`style[data-style-id="${id}"]`);
      if (existing) return;
      const style = document.createElement('style');
      style.dataset.styleId = id;
      style.textContent = css;
      document.head.appendChild(style);
      return;
    }

    // Shadow root path
    if (hasConstructedSheets) {
      let sheet = sheetCacheRef.current.get(id);
      if (!sheet) {
        sheet = new (CSSStyleSheet as any)();
        sheet.replaceSync(css);
        sheetCacheRef.current.set(id, sheet);
      }
      if (!root.adoptedStyleSheets.includes(sheet)) {
        root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet];
      }
      return;
    }

    // Fallback <style> in shadow root
    if (root.querySelector(`style[data-style-id="${id}"]`)) return;
    const style = document.createElement('style');
    style.textContent = css;
    (style as any).dataset.styleId = id;
    root.appendChild(style);
  };

  const injectLink = (href: string, id?: string) => {
    const root = getShadowRoot();

    // If no shadow root, use document.head
    if (!isShadowRoot(root)) {
      if (!hasDOM) return;
      const selector = id
        ? `link[data-style-id="${id}"]`
        : `link[rel="stylesheet"][href="${href}"]`;
      if (document.head.querySelector(selector)) return;
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      if (id) (link as any).dataset.styleId = id;
      document.head.appendChild(link);
      return;
    }

    // Shadow root link injection
    const selector = id ? `link[data-style-id="${id}"]` : `link[rel="stylesheet"][href="${href}"]`;
    if (root.querySelector(selector)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    if (id) (link as any).dataset.styleId = id;
    root.appendChild(link);
  };

  const removeStyle = (id: string) => {
    const root = getShadowRoot();

    // Remove from doc head if no shadow root
    if (!isShadowRoot(root)) {
      if (!hasDOM) return;
      document.head.querySelector(`style[data-style-id="${id}"]`)?.remove();
      return;
    }

    if (hasConstructedSheets) {
      const sheet = sheetCacheRef.current.get(id);
      if (sheet) {
        root.adoptedStyleSheets = root.adoptedStyleSheets.filter((s) => s !== sheet);
      }
      return;
    }
    root.querySelector(`style[data-style-id="${id}"]`)?.remove();
  };

  return (
    <ShadowRootContext.Provider value={{ getShadowRoot, injectStyle, injectLink, removeStyle }}>
      {children}
    </ShadowRootContext.Provider>
  );
}
