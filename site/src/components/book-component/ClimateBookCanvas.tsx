// components/book-component/ClimateBookCanvas.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { DragItem, ImageDemanded } from './types';
import { seededItems } from './utils';
import { useDragEngine } from './hooks/useDragEngine';
import { useParallaxEngine } from './hooks/useParallaxEngine';
import { ClimateBookItem } from './ClimateBookItem';

type Props = { raw: ImageDemanded[] };

export function ClimateBookCanvas({ raw }: Props) {
  const [items, setItems] = useState<DragItem[]>([]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);

  // global scroll offset
  const [scrollX, setScrollX] = useState(0);

  useEffect(() => {
    setItems(seededItems(raw));
  }, [raw]);

  const { onPointerDown, onPointerMove, onPointerUp } = useDragEngine({
    containerRef,
    scrollX,
    setScrollX,
  });

  const parallaxVecRef = useParallaxEngine(containerRef);

  const loopWidth = useMemo(() => {
    // big enough to feel endless; tune this
    const base = items.length * 520;
    return Math.max(base, 2400);
  }, [items.length]);

  return (
    <div
      ref={containerRef}
      id="climate-book-canvas"
      className="tooltip-climate-book"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        touchAction: 'none',
        overflow: 'hidden',
        cursor: 'grab',
      }}
    >
      {items.map((it) => (
        <ClimateBookItem
          key={it.id}
          item={it}
          hovered={hoveredId === it.id}
          setHoveredId={setHoveredId}
          scrollX={scrollX}
          loopWidth={loopWidth}
          parallaxVecRef={parallaxVecRef}
        />
      ))}
    </div>
  );
}
