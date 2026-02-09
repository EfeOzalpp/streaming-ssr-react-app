// src/server/prepareSsrData.ts
import { baseProjects } from '../content-orchestration/component-loader';
import { ssrRegistry } from '../ssr/registry';
import { orderProjectsTopTwoSeeded } from '../content-orchestration/seed/project-order';

export async function prepareSsrData(seed: number, count = 3) {
  const preloaded: Record<string, any> = {};
  const preloadLinks: string[] = [];

  orderProjectsTopTwoSeeded(baseProjects, seed)
  
  const ordered = orderProjectsTopTwoSeeded(baseProjects, seed);
  const top = ordered.slice(0, count);

  for (const proj of top) {
    const desc = ssrRegistry[proj.key];
    if (!desc?.fetch) continue;

    // use the safer fetch calling pattern if any fetch needs seed:
    const data = await (desc.fetch.length === 0 ? desc.fetch() : desc.fetch(seed));
    preloaded[proj.key] = { kind: proj.key, data };
  }

  return { seed, preloaded, preloadLinks };
}
