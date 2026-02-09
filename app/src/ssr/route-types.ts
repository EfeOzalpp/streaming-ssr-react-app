// src/ssr/route-types.ts
import type { ReactNode } from 'react';

export type RouteKey = 'dynamic-theme';

export type RouteSsrDescriptor =
  | {
      fetch: () => Promise<any>;
      render: (data: any) => ReactNode;
      buildPreloads?: (data: any) => string[];
      criticalCssFiles?: string[];
    }
  | {
      fetch: (seed: number) => Promise<any>;
      render: (data: any) => ReactNode;
      buildPreloads?: (data: any) => string[];
      criticalCssFiles?: string[];
    };

export type RouteSsrRegistry = Partial<Record<RouteKey, RouteSsrDescriptor>>;
