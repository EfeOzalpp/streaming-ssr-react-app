// src/components/general-iu/title/view-project-cta.tsx
import React, { useEffect, useRef, useState } from 'react';
import lottie from '../../../behaviors/load-lottie';
import arrowData from '../../../json-assets/arrow.json';
import arrowData3 from '../../../json-assets/arrow3.json';
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
  isLink: boolean | undefined,
  isFocused: boolean,
  container: React.RefObject<HTMLDivElement>
) {
  const animRef = useRef<AnimationItemLike | null>(null);
  const lastTitleRef = useRef<string | null>(null);

  // Mount: load + play once (recreate when lottie type changes)
  useEffect(() => {
    const el = container.current;
    if (!el) return;

    let mounted = true;

    (async () => {
      // keep link.json priority; otherwise use arrow3 when focused, else arrow
      const animationData = isLink ? linkData : (isFocused ? arrowData3 : arrowData);

      const anim = await lottie.loadAnimation({
        container: el,
        renderer: 'svg',
        loop: false,
        autoplay: false,
        animationData,
      });

      if (!mounted) return;
      animRef.current = anim;

      // add CSS hook
      const onDomLoaded = () => {
        const svg = el.querySelector('svg');
        if (svg) svg.classList.add('arrow-svg');
      };
      anim.addEventListener('DOMLoaded', onDomLoaded);

      // Play initial [0 → 40]
      anim.goToAndStop(0, true);
      anim.playSegments([0, 40], true);

      lastTitleRef.current = displayTitle;

      return () => {
        anim.removeEventListener('DOMLoaded', onDomLoaded);
      };
    })();

    return () => {
      mounted = false;
      animRef.current?.destroy();
      animRef.current = null;
    };
  }, [container, isLink, isFocused]);

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

  // Lottie hook
  useArrowLottie(displayTitle, isLink, isFocused, arrowContainer);

  // IMPORTANT: when focus state or the rendered key changes, clear hover
  useEffect(() => {
    onHover(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFocused, currentKey]);

  const handleToggleOpen = () => {
    if (!currentKey) return;

    // flip focus
    const next = focusedProjectKey === currentKey ? null : currentKey;
    setFocusedProjectKey(next);

    // brief CSS hook
    setIsSwiping(true);
    const t = window.setTimeout(() => setIsSwiping(false), 900);

    if (next) {
      requestAnimationFrame(() => {
        const el = document.getElementById(`block-${next}`);
        el?.scrollIntoView({ block: 'start', behavior: 'smooth' });
      });
    }

    return () => window.clearTimeout(t);
  };

  const Element: any = isLink ? 'a' : 'button';
  const sharedProps = {
    className: [
      'view-project-btn',
      !showBackground ? 'no-bg' : '',
      isFocused ? 'is-focused' : '',
      isSwiping ? 'is-swiping' : '',
    ]
      .filter(Boolean)
      .join(' '),
    onMouseEnter: () => onHover(true),
    onMouseLeave: () => onHover(false),
    'data-project-key': currentKey ?? undefined,
    'aria-pressed': currentKey ? focusedProjectKey === currentKey : undefined,
    ...(isLink
      ? { href: '/dynamic-theme', target: '_blank', rel: 'noopener noreferrer' }
      : { onClick: handleToggleOpen }),
  };

  const TitleEl = (
    <h2 className="project-view" style={{ position: 'relative', zIndex: 1 }}>
      {displayTitle}
    </h2>
  );

  const IconEl = (
    <div
      ref={arrowContainer}
      className="view-project-arrow"
      style={{ position: 'relative', zIndex: 1 }}
    />
  );

  return (
    <Element {...sharedProps}>
      <div
        className={`view-project-background ${!showBackground ? 'no-bg' : ''}`}
        style={{
          backgroundColor,
          position: 'absolute',
          inset: 0,
          borderRadius: 'inherit',
          zIndex: 0,
          pointerEvents: 'none', // ensure bg doesn't swallow hover
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
