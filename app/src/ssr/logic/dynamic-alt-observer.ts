// src/ssr/logic/dynamic-alt-observer.ts
// Instance-scoped alt observer (mirrors your working setupAltObserver)

type AltObserverOpts = {
  rootElement?: Document | HTMLElement;        // default: document
  minActiveRatio?: number;                     // default: 0.10
  onActivate: (altRaw: string) => void;        // REQUIRED
  onDeactivate?: (altRaw: string) => void;
};

type EntryLike = { target: Element; intersectionRatio: number };

export function createSsrAltObserver({
  rootElement = document,
  minActiveRatio = 0.10,
  onActivate,
  onDeactivate,
}: AltObserverOpts) {
  if (typeof onActivate !== 'function') {
    throw new Error('createSsrAltObserver: onActivate callback is required');
  }

  // keep RAW alt (including trailing spaces), like the working version
  let currentlyActiveAlt: string | null = null;
  let highestVisibility = 0;
  let debounceTimeout: ReturnType<typeof setTimeout> | null = null;

  // 0..1 with 0.01 steps
  const thresholds: number[] = Array.from({ length: 101 }, (_, i) => i / 100);

  const getImageAlt = (cardEl: Element): string | null => {
    const img =
      (cardEl.querySelector('.ui-image2') as HTMLImageElement | null) ||
      (cardEl.querySelector('.ui-image1') as HTMLImageElement | null);
    return img ? img.getAttribute('alt') : null; // DO NOT trim
  };

  // Core logic operates on a simplified EntryLike[] so we can reuse it
  const handleEntries = (entries: EntryLike[]) => {
    // most-visible first
    entries.sort((a, b) => b.intersectionRatio - a.intersectionRatio);

    entries.forEach((entry) => {
      const element = entry.target as HTMLElement;
      const alt = getImageAlt(element);
      if (alt == null) return;

      const visibility = entry.intersectionRatio;

      if (visibility > minActiveRatio && visibility > highestVisibility) {
        if (currentlyActiveAlt !== alt) {
          if (currentlyActiveAlt && typeof onDeactivate === 'function') {
            try { onDeactivate(currentlyActiveAlt); } catch {}
          }
          try { onActivate(alt); } catch {}
          currentlyActiveAlt = alt;
          highestVisibility = visibility;
        }
      } else if (visibility <= minActiveRatio && currentlyActiveAlt === alt) {
        if (typeof onDeactivate === 'function') {
          try { onDeactivate(alt); } catch {}
        }
        currentlyActiveAlt = null;
        highestVisibility = 0;
      }
    });
  };

  // Real IO -> adapt to EntryLike
  const io = new IntersectionObserver(
    (entries) => {
      const simplified: EntryLike[] = entries.map((e) => ({
        target: e.target,
        intersectionRatio: e.intersectionRatio,
      }));
      handleEntries(simplified);
    },
    {
      root: null,
      rootMargin: '0px',
      threshold: thresholds,
    }
  );

  const observeAll = () => {
    const cards = rootElement.querySelectorAll('.card-container');
    cards.forEach((el) => io.observe(el));
  };

  const triggerInitial = () => {
    if (debounceTimeout) clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
      const cards = Array.from(rootElement.querySelectorAll('.card-container'));
      const viewportHeight = window.innerHeight;

      // Synthetic first-pass, like your working code
      const synthetic: EntryLike[] = cards.map((card) => {
        const rect = (card as HTMLElement).getBoundingClientRect();
        const visibility = Math.max(0, Math.min(rect.height, viewportHeight - rect.top) / rect.height);
        return { target: card, intersectionRatio: visibility };
      });

      handleEntries(synthetic);
    }, 50);
  };

  // bootstrap
  observeAll();
  triggerInitial();

  return {
    dispose() {
      if (debounceTimeout) clearTimeout(debounceTimeout);
      io.disconnect();
      currentlyActiveAlt = null;
      highestVisibility = 0;
    },
    rearm() {
      io.disconnect();
      observeAll();
      triggerInitial();
    },
    debugState() {
      return { currentlyActiveAlt, highestVisibility };
    },
  };
}

export default createSsrAltObserver;
