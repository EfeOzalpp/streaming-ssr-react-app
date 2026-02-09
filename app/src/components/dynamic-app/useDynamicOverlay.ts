// src/components/dynamic-app/useDynamicOverlay.ts
import { useEffect, useState } from 'react';

export function useDynamicOverlay(frameRef: React.RefObject<HTMLElement>) {
  const [style, setStyle] = useState<{
    width: number;
    heightSet1: number;
    heightSet2: number;
  }>({
    width: 0,
    heightSet1: 0,
    heightSet2: 0,
  });

  useEffect(() => {
    const update = () => {
      if (!frameRef.current) return;

      const rect = frameRef.current.getBoundingClientRect();
      const aspect = rect.width / rect.height;

      // Aspect ratio breakpoints
      const minAspect = 1.5 / 6.5; // ~0.2307
      const maxAspect = 3.3 / 6.5; // ~0.5077

      // Width range (shared)
      const minWidth = 150;
      const maxWidth = 320;

      // Height range set 1 (svh-based values)
      const minHeightSet1 = 42;
      const maxHeightSet1 = 71;

      // Height range set 2 (px-based)
      const minHeightSet2 = 265;
      const maxHeightSet2 = 605;

      // --- Aspect ratio-based lerp ---
      let width: number;
      let height1: number;
      let height2: number;

      if (aspect <= minAspect) {
        width = minWidth;
        height1 = minHeightSet1;
        height2 = minHeightSet2;
      } else if (aspect >= maxAspect) {
        width = maxWidth;
        height1 = maxHeightSet1;
        height2 = maxHeightSet2;
      } else {
        const t = (aspect - minAspect) / (maxAspect - minAspect);
        width = minWidth + (maxWidth - minWidth) * t;
        height1 = minHeightSet1 + (maxHeightSet1 - minHeightSet1) * t;
        height2 = minHeightSet2 + (maxHeightSet2 - minHeightSet2) * t;
      }

      // Absolute height multiplier (0 → 2 over 0–1300px) 
      const minFrameHeight = 0;
      const maxFrameHeight = 1300;
      const minMultiplier = 0;
      const maxMultiplier = 2;

      const clampedHeight = Math.min(Math.max(rect.height, minFrameHeight), maxFrameHeight);
      const heightT = (clampedHeight - minFrameHeight) / (maxFrameHeight - minFrameHeight);
      const heightMultiplier = minMultiplier + (maxMultiplier - minMultiplier) * heightT;

      // Apply multiplier
      width *= heightMultiplier;
      height1 *= heightMultiplier;
      height2 *= heightMultiplier;

      setStyle({
        width,
        heightSet1: height1,
        heightSet2: height2,
      });
    };

    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, [frameRef]);

  return style; // { width, heightSet1, heightSet2 }
}
