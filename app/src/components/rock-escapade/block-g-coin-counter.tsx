import React, { useEffect, useRef } from 'react';
import lottie, { type AnimationItem, type AnimationSegment } from 'lottie-web';
import coin from '../../json-assets/coin.json';

interface CoinCounterProps {
  coins: number;
  highScore: number;
  newHighScore: boolean;
}

const CoinCounter: React.FC<CoinCounterProps> = ({ coins, highScore, newHighScore }) => {
  const coinRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!coinRef.current) return;

    const anim: AnimationItem = lottie.loadAnimation({
      container: coinRef.current,
      renderer: 'svg',
      loop: false,          // we'll loop manually with segments
      autoplay: false,
      animationData: coin,
    });

    const onDomLoaded = () => {
      const svg = coinRef.current?.querySelector('svg');
      if (svg) svg.classList.add('coin-lottie');

      // start the loop once we know totalFrames
      const total = anim.totalFrames;
      const segment: AnimationSegment = [41, total - 1];

      const loopOnce = () => anim.playSegments(segment, true);
      const onComplete = () => loopOnce();

      // kick it off and keep looping
      loopOnce();
      anim.addEventListener('complete', onComplete);

      // store cleanup that knows this handler
      cleanupHandlers.complete = () => anim.removeEventListener('complete', onComplete);
    };

    // attach, and keep a way to remove it on unmount
    anim.addEventListener('DOMLoaded', onDomLoaded);

    const cleanupHandlers: { complete?: () => void } = {};

    return () => {
      cleanupHandlers.complete?.();
      anim.removeEventListener('DOMLoaded', onDomLoaded);
      anim.destroy();
    };
  }, []);

  return (
    <div className="coin-counter">
      <div className="coin-count">
        <div className="coin2" ref={coinRef} />
        <h3 className="coin-amount">{coins}</h3>
      </div>
      <h3
        className="high-score"
        style={{ background: newHighScore ? '#f6c44b38' : '#ffffff00' }}
      >
        {newHighScore ? 'New High Score: ' : 'High Score: '}
        {highScore}
      </h3>
    </div>
  );
};

export default CoinCounter;
