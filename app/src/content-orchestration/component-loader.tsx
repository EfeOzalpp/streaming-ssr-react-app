// src/content-orchestration/component-loader.tsx
import { type ComponentType } from 'react';
import { useSsrData } from '../state/providers/ssr-data-context';
import { ssrRegistry } from '../ssr/registry';

// ----- Async loaders for non-dynamic projects
export const componentMap = {
  rotary: () => import('../components/block-type-1/rotary-lamp'),
  scoop: () => import('../components/block-type-1/ice-cream-scoop'),
  dataviz: () => import('../components/block-type-1/data-visualization'),
} as const;

// ----- Split loaders for dynamic (frame & shadow)
export const dynamicLoaders = {
  frame: () =>
    import(
      /* webpackChunkName: "dynamic-frame" */
      '../components/dynamic-app/frame'
    ),
  shadow: () =>
    import(
      /* webpackChunkName: "dynamic-shadow" */
      '../components/dynamic-app/shadowEntry'
    ),
} as const;

export const gameLoaders = {
  components: () =>
    import(
      /* webpackChunkName: "components" */
      '../components/rock-escapade/block-g-host'
    ),
  game: () =>
    import(
      /* webpackChunkName: "game" */
      '../components/rock-escapade/game-canvas'
    ),
} as const;

// Explicit union preserves "dynamic" as a valid key
export type ProjectKey = 'rotary' | 'scoop' | 'dataviz' | 'climate' | 'game' | 'dynamic';

export interface ProjectMeta {
  key: ProjectKey;
  title: string;
  isLink?: boolean;
}

export interface Project extends ProjectMeta {
  lazyImport: () => Promise<{ default: ComponentType<any> }>;
}

const toComponent = <T extends ComponentType<any>>(
  p: Promise<{ default: T }>
): Promise<{ default: ComponentType<any> }> =>
  p as unknown as Promise<{ default: ComponentType<any> }>;

// Stable base list (default client loaders).
// For "dynamic", point to the lightweight frame by default.
// Shadow chunk is mounted separately by the SSR enhancer (SSR path)
// or by ProjectPane's HeavyMount (client-only path).
export const baseProjects: Project[] = [
  {
    key: 'scoop',
    title: 'Ice Cream Scoop',
    lazyImport: () => toComponent(import('../components/block-type-1/ice-cream-scoop')),
  },
  {
    key: 'rotary',
    title: 'Rotary Lamp',
    lazyImport: () => toComponent(import('../components/block-type-1/rotary-lamp')),
  },
  {
    key: 'dataviz',
    title: 'Data Visualization',
    lazyImport: () => toComponent(import('../components/block-type-1/data-visualization')),
  },
  {
    key: 'game',
    title: 'Evade the Rock',
    lazyImport: () => toComponent(gameLoaders.components()),
  },
  {
    key: 'dynamic',
    title: 'Dynamic App',
    isLink: true,
    lazyImport: () => toComponent(dynamicLoaders.frame()),
  },
];

// Hook that returns a loader respecting SSR (when present) and client lazy loading.
export function useProjectLoader(key: ProjectKey) {
  const ssr = useSsrData();
  const project = baseProjects.find((p) => p.key === key);
  if (!project) throw new Error(`Unknown project key: ${key}`);

  const payload = ssr?.preloaded?.[key];
  const desc = ssrRegistry[key];

  // --- SSR path: render prebuilt HTML (and attach enhancers) ---
  if (payload && desc?.render) {
    const data = (payload as any).data ?? payload;

    if (key === 'rotary') {
      return async () => {
        const Enhancer = (await import('../ssr/content/rotary.enhancer')).default;
        return {
          default: () => (
            <>
              {desc.render!(data)}
              <Enhancer />
            </>
          ),
        };
      };
    }

    if (key === 'scoop') {
      return async () => {
        const Enhancer = (await import('../ssr/content/scoop.enhancer')).default;
        return {
          default: () => (
            <>
              {desc.render!(data)}
              <Enhancer />
            </>
          ),
        };
      };
    }

    if (key === 'dataviz') {
      return async () => {
        const Enhancer = (await import('../ssr/content/dataviz.enhancer')).default;
        return {
          default: () => (
            <>
              {desc.render!(data)}
              <Enhancer />
            </>
          ),
        };
      };
    }

    if (key === 'dynamic') {
      // the dynamic SSR enhancer computes overlay sizing AND mounts shadow app
      return async () => {
        const Enhancer = (await import('../ssr/content/dynamic.enhancer')).default;
        return {
          default: () => (
            <>
              {desc.render!(data)} {/* SSR frame HTML (picture + img + overlay + spinner) */}
              <Enhancer />          {/* overlay sizing + shadow attach (lazy by IO/idle) */}
            </>
          ),
        };
      };
    }

     if (key === 'game') {
    return async () => {
      const Enhancer = (await import('../ssr/content/game.enhancer')).default;
      return {
        default: () => (
          <>
            {desc.render!(data)} {/* SSR onboarding (coin + text) */}
            <Enhancer />         {/* Hydrates into BlockGHost when visible/idle */}
          </>
        ),
      };
    };
  }

    // Default SSR (no enhancer)
    return async () => ({ default: () => <>{desc.render!(data)}</> });
  }

  // --- Client lazy path ---
  if (key === 'dynamic') {
    // Ensure the default loader is just the lightweight frame
    return dynamicLoaders.frame as unknown as () => Promise<{ default: ComponentType<any> }>;
  }

    if (key === 'game') {
    // Ensure the default loader is just the lightweight frame
    return gameLoaders.components as unknown as () => Promise<{ default: ComponentType<any> }>;
  }

  return project.lazyImport;
}
