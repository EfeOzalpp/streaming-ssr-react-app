// src/components/general-ui/title/view-project-cta.tsx
import React, { useEffect, useRef, useState } from 'react';
import lottie from '../../../behaviors/load-lottie';
import arrowData from '../../../json-assets/arrow.json';
import linkData from '../../../json-assets/link.json';

// Minimal shape for what we use from Lottie
type AnimationItemLike = {
  goToAndStop: (value: number, isFrame?: boolean) => void;
  playSegments: (segments: [number, number] | number[], forceFlag?: boolean) => void;
  addEventListener: (name: string, cb: () => void) => void;
  removeEventListener: (name: string, cb: () => void) => void;
  destroy: () => void;
};

type BaseProps = {
  displayTitle: string;
  isLink?: boolean;
  noFocus?: boolean;
  currentKey?: string;
  focusedProjectKey: string | null;
  setFocusedProjectKey: (k: string | null) => void;
  showBackground: boolean;
  backgroundColor: string;
  onHover: (v: boolean) => void;
};

type Variant = 'title-icon' | 'icon-title';

/* --------------------------
   Hook: arrow/link animation
   -------------------------- */
function useArrowLottie(
  displayTitle: string,
  isLink: boolean,
  container: React.RefObject<HTMLDivElement>,
  noFocus: boolean
) {
  const animRef = useRef<AnimationItemLike | null>(null);
  const lastTitleRef = useRef<string | null>(null);
  const prevTypeSigRef = useRef<string | null>(null);

  // Always-current displayTitle so the async IIFE reads the latest value at
  // resolution time, not the stale closure value captured when the effect started.
  const currentDisplayTitleRef = useRef(displayTitle);
  currentDisplayTitleRef.current = displayTitle;

  // Mount: load + play once. Re-runs when isLink changes (arrow↔link icon) or
  // noFocus changes (arrow div mounts/unmounts). React sets the ref during
  // commit — before effects run — so container.current is always populated here.
  useEffect(() => {
    const el = container.current;
    if (!el) return;

    const typeSig = isLink ? 'link' : 'arrow';
    const typeChanged = prevTypeSigRef.current !== typeSig;
    prevTypeSigRef.current = typeSig;
    if (animRef.current && !typeChanged) return;

    let mounted = true;

    (async () => {
      const animationData = isLink ? linkData : arrowData;

      const anim = await lottie.loadAnimation({
        container: el,
        renderer: 'svg',
        loop: false,
        autoplay: false,
        animationData,
      });

      if (!mounted) {
        anim.destroy();
        return;
      }
      animRef.current = anim;

      // add CSS hook
      const onDomLoaded = () => {
        const svg = el.querySelector('svg');
        if (svg) svg.classList.add('arrow-svg');
      };
      anim.addEventListener('DOMLoaded', onDomLoaded);

      // Re-seek after initial play completes — fixes SVG layout on first render
      const onComplete = () => {
        if (!mounted) return;
        anim.removeEventListener('complete', onComplete);
        anim.goToAndStop(40, true);
      };
      anim.addEventListener('complete', onComplete);

      // Play initial [0 → 40]
      anim.goToAndStop(0, true);
      anim.playSegments([0, 40], true);

      // Record the title current at resolution time, not the stale closure value.
      lastTitleRef.current = currentDisplayTitleRef.current;
    })();

    return () => {
      mounted = false;
      animRef.current?.destroy();
      animRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLink, noFocus]);

  // On title change: play [40 → 90]
  useEffect(() => {
    if (!animRef.current) return;
    if (lastTitleRef.current !== displayTitle) {
      animRef.current.goToAndStop(40, true);
      animRef.current.playSegments([40, 90], true);
      lastTitleRef.current = displayTitle;
    }
  }, [displayTitle]);
}

/* --------------------------
   Base Project Button
   -------------------------- */
function BaseProjectButton({
  displayTitle,
  isLink,
  noFocus,
  currentKey,
  focusedProjectKey,
  setFocusedProjectKey,
  showBackground,
  backgroundColor,
  onHover,
  variant,
}: BaseProps & { variant: Variant }) {
  const arrowContainer = useRef<HTMLDivElement>(null);
  const isFocused = focusedProjectKey === currentKey;

  // short-lived class for styling the “swipe/toggle” moment
  const [isSwiping, setIsSwiping] = useState(false);

  // Normalize isLink so undefined and false are both treated as arrow (no type
  // change when activeTitle resolves from '' to a non-link project).
  // Pass !!noFocus so the hook re-runs when the arrow div mounts/unmounts.
  useArrowLottie(displayTitle, !!isLink, arrowContainer, !!noFocus);

  // IMPORTANT: when focus state or the rendered key changes, clear hover
  useEffect(() => {
    onHover(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFocused, currentKey]);

  const handleToggleOpen = () => {
    if (!currentKey || noFocus) return;

    // flip focus
    const next = focusedProjectKey === currentKey ? null : currentKey;
    setFocusedProjectKey(next);

    // brief CSS hook
    setIsSwiping(true);
    window.setTimeout(() => setIsSwiping(false), 900);

    if (next) {
      requestAnimationFrame(() => {
        const el = document.getElementById(`block-${next}`);
        el?.scrollIntoView({ block: 'start', behavior: 'smooth' });
      });
    }
  };

  const Element: any = isLink ? 'a' : 'button';
  const sharedProps = {
    className: [
      'view-project-btn',
      !showBackground ? 'no-bg' : '',
      isFocused ? 'is-focused' : '',
      isSwiping ? 'is-swiping' : '',
      noFocus ? 'no-arrow' : '',
    ]
      .filter(Boolean)
      .join(' '),
    onMouseEnter: () => onHover(true),
    onMouseLeave: () => onHover(false),
    'data-project-key': currentKey ?? undefined,
    'aria-pressed': !isLink && currentKey ? focusedProjectKey === currentKey : undefined,
    ...(isLink
      ? { href: '/dynamic-theme', target: '_blank', rel: 'noopener noreferrer' }
      : { onClick: handleToggleOpen }),
  };

  const TitleEl = (
    <h2 className="project-view" style={{ position: 'relative', zIndex: 1 }}>
      {displayTitle}
    </h2>
  );

  const IconEl = noFocus ? null : (
    <div
      ref={arrowContainer}
      className="view-project-arrow"
      style={{ position: 'relative', zIndex: 1 }}
    />
  );

  return (
    <Element {...sharedProps}>
      <div
        className={`view-project-background ${(!showBackground || isFocused) ? 'no-bg' : ''}`}
        style={{
          backgroundColor,
          position: 'absolute',
          inset: 0,
          borderRadius: 'inherit',
          zIndex: 0,
          pointerEvents: 'none',
        }}
        aria-hidden="true"
      />
      {variant === 'icon-title' ? (
        <>
          {IconEl}
          {TitleEl}
        </>
      ) : (
        <>
          {TitleEl}
          {IconEl}
        </>
      )}
    </Element>
  );
}

/* --------------------------
   Public Variants
   -------------------------- */
export function ProjectButtonTitleIcon(props: BaseProps) {
  return <BaseProjectButton {...props} variant="title-icon" />;
}

export function ProjectButtonIconTitle(props: BaseProps) {
  return <BaseProjectButton {...props} variant="icon-title" />;
}
