import { splitmix32, stringToSeed, seededShuffle } from '../index';
import { orderProjectsTopTwoSeeded } from '../project-order';

// ─── splitmix32 ────────────────────────────────────────────────────────────

describe('splitmix32', () => {
  it('returns values in [0, 1)', () => {
    const rand = splitmix32(42);
    for (let i = 0; i < 100; i++) {
      const v = rand();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('is deterministic — same seed produces same sequence', () => {
    const r1 = splitmix32(99);
    const r2 = splitmix32(99);
    for (let i = 0; i < 20; i++) {
      expect(r1()).toBe(r2());
    }
  });

  it('different seeds produce different first values', () => {
    expect(splitmix32(1)()).not.toBe(splitmix32(2)());
  });
});

// ─── stringToSeed ──────────────────────────────────────────────────────────

describe('stringToSeed', () => {
  it('returns a non-negative integer', () => {
    const seed = stringToSeed('hello');
    expect(seed).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(seed)).toBe(true);
  });

  it('is deterministic — same string returns same number', () => {
    expect(stringToSeed('abc')).toBe(stringToSeed('abc'));
  });

  it('different strings return different seeds', () => {
    expect(stringToSeed('foo')).not.toBe(stringToSeed('bar'));
  });

  it('handles empty string without throwing', () => {
    expect(() => stringToSeed('')).not.toThrow();
  });
});

// ─── seededShuffle ─────────────────────────────────────────────────────────

describe('seededShuffle', () => {
  const items = ['a', 'b', 'c', 'd', 'e'];

  it('returns the same length as input', () => {
    expect(seededShuffle(items, 1).length).toBe(items.length);
  });

  it('contains all original elements', () => {
    const result = seededShuffle(items, 1);
    expect(result.sort()).toEqual([...items].sort());
  });

  it('is deterministic — same seed + same array produces same order', () => {
    expect(seededShuffle(items, 42)).toEqual(seededShuffle(items, 42));
  });

  it('different seeds produce different orders', () => {
    // With 5 elements the chance of collision is extremely low
    expect(seededShuffle(items, 1)).not.toEqual(seededShuffle(items, 999999));
  });

  it('does not mutate the original array', () => {
    const original = ['x', 'y', 'z'];
    const copy = [...original];
    seededShuffle(original, 7);
    expect(original).toEqual(copy);
  });

  it('handles empty array', () => {
    expect(seededShuffle([], 1)).toEqual([]);
  });

  it('handles single element', () => {
    expect(seededShuffle(['only'], 1)).toEqual(['only']);
  });
});

// ─── orderProjectsTopTwoSeeded ─────────────────────────────────────────────

describe('orderProjectsTopTwoSeeded', () => {
  const projects = [
    { key: 'scoop' },
    { key: 'dynamic' },
    { key: 'rotary' },
    { key: 'game' },
    { key: 'dataviz' },
  ];

  it('always places topKeys within the first N positions', () => {
    const result = orderProjectsTopTwoSeeded(projects, 42);
    const topKeys = new Set(['dynamic', 'game']);
    const firstTwo = result.slice(0, 2).map(p => p.key);
    expect(firstTwo.every(k => topKeys.has(k))).toBe(true);
  });

  it('rest projects follow after topKeys', () => {
    const result = orderProjectsTopTwoSeeded(projects, 42);
    const rest = result.slice(2).map(p => p.key);
    expect(rest).not.toContain('dynamic');
    expect(rest).not.toContain('game');
  });

  it('is deterministic — same seed produces same order', () => {
    const r1 = orderProjectsTopTwoSeeded(projects, 100);
    const r2 = orderProjectsTopTwoSeeded(projects, 100);
    expect(r1.map(p => p.key)).toEqual(r2.map(p => p.key));
  });

  it('different seeds can produce different orders', () => {
    const orders = new Set(
      Array.from({ length: 10 }, (_, i) =>
        orderProjectsTopTwoSeeded(projects, i * 1000)
          .map(p => p.key)
          .join(',')
      )
    );
    // At least 2 distinct orderings across 10 seeds
    expect(orders.size).toBeGreaterThan(1);
  });

  it('skips topKeys that are not in the projects list', () => {
    const result = orderProjectsTopTwoSeeded(projects, 1, ['nonexistent', 'dynamic']);
    expect(result[0].key).toBe('dynamic');
  });

  it('returns all projects with no duplicates', () => {
    const result = orderProjectsTopTwoSeeded(projects, 1);
    const keys = result.map(p => p.key);
    expect(keys.length).toBe(projects.length);
    expect(new Set(keys).size).toBe(projects.length);
  });
});
