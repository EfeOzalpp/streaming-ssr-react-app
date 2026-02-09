// src/components/general-ui/split-feature/split-controller.tsx 
import React, { useRef, useEffect, useLayoutEffect, useState } from 'react';
import lottie from '../../../behaviors/load-lottie';
import { useProjectVisibility } from '../../../state/providers/project-context';
import arrowData2 from '../../../json-assets/arrow2.json';
import {
  applySplitStyle,
  getPortraitMinSplit,
} from './split-pre-hydration';

type SplitDragHandlerProps = {
  split: number;
  setSplit: React.Dispatch<React.SetStateAction<number>>;
  ids?: { m1: string; m2: string };
  minPortraitSplit?: number;
};

const FLOOR_EPS = 0.25;
const PULSE_LOW_OPACITY = 0.35;
const PULSE_FADE_MS = 1500;
const PULSE_HOLD_MS = 180;
const PULSE_COOLDOWN_MS = 700;

// minimal Lottie shape we use
type AnimationItemLike = {
  goToAndStop: (v: number, isFrame?: boolean) => void;
  playSegments: (seg: [number, number] | number[], force?: boolean) => void;
  addEventListener: (name: string, cb: () => void) => void;
  removeEventListener: (name: string, cb: () => void) => void;
  destroy: () => void;
  // optional field used in a fallback
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [k: string]: any;
};

const SplitDragHandler: React.FC<SplitDragHandlerProps> = ({
  split,
  setSplit,
  ids,
  minPortraitSplit,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { setIsDragging } = useProjectVisibility();

  const splitRef = useRef(split);
  const isDraggingRef = useRef(false);
  const isHoveringRef = useRef(false);

  const arrowContainer = useRef<HTMLDivElement | null>(null);
  const arrowAnimRef = useRef<AnimationItemLike | null>(null);

  const [isPortrait, setIsPortrait] = useState(
    typeof window !== 'undefined' ? window.innerHeight > window.innerWidth : false
  );
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  const minRef = useRef<number>(
    typeof minPortraitSplit === 'number'
      ? minPortraitSplit
      : getPortraitMinSplit(typeof window !== 'undefined' ? window.innerWidth : undefined)
  );

  const initialPinchDistance = useRef<number | null>(null);
  const pinchTriggeredRef = useRef(false);
  const pinchThreshold = 10;
  const lastPulseAtRef = useRef(0);

  const playSegment = (() => {
    let lastCompleteHandler: ((this: any) => void) | null = null;
    let currentSegment: [number, number] | null = null;

    return (segment: [number, number], holdFrame: number) => {
      const anim = arrowAnimRef.current;
      if (!anim) return;

      if (lastCompleteHandler) {
        anim.removeEventListener('complete', lastCompleteHandler as any);
        lastCompleteHandler = null;
      }

      currentSegment = segment;

      const onComplete = () => {
        anim.removeEventListener('complete', onComplete as any);
        lastCompleteHandler = null;
        const currentFrame = (anim as any).currentFrame ?? 0;
        if (currentSegment && Math.abs(currentFrame - currentSegment[1]) <= 2) {
          anim.goToAndStop(holdFrame, true);
        }
      };

      lastCompleteHandler = onComplete;
      anim.addEventListener('complete', onComplete as any);
      anim.playSegments(segment, true);
    };
  })();

  const pulseLottie = async () => {
    const now = performance.now();
    if (now - lastPulseAtRef.current < PULSE_COOLDOWN_MS) return;
    lastPulseAtRef.current = now;

    const node = arrowContainer.current;
    if (!node) return;

    const prevTransition = node.style.transition;
    try {
      node.style.transition = `opacity ${PULSE_FADE_MS}ms ease`;
      node.style.opacity = `${PULSE_LOW_OPACITY}`;
      await new Promise((r) => setTimeout(r, PULSE_FADE_MS + PULSE_HOLD_MS));
      node.style.opacity = '1';
      await new Promise((r) => setTimeout(r, PULSE_FADE_MS));
    } finally {
      node.style.opacity = '1';
      node.style.transition = prevTransition;
    }
  };

  // Initial apply (SSR ids only)
  useLayoutEffect(() => {
    if (!ids) return;
    const portraitNow = window.innerHeight > window.innerWidth;
    setIsPortrait(portraitNow);
    minRef.current =
      typeof minPortraitSplit === 'number'
        ? minPortraitSplit
        : getPortraitMinSplit(window.innerWidth);
    applySplitStyle(splitRef.current, portraitNow, ids, minRef.current);
  }, [ids, minPortraitSplit]);

  // Resize/orientation listener
  useEffect(() => {
    const handleResize = () => {
      const portraitNow = window.innerHeight > window.innerWidth;
      setIsPortrait(portraitNow);
      minRef.current =
        typeof minPortraitSplit === 'number'
          ? minPortraitSplit
          : getPortraitMinSplit(window.innerWidth);
      if (ids) applySplitStyle(splitRef.current, portraitNow, ids, minRef.current);
    };
    window.addEventListener('resize', handleResize, { passive: true });
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
    return () => window.removeEventListener('resize', handleResize);
  }, [ids, minPortraitSplit]);

  // Sync DOM on split/orientation change
  useEffect(() => {
    splitRef.current = split;
    if (ids) applySplitStyle(split, isPortrait, ids, minRef.current);
  }, [split, isPortrait, ids]);

  const handlePointerMove = (clientX: number, clientY: number) => {
    if (!isDraggingRef.current) return;

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const portraitNow = vh > vw;

    const minPortrait =
      typeof minPortraitSplit === 'number' ? minPortraitSplit : getPortraitMinSplit(vw);

    let next = portraitNow ? (clientY / vh) * 100 : (clientX / vw) * 100;

    if (portraitNow) {
      const TOP = minPortrait;
      const BOTTOM = 100 - minPortrait;
      next = Math.max(TOP, Math.min(BOTTOM, next));

      if (next <= TOP + FLOOR_EPS || next >= BOTTOM - FLOOR_EPS) {
        pulseLottie();
      }
    } else {
      next = Math.max(0, Math.min(100, next));
    }

    splitRef.current = next;
    setSplit(next);
    if (ids) applySplitStyle(next, portraitNow, ids, minPortrait);
  };

  const handleMouseMove = (e: MouseEvent) => handlePointerMove(e.clientX, e.clientY);
  const handleTouchMove = (e: TouchEvent) => {
    if (e.touches.length === 1 && isDraggingRef.current && !pinchTriggeredRef.current) {
      e.preventDefault();
      handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
    } else if (e.touches.length === 2 && !isDraggingRef.current) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (initialPinchDistance.current === null) {
        initialPinchDistance.current = distance;
      } else if (!pinchTriggeredRef.current) {
        const diff = Math.abs(distance - initialPinchDistance.current);
        if (diff > pinchThreshold) {
          pinchTriggeredRef.current = true;
          isDraggingRef.current = false;
          setIsDragging(false);
          splitRef.current = 50;
          setSplit(50);
          if (ids) applySplitStyle(50, isPortrait, ids, minRef.current);
          initialPinchDistance.current = null;
        }
      }
    }
  };

  const startDragging = (e: Event) => {
    e.preventDefault();
    isDraggingRef.current = true;
    setIsDragging(true);

    const anim = arrowAnimRef.current;
    if (anim) {
      if (isTouchDevice) anim.playSegments([0, 25], true);
      else anim.goToAndStop(25, true);
    }

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', stopDragging);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', stopDragging);
  };

  const stopDragging = () => {
    isDraggingRef.current = false;
    setIsDragging(false);

    const anim = arrowAnimRef.current;
    if (anim) {
      if (isTouchDevice) anim.playSegments([25, 75], true);
      else if (isHoveringRef.current) anim.goToAndStop(25, true);
      else anim.playSegments([25, 75], true);
    }

    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', stopDragging);
    window.removeEventListener('touchmove', handleTouchMove);
    window.removeEventListener('touchend', stopDragging);
  };

  const handleMouseEnter = () => {
    isHoveringRef.current = true;
    if (isDraggingRef.current) {
      arrowAnimRef.current?.goToAndStop(25, true);
      return;
    }
    playSegment([0, 25], 25);
  };

  const handleMouseLeave = () => {
    isHoveringRef.current = false;
    if (isDraggingRef.current) {
      arrowAnimRef.current?.goToAndStop(25, true);
      return;
    }
    playSegment([25, 75], 75);
  };

  const handleTouchStart = (e: TouchEvent) => {
    e.preventDefault();
    startDragging(e as unknown as Event);
  };

  const handleTouchEnd = async (e: TouchEvent) => {
    let endSplit = splitRef.current;
    if (e.changedTouches.length === 1) {
      const t = e.changedTouches[0];
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const portraitNow = vh > vw;
      endSplit = portraitNow ? (t.clientY / vh) * 100 : (t.clientX / vw) * 100;

      const minPortrait =
        typeof minPortraitSplit === 'number' ? minPortraitSplit : getPortraitMinSplit(vw);

      if (portraitNow) {
        const TOP = minPortrait;
        const BOTTOM = 100 - minPortrait;
        endSplit = Math.max(TOP, Math.min(BOTTOM, endSplit));
      } else {
        endSplit = Math.max(0, Math.min(100, endSplit));
      }
    }
    stopDragging();

    if (isPortrait) {
      const minPortrait =
        typeof minPortraitSplit === 'number'
          ? minPortraitSplit
          : getPortraitMinSplit(window.innerWidth);
      const TOP = minPortrait;
      const BOTTOM = 100 - minPortrait;
      if (endSplit <= TOP + FLOOR_EPS || endSplit >= BOTTOM - FLOOR_EPS) {
        await pulseLottie();
        arrowAnimRef.current?.playSegments([25, 75], true);
      }
    }

    initialPinchDistance.current = null;
    pinchTriggeredRef.current = false;
  };

  // INIT LOTTIE (lazy) — await the instance
  useEffect(() => {
    let anim: AnimationItemLike | null = null;
    let mounted = true;

    (async () => {
      const el = arrowContainer.current!;
      anim = await lottie.loadAnimation({
        container: el,
        renderer: 'svg',
        loop: false,
        autoplay: false,
        animationData: arrowData2,
      });
      if (!mounted || !anim) return;

      arrowAnimRef.current = anim;

      const container = containerRef.current;
      if (container) container.style.opacity = '0';

      const playInitial = () => {
        anim!.goToAndStop(0, true);
        setTimeout(() => anim!.playSegments([0, 75], true), 1200);
        if (container) {
          setTimeout(() => (container.style.opacity = '1'), 1200);
        }
        arrowContainer.current?.querySelector('svg')?.classList.add('drag-arrow');
      };

      anim.addEventListener('DOMLoaded', playInitial);
      const fallback = setTimeout(() => {
        if (!(anim as any).isLoaded) playInitial();
      }, 2000);

      // cleanup for this async init
      return () => {
        clearTimeout(fallback);
        anim?.removeEventListener('DOMLoaded', playInitial);
      };
    })();

    return () => {
      mounted = false;
      arrowAnimRef.current?.destroy();
      arrowAnimRef.current = null;
    };
  }, []);

  // Replay on in-view
  useEffect(() => {
    const container = containerRef.current;
    const anim = arrowAnimRef.current;
    if (!container || !anim) return;

    let views = 0;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && views < 3) {
            views += 1;
            anim.goToAndStop(0, true);
            setTimeout(() => anim.playSegments([0, 75], true), 200);
          }
        });
      },
      { threshold: 0.6 }
    );
    io.observe(container);
    return () => io.disconnect();
  }, []);

  // Pointer / touch listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('mouseenter', handleMouseEnter);
    container.addEventListener('mouseleave', handleMouseLeave);
    container.addEventListener('mousedown', startDragging as any);
    container.addEventListener('touchstart', handleTouchStart as any, { passive: false });
    container.addEventListener('touchend', handleTouchEnd as any, { passive: true });

    return () => {
      container.removeEventListener('mouseenter', handleMouseEnter);
      container.removeEventListener('mouseleave', handleMouseLeave);
      container.removeEventListener('mousedown', startDragging as any);
      container.removeEventListener('touchstart', handleTouchStart as any);
      container.removeEventListener('touchend', handleTouchEnd as any);
      stopDragging();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="split-drag-handler"
      style={{
        position: 'absolute',
        ...(isPortrait
          ? {
              left: 0,
              right: 0,
              top: `${split}%`,
              height: '5.4rem',
              cursor: 'ns-resize',
              transform: 'translateY(-50%)',
            }
          : {
              top: 0,
              bottom: 0,
              left: `${split}%`,
              width: '6.4rem',
              cursor: 'ew-resize',
              transform: 'translateX(-50%)',
              height: 'calc(100% - 6em)',
            }),
        zIndex: 3000,
        transition: isPortrait ? 'top 0s' : 'left 0s',
        pointerEvents: 'all',
        touchAction: isDraggingRef.current ? 'none' : 'auto',
      }}
    >
      <div
        ref={arrowContainer}
        className="split-arrow"
        style={{
          width: isPortrait ? '100%' : 'none',
          height: isPortrait ? 'calc(100% - 4em)' : 'calc(100% + 3em)',
          pointerEvents: 'none',
          transform: isPortrait ? 'rotate(90deg)' : 'none',
          transformOrigin: 'center center',
        }}
      />
    </div>
  );
};

export default SplitDragHandler;
