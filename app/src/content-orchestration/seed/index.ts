// src/content-orchestration/seed/index.ts

// --- PRNG (splitmix32) ---
export function splitmix32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x9e3779b9) >>> 0;
    let t = a ^ (a >>> 16);
    t = Math.imul(t, 0x85ebca6b) >>> 0;
    t ^= t >>> 13;
    t = Math.imul(t, 0xc2b2ae35) >>> 0;
    t ^= t >>> 16;
    return (t >>> 0) / 4294967296;
  };
}

// --- seed from string (FNV-1a-ish) ---
export function stringToSeed(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// --- deterministic Fisher–Yates ---
export function seededShuffle<T>(arr: readonly T[], seed: number): T[] {
  const rand = splitmix32(seed);
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
