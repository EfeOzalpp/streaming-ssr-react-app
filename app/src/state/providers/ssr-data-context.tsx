// src/state/providers/ssr-data-context.tsx
import React, { createContext, useContext } from 'react';

// Keep this aligned with what the server injects into window.__SSR_DATA__
export type SsrPayload = {
  seed?: number; // used to deterministically shuffle on client
  preloaded: Record<string, any | null>; // { [projectKey]: sanitized Sanity data }
};

const SsrDataContext = createContext<SsrPayload | null>(null);

export const useSsrData = () => useContext(SsrDataContext);

export function SsrDataProvider({
  value,
  children,
}: {
  value: SsrPayload | null;
  children: React.ReactNode;
}) {
  return <SsrDataContext.Provider value={value}>{children}</SsrDataContext.Provider>;
}
