// src/dynamic-app/lib/palette.ts

export type Quartet = [string, string, string, string];
export type Triplet = [string, string, string];

const WHITE = '#FFFFFF';

// resolve alt → palette (handles trailing spaces too)
export function resolvePalette(
  altRaw: string | null | undefined,
  colorMapping: Record<string, Quartet | undefined>
): Quartet | null {
  if (!altRaw) return null;
  const exact = colorMapping[altRaw];
  if (Array.isArray(exact)) return exact as Quartet;
  const trimmed = colorMapping[altRaw.trim()];
  if (Array.isArray(trimmed)) return trimmed as Quartet;
  return null;
}

// compute state from a quartet
export function computeStateFromPalette(
  q: Quartet | null,
  win: Window = window
): { activeColor: string; movingText: Triplet; lastKnown: string } {
  const palette: Quartet = q ?? [WHITE, WHITE, WHITE, WHITE];
  const [c0, c1, c2, c3] = palette;

  // desktop/mobile branching for first slot
  const isDesktop = win.innerWidth >= 1024;
  const first = isDesktop ? (c1 ?? WHITE) : (c0 ?? WHITE);

  const movingText: Triplet = [first, c1 ?? WHITE, c3 ?? c2 ?? WHITE];
  const activeColor = c2 ?? WHITE;

  return { activeColor, movingText, lastKnown: activeColor };
}
