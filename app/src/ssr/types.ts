// src/ssr/types.ts
import type { ReactNode } from 'react';
import type { ProjectKey } from '../content-orchestration/component-loader';

export type SsrDescriptor = {
  fetch: ((seed?: number) => Promise<any>);
  render: (data: any) => ReactNode;
  /** optional: build <link rel="preload"> tags for the head */
  buildPreloads?: (data: any) => string[];

  /** OPTIONAL: list of CSS files to inline as critical when this project is first */
  criticalCssFiles?: string[]; // absolute OR project-root-relative paths
};

export type SsrRegistry = Partial<Record<ProjectKey, SsrDescriptor>>;
