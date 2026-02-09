// src/components/rock-escapade/block-g-onboarding.tsx
import React, { useState, useEffect, useRef } from 'react';
import lottie from 'lottie-web';
import onboardingAnimation from '../../json-assets/coin.json';
import { useProjectVisibility } from '../../state/providers/project-context';
import { useTooltipInit } from '../general-ui/tooltip/tooltipInit';

import LoadingHub from '../../state/loading/loading-hub';

type Props = {
  onStart?: () => void;
  resetTrigger?: number;
  label?: string;          // CTA label
  ctaEnabled?: boolean;    // gate readiness (pointer events)
  loadingLines?: string[];
};

const BlockGOnboarding: React.FC<Props> = ({
  onStart,
  resetTrigger,
  label = 'Click Here to Play!',
  ctaEnabled = true,
  loadingLines = [
  "Loading engine…",
  "Creating game canvas…",
  "Configuring frame loop…",
  "Setting up input controls…",
  "Applying display settings…",
  "Initializing game state…",
  "Spawning player…",
  "Almost ready…"
  ],
}) => {
  const [visible, setVisible] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const lottieRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const lottieInstance = useRef<ReturnType<typeof lottie.loadAnimation> | null>(null);

  useTooltipInit();
  const {
    focusedProjectKey,
    scrollContainerRef,
    previousScrollY,
    setPreviousScrollY,
  } = useProjectVisibility();

  const handleClick = () => {
    if (!ctaEnabled) return; // gate until ready
    if (focusedProjectKey) {
      setPreviousScrollY(window.scrollY);
      setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTo({ top: 0, behavior: 'auto' });
        } else {
          window.scrollTo({ top: 0, behavior: 'auto' });
        }
      }, 0);
    }
    onStart?.();
    setIsFadingOut(true);
  };

  // Restore scroll pos on exit from focus mode
  useEffect(() => {
    // (kept from your version — omitted focusedProjectKey setter, just restore)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initializeLottie = () => {
    if (!lottieRef.current) return;
    lottieInstance.current?.destroy();
    lottieInstance.current = lottie.loadAnimation({
      container: lottieRef.current,
      renderer: 'svg',
      loop: false,
      autoplay: false,
      animationData: onboardingAnimation,
    });
    lottieInstance.current.addEventListener('complete', () => {
      if (!lottieInstance.current) return;
      lottieInstance.current.playSegments([41, lottieInstance.current.totalFrames], true);
      lottieInstance.current.loop = true;
    });
  };

  const destroyLottie = () => {
    lottieInstance.current?.destroy();
    lottieInstance.current = null;
  };

  // IO mount/unmount of the Lottie
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            initializeLottie();
            if (lottieInstance.current) {
              lottieInstance.current.stop();
              lottieInstance.current.playSegments([0, lottieInstance.current.totalFrames], true);
            }
          } else {
            destroyLottie();
          }
        });
      },
      { threshold: 0.1 }
    );

    if (containerRef.current) observer.observe(containerRef.current);
    return () => {
      observer.disconnect();
      destroyLottie();
    };
  }, [resetTrigger]);

  useEffect(() => {
    if (isFadingOut) {
      const t = setTimeout(() => setVisible(false), 300);
      return () => clearTimeout(t);
    }
  }, [isFadingOut]);

  useEffect(() => {
    if (resetTrigger) {
      setVisible(true);
      setIsFadingOut(false);
    }
  }, [resetTrigger]);

  if (!visible) return null;

  return (
    <div
      className="block-g-onboarding tooltip-block-g"
      ref={containerRef}
      aria-busy={!ctaEnabled}
      style={{
        opacity: isFadingOut ? 0 : 1,
        transition: 'opacity 0.3s ease',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <div
        ref={lottieRef}
        className="coin"
        onClick={handleClick}
        style={{
          pointerEvents: ctaEnabled ? 'auto' : 'none',
          cursor: ctaEnabled ? 'pointer' : 'default',
        }}
      />

      {/* Keep your CTA label exactly as before */}
      <h1
        className="onboarding-text"
        onClick={handleClick}
        aria-disabled={!ctaEnabled}
        style={{
          pointerEvents: ctaEnabled ? 'auto' : 'none',
          cursor: ctaEnabled ? 'pointer' : 'default',
        }}
      >
        {label}
      </h1>

      {!ctaEnabled && (
        <LoadingHub
          className="loading-hub--game loading-hub--left"
          keyword="game"
          minHeight={72}
          lines={loadingLines}
          ariaLabel="Loading game"
        />
      )}
    </div>
  );
};

export default BlockGOnboarding;
