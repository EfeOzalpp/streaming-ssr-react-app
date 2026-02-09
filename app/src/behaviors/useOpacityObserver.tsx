// src/behaviors/useOpacityObserver.tsx
export const attachOpacityObserver = (
  ids: string[],
  focusedProjectKey: string | null
) => {
  const isRealMobile = (() => {
    const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
    const touch = (navigator as any).maxTouchPoints > 0;
    const vv = (window as any).visualViewport;
    let shrinks = false;
    if (vv) {
      const gap = window.innerHeight - vv.height;
      if (gap > 48) shrinks = true;
      return coarse && touch && (shrinks || gap > 48);
    }
    return coarse && touch;
  })();

  const baseMin = isRealMobile ? 0.1 : 0.3;
  const focusedId = focusedProjectKey ? `block-${focusedProjectKey}` : null;

  // Per-call guard so re-attaching after focus toggles works
  const observed = new WeakSet<HTMLElement>();

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const el = entry.target as HTMLElement;
        const ratio = entry.intersectionRatio ?? 0;

        // Focused pane is always fully opaque
        if (focusedId && el.id === focusedId) {
          el.style.opacity = '1';
          continue;
        }

        // Everyone else keeps mapping based on IO even while focused
        if (ratio >= 0.75) {
          el.style.opacity = '1';
        } else {
          const mapped = baseMin + (ratio / 0.75) * (1 - baseMin);
          el.style.opacity = String(mapped);
        }
      }
    },
    {
      threshold: Array.from({ length: 101 }, (_, i) => i / 100),
      // If your panes live inside a custom scroller, pass it here as `root`
      // root: scrollContainerRef.current,
    }
  );

  const observeTargets = () => {
    ids.forEach((sel) => {
      const el = document.querySelector(sel) as HTMLElement | null;
      if (el && !observed.has(el)) {
        observed.add(el);
        observer.observe(el);
        // Prime the focused pane immediately so there’s no flash
        if (focusedId && el.id === focusedId) el.style.opacity = '1';
      }
    });
  };

  const mo = new MutationObserver(observeTargets);
  observeTargets();
  mo.observe(document.body, { childList: true, subtree: true });

  return () => {
    observer.disconnect();
    mo.disconnect();
  };
};
