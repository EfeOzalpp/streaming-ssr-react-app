// src/dynamic-app/dynamic-app-shadow.jsx
// dynamic app shadow DOM wrapper
import React, { useRef, useEffect, useState } from 'react';
import createShadowRoot from 'react-shadow';
import DynamicTheme from './dynamic-app-landing.jsx';
import { ShadowRootProvider } from '../state/providers/shadow-root-context';

const DynamicAppInbound = ({ onFocusChange, onReady }) => {
  const shadowRef = useRef(null);
  const [shadowRoot, setShadowRoot] = useState(null);
  const ShadowRoot = createShadowRoot.div;

  // ensure we only ever signal ready once
  const readySentRef = useRef(false);
  const sendReady = () => {
    if (readySentRef.current) return;
    readySentRef.current = true;
    try { onReady?.(); } catch {}
  };

  useEffect(() => {
    const t = setTimeout(() => {
      const root = shadowRef.current?.getRootNode?.();
      if (root && root.host) {
        setShadowRoot(root);
        // first visual frame -> tell enhancer we’re ready
        requestAnimationFrame(sendReady);
      } else {
        console.warn('[Not a ShadowRoot]', root);
      }
    }, 0);
    return () => clearTimeout(t);
  }, [onReady]); // safe for HMR

  useEffect(() => {
    const el = shadowRef.current;
    if (!el) return;

    let startY = 0;
    let focusTriggered = false;

    const triggerSyntheticClick = () => {
      const down = new PointerEvent('pointerdown', {
        bubbles: true, cancelable: true, composed: true, pointerType: 'touch',
      });
      el.dispatchEvent(down);
      onFocusChange?.(true);
      console.log('[Focus triggered in embedded app]');
    };

    const handleTouchStart = (e) => {
      if (e.touches.length === 0) return;
      startY = e.touches[0].clientY;
      focusTriggered = false;
    };

    const handleTouchMove = (e) => {
      if (focusTriggered || e.touches.length === 0) return;
      const deltaY = e.touches[0].clientY - startY;
      if (Math.abs(deltaY) > 1) {
        el.scrollTop += 1;
        triggerSyntheticClick();
        focusTriggered = true;
      }
    };

    if ('ontouchstart' in window) {
      el.addEventListener('touchstart', handleTouchStart, { passive: true });
      el.addEventListener('touchmove', handleTouchMove, { passive: true });
    }
    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
    };
  }, [onFocusChange]);

  return (
    <div className="embedded-app">
      <ShadowRoot>
        <div ref={shadowRef} className="dynamic-app" id="shadow-dynamic-app">
          {shadowRoot ? (
            <ShadowRootProvider getShadowRoot={() => shadowRoot}>
              {/* pass the guarded ready down so either level can signal */}
              <DynamicTheme onReady={sendReady} />
            </ShadowRootProvider>
          ) : null}
        </div> 
      </ShadowRoot>
    </div>
  );
};

export default DynamicAppInbound;
