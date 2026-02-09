// src/components/dynamic-app/shadow-entry.tsx
import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import DynamicAppInbound from '../../dynamic-app/dynamic-app-shadow.jsx';

type Props = { blockId: string };

const ShadowEntry: React.FC<Props> = ({ blockId }) => {
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const container = document.getElementById(blockId);
    if (!container) return;

    const tryFind = () => {
      const overlay = container.querySelector<HTMLElement>('.screen-overlay') || null;
      if (overlay) {
        setTarget(overlay);
        return true;
      }
      return false;
    };

    if (tryFind()) return;

    const observer = new MutationObserver(() => {
      if (tryFind()) observer.disconnect();
    });
    observer.observe(container, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [blockId]);

  // Announce mount/unmount of the embedded scroll container to the outer controller
  useEffect(() => {
    if (!target) return;
    const detail = { el: target, blockId };
    window.dispatchEvent(new CustomEvent('embedded-app:mounted', { detail }));
    return () => {
      window.dispatchEvent(new CustomEvent('embedded-app:unmounted', { detail }));
    };
  }, [target, blockId]);

  // Called by DynamicAppInbound (guarded there) on first paint
  const handleReady = () => {
    // hide any SSR/client spinner if present
    const loader = document.getElementById('dynamic-overlay-loader');
    if (loader) loader.style.display = 'none';
    // notify listeners (e.g. enhancer / other logic)
    window.dispatchEvent(new CustomEvent('dynamic-app:hydrated'));
  };

  if (!target) return null;

  return ReactDOM.createPortal(
    <DynamicAppInbound onFocusChange={() => {}} onReady={handleReady} />,
    target
  );
};

export default ShadowEntry;
