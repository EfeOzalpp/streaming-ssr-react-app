// components/book-component/hooks/useDragEngine.ts
import { useRef } from 'react';

type Args = {
  containerRef: React.RefObject<HTMLDivElement | null>;
  scrollX: number;
  setScrollX: React.Dispatch<React.SetStateAction<number>>;
};

export function useDragEngine({ containerRef, scrollX, setScrollX }: Args) {
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startScrollX: number;
  } | null>(null);

  const onPointerDown = (e: React.PointerEvent) => {
    const el = containerRef.current;
    if (!el) return;
    el.setPointerCapture(e.pointerId);

    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startScrollX: scrollX,
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;

    const dx = e.clientX - d.startX;
    setScrollX(d.startScrollX + dx);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    dragRef.current = null;
  };

  return { onPointerDown, onPointerMove, onPointerUp };
}
