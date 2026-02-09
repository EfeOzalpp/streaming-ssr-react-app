// src/dynamic-app/lib/shadowObserver.ts
import { useEffect } from 'react';

export default function useIntersectionTransform(
  ref: React.RefObject<HTMLElement>,
  getShadowRoot: () => ShadowRoot | null,
  pauseAnimation: boolean,
  getScrollRoot?: () => Element | null 
) {

  useEffect(() => {
    if (!ref.current || pauseAnimation) return;

    // Figure out where we live (shadow/dom) and what to use as IO root.
    const shadow = getShadowRoot?.() ?? null;
    const isInShadow = !!shadow;
    const containerEl =
      (typeof getScrollRoot === 'function' && getScrollRoot()) ||
      // prefer your inner scroller if we can find it:
      (isInShadow ? shadow.querySelector('.embedded-app') as Element | null : null) ||
      null; // fallback = viewport

    // (optional) gate transforms to when pointer is inside shadow host
    let mouseInside = false;
    const hostEl = isInShadow ? (shadow as ShadowRoot).host as HTMLElement : null;
    const onEnter = () => (mouseInside = true);
    const onLeave = () => (mouseInside = false);
    if (hostEl) {
      hostEl.addEventListener('pointerenter', onEnter);
      hostEl.addEventListener('pointerleave', onLeave);
    }

    const cardEl = ref.current!;
    const imageContainer  = cardEl.querySelector('.image-container')  as HTMLElement | null;
    const imageContainer2 = cardEl.querySelector('.image-container2') as HTMLElement | null;
    if (!imageContainer || !imageContainer2) return;

    const applyTransform = (percentage: number) => {
      const width =
        containerEl instanceof Element
          ? (containerEl as HTMLElement).clientWidth
          : window.innerWidth;

      let imageContainerTransform = 'translate(0em, 0em)';
      let imageContainer2Transform = 'translate(1em, -28em)';
      let imageContainerZIndex = '5';
      let imageContainer2ZIndex = '1';

      if (width <= 767) {
        if (percentage > 0.35 && percentage <= 1) {
          imageContainerTransform = 'translate(0.5em, 1em)';
          imageContainer2Transform = 'translate(0.5em, -32.5em)';
          imageContainerZIndex = '1';
          imageContainer2ZIndex = '5';
        } else if (percentage > 0.15 && percentage <= 0.35) {
          imageContainerTransform = 'translate(1.5em, 0.5em)';
          imageContainer2Transform = 'translate(-0.25em, -34.5em)';
          imageContainerZIndex = '5';
          imageContainer2ZIndex = '1';
        } else if (percentage >= 0 && percentage <= 0.15) {
          imageContainerTransform = 'translate(0em, 0em)';
          imageContainer2Transform = 'translate(0em, -33.5em)';
        }
      } else if (width <= 1024) {
        if (percentage >= 0.3) {
          imageContainerTransform = 'translate(0em, 0em)';
          imageContainer2Transform = 'translate(0em, -23.5em)';
          imageContainerZIndex = '1';
          imageContainer2ZIndex = '5';
        } else if (percentage < 0.3) {
          imageContainerTransform = 'translate(-0.5em, 0em)';
          imageContainer2Transform = 'translate(1em, -23.5em)';
          imageContainerZIndex = '1';
          imageContainer2ZIndex = '5';
        } else if (percentage < 0.1) {
          imageContainerTransform = 'translate(-0.5em, 0em)';
          imageContainer2Transform = 'translate(1em, -23.5em)';
          imageContainerZIndex = '5';
          imageContainer2ZIndex = '1';
        }
      } else if (width > 1025) {
        if (percentage > 0.6 && percentage <= 1) {
          imageContainerTransform = 'translate(1em, 1em)';
          imageContainer2Transform = 'translate(0em, -28.8em)';
          imageContainerZIndex = '1';
          imageContainer2ZIndex = '5';
        } else if (percentage > 0.3 && percentage <= 0.6) {
          imageContainerTransform = 'translate(1.2em, -0.8em)';
          imageContainer2Transform = 'translate(0em, -28em)';
          imageContainerZIndex = '5';
          imageContainer2ZIndex = '1';
        } else if (percentage >= 0 && percentage <= 0.3) {
          imageContainerTransform = 'translate(0em, 0em)';
          imageContainer2Transform = 'translate(1em, -27.4em)';
          imageContainerZIndex = '5';
          imageContainer2ZIndex = '1';
        }
      } else {
        if (percentage > 0.3 && percentage <= 1) {
          imageContainerTransform = 'translate(0em, 0em)';
          imageContainer2Transform = 'translate(1em, -43em)';
          imageContainerZIndex = '1';
          imageContainer2ZIndex = '5';
        } else if (percentage >= 0 && percentage <= 0.3) {
          imageContainerTransform = 'translate(0em, 0em)';
          imageContainer2Transform = 'translate(1em, -43em)';
        }
      }

      imageContainer.style.transform = imageContainerTransform;
      imageContainer.style.zIndex = imageContainerZIndex;
      imageContainer2.style.transform = imageContainer2Transform;
      imageContainer2.style.zIndex = imageContainer2ZIndex;
    };

    // IO now uses the scroll container as root (if available)
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (isInShadow && !mouseInside) return;

        const rect = entry.boundingClientRect;

        // use the container’s rect/height instead of window
        const rootRect = containerEl
          ? (containerEl as Element).getBoundingClientRect()
          : document.documentElement.getBoundingClientRect();

        const rootHeight =
          containerEl instanceof Element
            ? (containerEl as HTMLElement).clientHeight
            : window.innerHeight;

        const rootCenter = rootRect.top + rootHeight;

        // replicate your old math but relative to the container center
        const percentage = Math.max(
          0,
          Math.min(rect.height, rootCenter - rect.top)
        ) / rect.height;

        applyTransform(percentage);
      },
      {
        root: containerEl || null, // ← critical change
        threshold: Array.from({ length: 101 }, (_, i) => i / 100),
      }
    );

    // initial position apply (also relative to container)
    const rect = cardEl.getBoundingClientRect();
    const rootRect = containerEl
      ? (containerEl as Element).getBoundingClientRect()
      : document.documentElement.getBoundingClientRect();
    const rootHeight =
      containerEl instanceof Element
        ? (containerEl as HTMLElement).clientHeight
        : window.innerHeight;
    const rootCenter = rootRect.top + rootHeight / 1.5;
    const initialPct = Math.max(0, Math.min(rect.height, rootCenter - rect.top)) / rect.height;
    applyTransform(initialPct);

    observer.observe(cardEl);

    return () => {
      observer.disconnect();
      if (hostEl) {
        hostEl.removeEventListener('pointerenter', onEnter);
        hostEl.removeEventListener('pointerleave', onLeave);
      }
    };
  }, [ref, pauseAnimation, getShadowRoot, getScrollRoot]);
}
