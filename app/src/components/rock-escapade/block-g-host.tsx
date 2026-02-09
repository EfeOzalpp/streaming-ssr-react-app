// src/components/rock-escapade/block-g-host.tsx
import { useCallback, useEffect, useRef, useState } from 'react';
import lottie from '../../behaviors/load-lottie';

import BlockGOnboarding from './block-g-onboarding';
import CoinCounter from './block-g-coin-counter';
import ExitButton from './block-g-exit';
import GameOverController from '../../ssr/content/game.enhancer/game-over-controller';

import { useRealMobileViewport } from '../../behaviors/useRealMobile';
import desktopOnboarding from '../../json-assets/desktop-onboarding.json';
import mobileOnboarding from '../../json-assets/mobile-onboarding.json';

import HeavyMount from '../../behaviors/heavy-mount';
import { gameLoaders } from '../../content-orchestration/component-loader';
import { useHighScoreSubscription } from './useHighScoreSubscription';
import GameInputGuards from '../../ssr/content/game.enhancer/game-input-guards';

import GameViewportOverlay from './game-viewport-overlay';

import '../../styles/block-type-g.css';

const GAME_MODE_CLASS = 'game-mode-active';
function activateGameMode() {
  if (typeof document !== 'undefined') document.body.classList.add(GAME_MODE_CLASS);
}
function deactivateGameMode() {
  if (typeof document !== 'undefined') document.body.classList.remove(GAME_MODE_CLASS);
}

export default function BlockGHost({ blockId }: { blockId: string }) {
  const isRealMobile = useRealMobileViewport();

  // lifecycle
  const [started, setStarted] = useState(false);

  // gate CTA until canvas reports ready (preloaded before start)
  const [stageReady, setStageReady] = useState(false);

  // HUD + meta
  const [coins, setCoins] = useState(0);
  const [countdownPhase, setCountdownPhase] = useState<null | 'lottie' | 'begin'>(null);
  const [showBeginText, setShowBeginText] = useState(false);
  const [showOverlayBg, setShowOverlayBg] = useState(false);
  const [shouldRenderOverlayBg, setShouldRenderOverlayBg] = useState(false);

  const lottieRef = useRef<HTMLDivElement | null>(null);

  // game-over (controls overlay)
  const [finalScore, setFinalScore] = useState<number | null>(null);

  // High score (remote)
  const remoteHighScore = useHighScoreSubscription();
  const stableHigh = typeof remoteHighScore === 'number' ? remoteHighScore : 0;

  // API from GameCanvas
  const restartApi = useRef<{ restart: () => void } | null>(null);

  // Idle prewarm
  useEffect(() => {
    // @ts-ignore
    const ric = window.requestIdleCallback as any;
    let rid: number | null = null;
    if (ric) rid = ric(() => void gameLoaders.game(), { timeout: 2000 });
    return () => rid && (window as any).cancelIdleCallback?.(rid);
  }, []);

  const onStart = useCallback(async () => {
    // Preload the chunk regardless
    void gameLoaders.game();

    // Reset state & show countdown
    setCoins(0);
    setFinalScore(null);
    setCountdownPhase('lottie');

    // Mount the overlay (portal) immediately — no native fullscreen
    activateGameMode();
    setStarted(true);

    // Focus for keys/gamepad
    requestAnimationFrame(() => {
      const el = document.getElementById(blockId);
      (el as HTMLElement | null)?.focus?.();
    });
  }, [blockId]);

  // Lottie countdown (lazy)
  useEffect(() => {
    if (countdownPhase !== 'lottie' || !lottieRef.current) return;

    let anim: any;
    let mounted = true;

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

    return () => {
      mounted = false;
      anim?.destroy?.();
    };
  }, [countdownPhase, isRealMobile]);

  useEffect(() => {
    if (countdownPhase === 'begin') {
      setShowBeginText(true);
      const t = setTimeout(() => {
        setShowBeginText(false);
        setCountdownPhase(null);
      }, 1000);
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

  // Canvas bridges
  const handleReady = (api: { restart: () => void }) => {
    restartApi.current = api;
    setStageReady(true); // flips CTA from "Loading…" to "Click Here to Play!"
  };

  const handleCoinsChange = (n: number) => setCoins(n);
  const handleGameOver = (finalCoins: number) => setFinalScore(finalCoins);
  const handleRestart = () => {
    setCountdownPhase(null);
    restartApi.current?.restart();
    setCoins(0);
  };

  const handleExit = () => {
    setStarted(false);
    setCountdownPhase(null);
    setCoins(0);
    setFinalScore(null);
    deactivateGameMode();
  };
  useEffect(() => () => deactivateGameMode(), []);

  const displayHigh =
    (finalScore == null ? coins : finalScore) > stableHigh
      ? (finalScore == null ? coins : finalScore)
      : stableHigh;
  const beatingHighNow = finalScore == null && coins > stableHigh;

  return (
    <section
      id={blockId}
      tabIndex={-1}
      className="block-type-g"   // no 'ingame' / no 'fake-fs' — overlay handles viewport
      style={{ position: 'relative' }}
    >
      {/* Guards (can live here or inside overlay). Keeping here is fine. */}
      <GameInputGuards
        active={started}
        lockBodyScroll
        alsoBlockWheel
        alsoBlockTouch
        allowWhenTyping
      />

      {/* Onboarding (shows until user starts). Stage readiness is driven by the preloader below. */}
      {!started && (
        <BlockGOnboarding
          onStart={onStart}
          resetTrigger={started ? 1 : 0}
          label={stageReady ? 'Click Here to Play!' : 'Loading Game…'}
          ctaEnabled={stageReady}
        />
      )}

      {/* PRELOADER instance (flips stageReady) */}
      {!started && (
        <HeavyMount
          load={() => import('./game-canvas')}
          fallback={null}
          mountMode="io"
          observeTargetId={blockId}
          rootMargin="0px"
          enterThreshold={0.2}
          exitThreshold={0.05}
          unmountDelayMs={150}
          preloadOnIdle
          preloadIdleTimeout={2000}
          preloadOnFirstIO
          placeholderMinHeight={360}
          componentProps={{
            onReady: handleReady,
            onCoinsChange: () => {},
            onGameOver: () => {},
            highScore: stableHigh,
            pauseWhenHidden: true,
            demoMode: true,
            overlayActive: false,
            allowSpawns: true,
          }}
        />
      )}

      {/* GAME OVERLAY (PORTAL) */}
      {started && (
        <GameViewportOverlay>
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

          {/* Actual gameplay instance (in the portal, pinned to viewport) */}
          <HeavyMount
            load={() => import('./game-canvas')}
            fallback={null}
            mountMode="io"
            observeTargetId="game-viewport-root"   // always visible
            rootMargin="0px"
            enterThreshold={0.01}
            exitThreshold={0.0}
            unmountDelayMs={150}
            preloadOnIdle
            preloadIdleTimeout={2000}
            preloadOnFirstIO
            placeholderMinHeight={360}
            componentProps={{
              onReady: handleReady,
              onCoinsChange: handleCoinsChange,
              onGameOver: handleGameOver,
              highScore: stableHigh,
              pauseWhenHidden: true,
              demoMode: false,
              overlayActive: countdownPhase === 'lottie' || countdownPhase === 'begin',
              allowSpawns: countdownPhase === 'begin' || countdownPhase === null,
            }}
          />
        </GameViewportOverlay>
      )}
    </section>
  );
}
