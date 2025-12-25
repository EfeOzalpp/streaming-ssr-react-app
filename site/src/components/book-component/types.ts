export type ImageDemanded = {
  title?: string;
  alt?: string;
  image?: any;
};

export type DragItem = {
  id: string;
  alt: string;
  image: any;

  // base layout in "world space"
  baseX: number;
  baseY: number;

  // 0..1 (0 far, 1 near)
  depth: number;

  // scale that never degrades quality (we'll request higher res)
  baseScale: number;

  // quantized band for z-index (derived from depth)
  zBand: number;
};
