// src/ssr/route-registry.ts
import type { RouteSsrRegistry } from './route-types';
import { dynamicThemeSSR } from './dynamic-app/dynamic-theme.ssr';

export const routeRegistry: RouteSsrRegistry = {
  'dynamic-theme': dynamicThemeSSR,
};
