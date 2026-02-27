// src/dynamic-app/lib/setupAltObserver.js

const DEFAULT_THRESHOLDS = Array.from({ length: 21 }, (_, i) => i / 20); // 0..1 in 0.05 steps

const setupAltObserver = (
  onActivate,
  onDeactivate,
  rootElement = document,
  {
    minVisible = 0.12,
    thresholds = DEFAULT_THRESHOLDS,
    root = null,
    rootMargin = '0px',
  } = {}
) => {
  let activeAlt = null;

  const getAlt1 = (cardEl) => {
    const img = cardEl.querySelector('.ui-image1');
    return img?.getAttribute('alt') || null;
  };

  const pickWinner = (entries) => {
    // candidates: visible enough and have alt
    const candidates = entries
      .map((e) => {
        const alt = getAlt1(e.target);
        if (!alt) return null;
        const ratio = e.intersectionRatio ?? 0;

        // use bounding box for tie-breaking
        const rect = e.boundingClientRect;
        const centerY = rect.top + rect.height / 2;
        const viewportCenterY = (window.innerHeight || 0) / 2;
        const distToCenter = Math.abs(centerY - viewportCenterY);

        return { alt, ratio, distToCenter, top: rect.top };
      })
      .filter((x) => x && x.ratio >= minVisible);

    if (candidates.length === 0) return null;

    // winner: highest ratio, then closest to center, then top-most
    candidates.sort((a, b) => {
      if (b.ratio !== a.ratio) return b.ratio - a.ratio;
      if (a.distToCenter !== b.distToCenter) return a.distToCenter - b.distToCenter;
      return a.top - b.top;
    });

    return candidates[0].alt;
  };

  const observer = new IntersectionObserver(
    (entries) => {
      const next = pickWinner(entries);

      if (next === activeAlt) return;

      if (activeAlt) onDeactivate(activeAlt);
      if (next) onActivate(next);

      activeAlt = next;
    },
    { root, rootMargin, threshold: thresholds }
  );

  const cards = Array.from(rootElement.querySelectorAll('.card-container'));
  cards.forEach((card) => observer.observe(card));

  // ensure we can clean up
  return () => observer.disconnect();
};

export default setupAltObserver;