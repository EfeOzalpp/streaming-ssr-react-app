// src/components/rock-escapade/block-g-game-over.tsx
import React, { useEffect, useRef, useState } from 'react';
import lottie from 'lottie-web';
import gameOver from '../../json-assets/gameover.json';
import highScore from '../../json-assets/highscore.json';

type Props = {
  onRestart?: () => void;
  visibleTrigger?: number | boolean;
  coins: number;
  newHighScore: boolean;
};

const BlockGGameOver: React.FC<Props> = ({ onRestart, visibleTrigger, coins, newHighScore }) => {
  const [visible, setVisible] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const lottieRef = useRef<HTMLDivElement | null>(null);

  const handleClick = () => {
    onRestart?.();
    setIsFadingOut(true);
  };

  // fade-out -> unmount
  useEffect(() => {
    if (!isFadingOut) return;
    const t = setTimeout(() => setVisible(false), 300);
    return () => clearTimeout(t);
  }, [isFadingOut]);

  // external trigger to re-show
  useEffect(() => {
    if (visibleTrigger) {
      setVisible(true);
      setIsFadingOut(false);
    }
  }, [visibleTrigger]);

  // disable background scroll while visible
  useEffect(() => {
    if (!visible) return;

    const prevent = (e: Event) => e.preventDefault();

    window.addEventListener('wheel', prevent, { passive: false });
    window.addEventListener('touchmove', prevent, { passive: false });
    window.addEventListener('keydown', prevent as any, { passive: false });

    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('wheel', prevent as any);
      window.removeEventListener('touchmove', prevent as any);
      window.removeEventListener('keydown', prevent as any);
      document.body.style.overflow = prev;
    };
  }, [visible]);

  // lottie
  useEffect(() => {
    if (!lottieRef.current) return;
    const anim = lottie.loadAnimation({
      container: lottieRef.current,
      renderer: 'svg',
      loop: newHighScore ? true : false,
      autoplay: true,
      animationData: newHighScore ? highScore : gameOver,
    });
    return () => anim.destroy();
  }, [newHighScore]);

  if (!visible) return null;

  return (
    // OPAQUE, FULL-SCREEN BACKDROP (covers canvas completely)
    <div
      className="gameover-overlay"
      role="dialog"
      aria-modal="true"
      onClick={handleClick}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',              
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: isFadingOut ? 0 : 1,
        transition: 'opacity 0.3s ease',
        cursor: 'pointer',
      }}
    >
      {/* Keep your existing class for inner layout/typography */}
      <div className="block-g-gameover" style={{ position: 'relative' }}>
        <div ref={lottieRef} className="gameover-lottie" />
        <div className="gameover-text-area">
          <h1
            className="gameover-text"
            style={{ color: newHighScore ? 'rgb(255 230 203)' : 'rgb(222 202 250)' }}
          >
            {newHighScore ? 'New High Score!' : 'Game Over'}
          </h1>
          <div className="gameover-coin-count">
            <h2 style={{ color: 'rgb(255, 205, 55)' }}>{coins} Coins Collected</h2>
          </div>

          <h4 className="gameover-cta">Click to Play Again</h4>
        </div>
      </div>
    </div>
  );
};

export default BlockGGameOver;
