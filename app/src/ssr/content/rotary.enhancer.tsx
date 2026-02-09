// src/ssr/projects/rotary.enhancer.tsx
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import SplitDragHandler from '../../components/general-ui/split-feature/split-controller';
import { useTooltipInit } from '../../components/general-ui/tooltip/tooltipInit';
import { applySplitStyle } from '../../components/general-ui/split-feature/split-pre-hydration';

export default function RotaryEnhancer() {
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [split, setSplit] = useState(() => (window.innerWidth < 768 ? 55 : 50));
  const [isPortrait, setIsPortrait] = useState(window.innerHeight > window.innerWidth);

  useTooltipInit();

  useEffect(() => {
    document.getElementById('rotary-ssr')?.classList.remove('ssr-initial-split');

    // Upgrade images from SSR medium-quality to high-quality
    const img1El = document.querySelector('#rotary-ssr #rotary-media-1') as HTMLImageElement | null;
    const img2El = document.querySelector('#rotary-ssr #rotary-media-2') as HTMLImageElement | null;

    const full1 = img1El?.dataset?.srcFull;
    const full2 = img2El?.dataset?.srcFull;

    if (img1El && full1 && img1El.src !== full1) img1El.src = full1;
    if (img2El && full2 && img2El.src !== full2) img2El.src = full2;

    setHost(document.getElementById('rotary-enhancer-mount'));

    // Initial apply
    applySplitStyle(split, isPortrait, {
      m1: 'rotary-media-1-container',
      m2: 'rotary-media-2-container',
    });

    const onResize = () => {
      const p = window.innerHeight > window.innerWidth;
      setIsPortrait(p);
      applySplitStyle(split, p, {
        m1: 'rotary-media-1-container',
        m2: 'rotary-media-2-container',
      });
    };
    window.addEventListener('resize', onResize, { passive: true });
    return () => window.removeEventListener('resize', onResize);
  }, []); // run once

  useEffect(() => {
    applySplitStyle(split, isPortrait, {
      m1: 'rotary-media-1-container',
      m2: 'rotary-media-2-container',
    });
  }, [split, isPortrait]);

  if (!host) return null;
  return createPortal(
    <SplitDragHandler
      split={split}
      setSplit={setSplit}
      ids={{ m1: 'rotary-media-1-container', m2: 'rotary-media-2-container' }}
    />,
    host
  );
}
