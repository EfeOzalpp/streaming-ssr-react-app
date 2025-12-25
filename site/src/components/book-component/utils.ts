// components/book-component/utils.ts
import type { DragItem, ImageDemanded } from './types';

function hash01(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10000) / 10000;
}

function quantize(n: number, steps: number) {
  return Math.round(n * steps) / steps;
}

export function seededItems(raw: ImageDemanded[]): DragItem[] {
  const items = raw.filter(r => r?.image);

  // collage "world" width: enough to feel endless
  // (you can tune this)
  const GAP = 120;
  const BASE_W = 360;
  const worldStep = BASE_W + GAP;

  return items.map((d, idx) => {
    const id = d.title || `book-${idx}`;
    const r1 = hash01(id + ':a');
    const r2 = hash01(id + ':b');

    const depth = quantize(0.15 + r1 * 0.85, 6);          // quantized depth bands
    const baseScale = 0.65 + r2 * 0.55;                  // free-flow scale (but seeded)
    const zBand = Math.floor(depth * 10);                // quantized z band

    return {
      id,
      alt: d.alt || d.title || 'Climate Book Art',
      image: d.image,
      baseX: idx * worldStep,                            // distribute horizontally
      baseY: 80 + (idx % 5) * 90 + (r2 - 0.5) * 60,       // loose rows
      depth,
      baseScale,
      zBand,
    };
  });
}
