// src/ssr/project/game.enhancer/game-input-guards.tsx
import React, { useEffect, useRef } from 'react';

type Props = {
  /** When true, guards are active */
  active: boolean;
  /** Hide body scroll while active (restores previous value on cleanup) */
  lockBodyScroll?: boolean;
  /** Also block wheel scrolling while active */
  alsoBlockWheel?: boolean;
  /** Also block touchmove scrolling while active */
  alsoBlockTouch?: boolean;
  /** Don’t block when typing in inputs/selects/textareas */
  allowWhenTyping?: boolean;
  /** Extra keyboard keys to block (in addition to scroll keys) */
  extraKeysToBlock?: string[];
};

const SCROLL_KEYS = new Set([
  ' ', 'Spacebar',         // Space
  'ArrowUp', 'ArrowDown',
  'ArrowLeft', 'ArrowRight',
  'PageUp', 'PageDown',
  'Home', 'End',
]);

const isFormField = (el: HTMLElement | null) => {
  const tag = el?.tagName;
  return !!tag && /^(INPUT|TEXTAREA|SELECT)$/.test(tag);
};

const GameInputGuards: React.FC<Props> = ({
  active,
  lockBodyScroll = true,
  alsoBlockWheel = true,
  alsoBlockTouch = true,
  allowWhenTyping = true,
  extraKeysToBlock = [],
}) => {
  const prevOverflow = useRef<string | null>(null);
  const prevOverscroll = useRef<string | null>(null);
  const extra = new Set(extraKeysToBlock);

  // Keyboard guard (block default scroll behavior)
  useEffect(() => {
    if (!active) return;

    const onKey = (e: KeyboardEvent) => {
      if (allowWhenTyping && isFormField(e.target as HTMLElement | null)) return;

      const k = e.key;
      if (SCROLL_KEYS.has(k) || extra.has(k)) {
        // important: prevent default so page/scroll-controllers don’t react
        e.preventDefault();
        // do NOT stopPropagation, so the game can still read the event
      }
    };

    // capture + passive:false to reliably intercept before site handlers
    window.addEventListener('keydown', onKey, { capture: true, passive: false });
    window.addEventListener('keypress', onKey as any, { capture: true, passive: false } as any);

    return () => {
      window.removeEventListener('keydown', onKey as any, { capture: true } as any);
      window.removeEventListener('keypress', onKey as any, { capture: true } as any);
    };
  }, [active, allowWhenTyping, extraKeysToBlock.join('|')]);

  // Wheel / touch scroll guards
  useEffect(() => {
    if (!active) return;

    const block = (e: Event) => { e.preventDefault(); };

    if (alsoBlockWheel) window.addEventListener('wheel', block, { passive: false });
    if (alsoBlockTouch) window.addEventListener('touchmove', block, { passive: false });

    return () => {
      if (alsoBlockWheel) window.removeEventListener('wheel', block as any);
      if (alsoBlockTouch) window.removeEventListener('touchmove', block as any);
    };
  }, [active, alsoBlockWheel, alsoBlockTouch]);

  // Body scroll lock (and overscroll containment to help iOS)
  useEffect(() => {
    if (!active || !lockBodyScroll) return;
    const body = document.body;
    prevOverflow.current = body.style.overflow;
    prevOverscroll.current = (body.style as any).overscrollBehavior || null;

    body.style.overflow = 'hidden';
    (body.style as any).overscrollBehavior = 'contain';

    return () => {
      body.style.overflow = prevOverflow.current ?? '';
      (body.style as any).overscrollBehavior = prevOverscroll.current ?? '';
    };
  }, [active, lockBodyScroll]);

  return null;
};

export default GameInputGuards;
