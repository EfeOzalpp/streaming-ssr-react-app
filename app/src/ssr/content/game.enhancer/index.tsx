// src/ssr/projects/game.enhancer/index.tsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import lottie from '../../../behaviors/load-lottie';

import BlockGOnboarding from '../../../components/rock-escapade/block-g-onboarding-inner';
import ExitButton from '../../../components/rock-escapade/block-g-exit';
import CoinCounter from '../../../components/rock-escapade/block-g-coin-counter';
import GameOverController from './game-over-controller';

import { useRealMobileViewport } from '../../../behaviors/useRealMobile';
import HeavyMount from '../../../behaviors/heavy-mount';
import { gameLoaders } from '../../../content-orchestration/component-loader';
import { useHighScoreSubscription } from '../../../components/rock-escapade/useHighScoreSubscription';

import GameInputGuards from './game-input-guards';
import GameViewportOverlay from '../../../components/rock-escapade/game-viewport-overlay';

import desktopOnboarding from '../../../json-assets/desktop-onboarding.json';
import mobileOnboarding from '../../../json-assets/mobile-onboarding.json';

const GAME_MODE_CLASS = 'game-mode-active';
const activateGameMode = () => document.body.classList.add(GAME_MODE_CLASS);
const deactivateGameMode = () => document.body.classList.remove(GAME_MODE_CLASS);

function scheduleIdle(cb: () => void, timeout = 2000) {
  const w = window as any;
  if (typeof w.requestIdleCallback === 'function') {
    const id = w.requestIdleCallback(cb, { timeout });
    return () => w.cancelIdleCallback?.(id);
  }
  const t = window.setTimeout(cb, timeout);
  return () => window.clearTimeout(t);
}

const GameEnhancer: React.FC = () => {
  const [sec, setSec] = useState<HTMLElement | null>(null);
  const [onboardingEl, setOnboardingEl] = useState<HTMLElement | null>(null);
  const [rootEl, setRootEl] = useState<HTMLElement | null>(null);
  const [shouldMount, setShouldMount] = useState(false);
  const [stageReady, setStageReady] = useState(false);

  const firstHydrationUsedRef = useRef(false);
  const firstVisibilityCallbackSkippedRef = useRef(false);
  const wasVisibleRef = useRef(false);

  const [onboardingReset, setOnboardingReset] = useState(0);
  const reapplyOnboarding = useCallback(() => setOnboardingReset(v => v + 1), []);

  const stableStartAtForThisMount = useMemo(
    () => (firstHydrationUsedRef.current ? 0 : 30),
    [onboardingReset]
  );
  const handleInnerMount = useCallback(() => { firstHydrationUsedRef.current = true; }, []);

  useEffect(() => {
    const container = document.getElementById('block-game') as HTMLElement | null;
    if (!container) return;
    setSec(container);

    const shell = container.querySelector('[data-ssr-shell="block-game"]') as HTMLElement | null;
    if (!shell) return;

    let host = shell.querySelector('.block-g-onboarding') as HTMLElement | null;
    if (!host) {
      host = shell;
      host.classList.add('block-g-onboarding', 'tooltip-block-g');
      host.setAttribute('aria-live', 'polite');
      host.style.display ||= 'flex';
      host.style.alignItems ||= 'center';
    }

    host.replaceChildren();
    setOnboardingEl(host);
    setRootEl(shell);
  }, []);

  useEffect(() => {
    if (!sec) return;
    const cancelIdle = scheduleIdle(() => setShouldMount(true), 2000);
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setShouldMount(true);
        cancelIdle();
        io.disconnect();
      }
    }, { threshold: [0, 0.3] });
    io.observe(sec);
    return () => { io.disconnect(); cancelIdle(); };
  }, [sec]);

  useEffect(() => {
    if (!sec) return;
    const io = new IntersectionObserver(([entry]) => {
      const nowVisible = !!entry.isIntersecting;
      if (!firstVisibilityCallbackSkippedRef.current) {
        firstVisibilityCallbackSkippedRef.current = true;
        wasVisibleRef.current = nowVisible;
        return;
      }
      const wasVisible = wasVisibleRef.current;
      wasVisibleRef.current = nowVisible;
      if (nowVisible && !wasVisible && !sec.classList.contains('ingame')) {
        setOnboardingReset(v => v + 1);
      }
    }, { threshold: 0.01 });
    io.observe(sec);
    return () => io.disconnect();
  }, [sec]);

  if (!sec || !onboardingEl || !rootEl || !shouldMount) return null;

  return (
    <>
      {createPortal(
        <OnboardingPortal
          reset={onboardingReset}
          startAtFrame={stableStartAtForThisMount}
          onInnerMount={handleInnerMount}
          label={stageReady ? 'Click Here to Play!' : 'Loading Game…'}
          ctaEnabled={stageReady}
        />,
        onboardingEl
      )}
      {createPortal(
        <GameStage
          container={sec}
          onboardingEl={onboardingEl}
          reapplyOnboarding={reapplyOnboarding}
          isStageReady={stageReady}
          onStageReady={setStageReady}
        />,
        rootEl
      )}
    </>
  );
};

type OnboardingPortalProps = {
  reset: number;
  startAtFrame: number;
  onInnerMount: () => void;
  label: string;
  ctaEnabled: boolean;
  loadingLines?: string[];
};

const OnboardingPortal: React.FC<OnboardingPortalProps> = ({
  reset, startAtFrame, onInnerMount, label, ctaEnabled, loadingLines
}) => (
  <BlockGOnboarding
    key={reset}
    startAtFrame={startAtFrame}
    onMount={onInnerMount}
    label={label}
    ctaEnabled={ctaEnabled}
    loadingLines={loadingLines}
  />
);

export default GameEnhancer;

/* ---------- Stage (mirrors client BlockGHost + portal overlay) ---------- */
const GameStage: React.FC<{
  container: HTMLElement;
  onboardingEl: HTMLElement;
  reapplyOnboarding: () => void;
  isStageReady: boolean;
  onStageReady: (ready: boolean) => void;
}> = ({ container, onboardingEl, reapplyOnboarding, isStageReady, onStageReady }) => {
  const isRealMobile = useRealMobileViewport();

  const [started, setStarted] = useState(false);
  const [coins, setCoins] = useState(0);
  const [finalScore, setFinalScore] = useState<number | null>(null);

  const remoteHighScore = useHighScoreSubscription();
  const stableHigh = typeof remoteHighScore === 'number' ? remoteHighScore : 0;
  const displayHigh = (finalScore == null ? coins : finalScore) > stableHigh
    ? (finalScore == null ? coins : finalScore)
    : stableHigh;
  const beatingHighNow = finalScore == null && coins > stableHigh;

  const [countdownPhase, setCountdownPhase] = useState<null | 'lottie' | 'begin'>(null);
  const [showOverlayBg, setShowOverlayBg] = useState(false);
  const [shouldRenderOverlayBg, setShouldRenderOverlayBg] = useState(false);
  const lottieRef = useRef<HTMLDivElement | null>(null);
  const restartApi = useRef<{ restart: () => void } | null>(null);

  const onStart = useCallback(() => {
    if (!isStageReady) return;
    void gameLoaders.game();
    container.classList.add('ingame');
    activateGameMode();
    setStarted(true);
    setCoins(0);
    setFinalScore(null);
    setCountdownPhase('lottie');
    onboardingEl.style.transition = 'opacity 180ms ease';
    onboardingEl.style.opacity = '0';
    window.setTimeout(() => { onboardingEl.style.display = 'none'; }, 180);
  }, [container, onboardingEl, isStageReady]);

  // enable/disable CTA pointers
  useEffect(() => {
    const CLICK_TARGETS = '.coin, .onboarding-text, [data-start-hit]';
    const armTargets = () => {
      onboardingEl.querySelectorAll(CLICK_TARGETS).forEach((el) => {
        const node = el as HTMLElement;
        node.style.pointerEvents = isStageReady ? 'auto' : 'none';
        node.style.cursor = isStageReady ? 'pointer' : 'default';
        if (!node.hasAttribute('role')) node.setAttribute('role', 'button');
        if (node.tabIndex < 0) node.tabIndex = 0;
      });
      onboardingEl.setAttribute('aria-busy', String(!isStageReady));
    };
    armTargets();
    const mo = new MutationObserver(armTargets);
    mo.observe(onboardingEl, { childList: true, subtree: true });

    const onClick = (ev: Event) => {
      if (!isStageReady) return;
      const t = ev.target as HTMLElement | null;
      if (t && t.closest(CLICK_TARGETS)) onStart();
    };
    const onKeyDown = (ev: KeyboardEvent) => {
      if (!isStageReady) return;
      if (ev.key === 'Enter' || ev.key === ' ') {
        const t = ev.target as HTMLElement | null;
        if (t && t.closest(CLICK_TARGETS)) {
          ev.preventDefault();
          onStart();
        }
      }
    };

    onboardingEl.addEventListener('click', onClick as EventListener, { passive: true });
    onboardingEl.addEventListener('keydown', onKeyDown as EventListener);
    return () => {
      mo.disconnect();
      onboardingEl.removeEventListener('click', onClick as EventListener);
      onboardingEl.removeEventListener('keydown', onKeyDown as EventListener);
    };
  }, [onboardingEl, onStart, isStageReady]);

  // countdown visuals
  useEffect(() => {
    if (countdownPhase !== 'lottie' || !lottieRef.current) return;
    let anim: any; let mounted = true;
    (async () => {
      anim = await lottie.loadAnimation({
        container: lottieRef.current!,
        renderer: 'svg',
        loop: false,
        autoplay: true,
        animationData: isRealMobile ? mobileOnboarding : desktopOnboarding,
      });
      if (!mounted || !anim) return;
      const onComplete = () => setCountdownPhase('begin');
      anim.addEventListener('complete', onComplete);
      return () => anim?.removeEventListener?.('complete', onComplete);
    })();
    return () => { mounted = false; anim?.destroy?.(); };
  }, [countdownPhase, isRealMobile]);

  useEffect(() => {
    if (countdownPhase === 'begin') {
      const t = setTimeout(() => setCountdownPhase(null), 1000);
      return () => clearTimeout(t);
    }
  }, [countdownPhase]);

  useEffect(() => {
    if (countdownPhase === 'lottie') {
      setShowOverlayBg(true);
      setShouldRenderOverlayBg(true);
    } else if (countdownPhase === null) {
      setShowOverlayBg(false);
      const t = setTimeout(() => setShouldRenderOverlayBg(false), 400);
      return () => clearTimeout(t);
    }
  }, [countdownPhase]);

  const handleReady = (api: { restart: () => void }) => {
    restartApi.current = api;
    onStageReady(true);
  };
  useEffect(() => () => onStageReady(false), [onStageReady]);

  const handleRestart = () => {
    container.classList.add('ingame');
    setCountdownPhase(null);
    setCoins(0);
    setFinalScore(null);
    restartApi.current?.restart();
  };

  const handleExit = () => {
    setStarted(false);
    setCountdownPhase(null);
    setCoins(0);
    setFinalScore(null);
    deactivateGameMode();
    container.classList.remove('ingame');
    onboardingEl.style.display = '';
    reapplyOnboarding();
    requestAnimationFrame(() => { onboardingEl.style.opacity = '1'; });
  };

  return (
    <>
      {/* Keep a WARM-UP instance under the section until start so onReady can flip CTA */}
      {!started && (
        <HeavyMount
          load={() => import('../../../components/rock-escapade/game-canvas')}
          fallback={null}
          preloadOnIdle
          preloadIdleTimeout={2000}
          preloadOnFirstIO
          rootMargin="0px"
          placeholderMinHeight={360}
          componentProps={{
            onReady: handleReady,
            onCoinsChange: (n: number) => setCoins(n),
            onGameOver: (finalCoins: number) => setFinalScore(finalCoins),
            highScore: stableHigh,
            pauseWhenHidden: true,
            demoMode: true, // preview only before game is started
            overlayActive: false,
            allowSpawns: true,
          }}
        />
      )}

      {/* When playing: portal everything under #main-shell so the postconfig css prefixer still works with the portal */}
      {started && (
        <GameViewportOverlay>
          <GameInputGuards active lockBodyScroll alsoBlockWheel alsoBlockTouch allowWhenTyping />
          <ExitButton onExit={handleExit} />
          <CoinCounter coins={coins} highScore={displayHigh} newHighScore={beatingHighNow} />

          {shouldRenderOverlayBg && (
            <div className={`countdown-bg-overlay ${!showOverlayBg ? 'hide' : ''}`} style={{ pointerEvents: 'none' }} />
          )}
          {(countdownPhase === 'lottie' || countdownPhase === 'begin') && (
            <div ref={lottieRef} id="lottie-onboarding" className="countdown-lottie" style={{ pointerEvents: 'none' }} />
          )}
          <GameOverController
            score={finalScore}
            highScore={stableHigh}
            onRestart={handleRestart}
            onHide={() => setFinalScore(null)}
          />

          {/* Real gameplay instance pinned to viewport */}
          <HeavyMount
            load={() => import('../../../components/rock-escapade/game-canvas')}
            fallback={null}
            mountMode="io"
            observeTargetId="game-viewport-root"
            rootMargin="0px"
            enterThreshold={0.01}
            exitThreshold={0}
            unmountDelayMs={150}
            preloadOnIdle
            preloadIdleTimeout={2000}
            preloadOnFirstIO
            placeholderMinHeight={360}
            componentProps={{
              onReady: handleReady,
              onCoinsChange: (n: number) => setCoins(n),
              onGameOver: (finalCoins: number) => setFinalScore(finalCoins),
              highScore: stableHigh,
              pauseWhenHidden: true,
              demoMode: false,
              overlayActive: countdownPhase === 'lottie' || countdownPhase === 'begin',
              allowSpawns: countdownPhase === 'begin' || countdownPhase === null,
            }}
          />
        </GameViewportOverlay>
      )}
    </>
  );
};
