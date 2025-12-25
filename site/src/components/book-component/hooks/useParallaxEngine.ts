// components/book-component/hooks/useParallaxEngine.ts
import { useEffect, useRef } from 'react';

export function useParallaxEngine(containerRef: React.RefObject<HTMLElement | null>) {
  const vecRef = useRef({ nx: 0, ny: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;   // 0..1
      const y = (e.clientY - r.top) / r.height;   // 0..1
      vecRef.current.nx = (x - 0.5) * 2;          // -1..1
      vecRef.current.ny = (y - 0.5) * 2;          // -1..1
    };

    el.addEventListener('pointermove', onMove, { passive: true });
    return () => el.removeEventListener('pointermove', onMove);
  }, [containerRef]);

  return vecRef;
}
