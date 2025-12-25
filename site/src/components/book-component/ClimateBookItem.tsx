// components/book-component/ClimateBookItem.tsx
import React, { useMemo } from 'react';
import type { DragItem } from './types';
import MediaLoader from '../../utils/media-providers/media-loader';

function wrap(n: number, size: number) {
  return ((n % size) + size) % size;
}

type Props = {
  item: DragItem;
  hovered: boolean;
  setHoveredId: (id: string | null) => void;
  scrollX: number;
  loopWidth: number;
  parallaxVecRef: React.RefObject<{ nx: number; ny: number }>;
};

export function ClimateBookItem({
  item,
  hovered,
  setHoveredId,
  scrollX,
  loopWidth,
  parallaxVecRef,
}: Props) {
  // tune these
  const PARALLAX_STRENGTH = 52;      // “slightly more intense”
  const VERTICAL_PLACE = 38;         // mouse up/down placement
  const HOVER_SCALE = 1.18;

  // depth mapping:
  // far(0.1) -> small movement, near(1.0) -> big movement
  const depth = item.depth;

  const { nx, ny } = parallaxVecRef.current;

  const parX = nx * PARALLAX_STRENGTH * depth;
  const parY = ny * (PARALLAX_STRENGTH * 0.55) * depth;

  // extra "placement" (separate from parallax feel)
  const placeY = ny * VERTICAL_PLACE;

  // world position + wrap
  const worldX = item.baseX + scrollX;
  const xWrapped = wrap(worldX, loopWidth);

  // shove into view: center the loop around viewport roughly
  // (you can refine later)
  const x = xWrapped - loopWidth * 0.5;

  const y = item.baseY;

  const scale = item.baseScale * (hovered ? HOVER_SCALE : 1);

  // quantized z by depth band, hover gets a huge boost
  const z = item.zBand * 10 + (hovered ? 9999 : 0);

  // size: smaller overall than before, but responsive
  const width = 'clamp(140px, 16vw, 260px)';

  return (
    <div
      onPointerEnter={(e) => {
        e.stopPropagation();
        setHoveredId(item.id);
      }}
      onPointerLeave={(e) => {
        e.stopPropagation();
        setHoveredId(null);
      }}
      onPointerMove={(e) => e.stopPropagation()}
      style={{
        position: 'absolute',
        left: '50%',
        top: 0,
        width,
        zIndex: z,
        transform: `translate3d(${x + parX}px, ${y + parY + placeY}px, 0) scale(${scale})`,
        transformOrigin: 'center center',
        willChange: 'transform',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        cursor: hovered ? 'grab' : 'default',
        pointerEvents: 'auto',
      }}
    >
      <MediaLoader
        type="image"
        src={item.image}
        alt={item.alt}
        className="tooltip-none" // important: avoid tooltip on images; keep it on canvas
        objectPosition="center center"
        style={{
          width: '100%',
          height: 'auto',
          display: 'block',
          pointerEvents: 'none', // ✅ hover stays on wrapper div
        }}
      />
    </div>
  );
}
