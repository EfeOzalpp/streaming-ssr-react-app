// src/components/rock-escapade/game-viewport-overlay.tsx
import React, { useRef } from 'react';
import { createPortal } from 'react-dom';

type Props = { children: React.ReactNode };

const APP_SCOPE_ID = 'main-shell';
const PORTAL_ID = 'game-viewport-root';

export default function GameViewportOverlay({ children }: Props) {
  const mountRef = useRef<HTMLElement | null>(null);

  if (!mountRef.current && typeof document !== 'undefined') {
    // 1) Find your app scope (so pre-scoped CSS matches)
    const scope = document.getElementById(APP_SCOPE_ID) || document.body;

    // 2) Create or reuse the portal root inside that scope
    let root = scope.querySelector<HTMLElement>(`#${PORTAL_ID}`);
    if (!root) {
      root = document.createElement('div');
      root.id = PORTAL_ID;
      scope.appendChild(root);
    }

    mountRef.current = root;
  }

  if (!mountRef.current) return null;

  // 3) Portal the in-game UI
  return createPortal(
    <div className="game-viewport-layer" role="dialog" aria-modal="true">
      {children}
    </div>,
    mountRef.current
  );
}
