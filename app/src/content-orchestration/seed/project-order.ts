// src/content-orchestration/seed/project-order.ts
import { seededShuffle } from './index';

export type Keyed = { key: string };

export function orderProjectsTopTwoSeeded<T extends Keyed>(
  projects: readonly T[],
  seed: number,
  topKeys: readonly string[] = ['dynamic', 'game']
): T[] {
  const byKey = new Map(projects.map(p => [p.key, p] as const));

  const topCandidates = topKeys.map(k => byKey.get(k)).filter(Boolean) as T[];
  const topTwo = seededShuffle(topCandidates, seed);

  const topSet = new Set(topKeys);
  const rest = projects.filter(p => !topSet.has(p.key));
  const restShuffled = seededShuffle(rest, seed + 1);

  return [...topTwo, ...restShuffled];
}
