// @/state/loading/
import { useEffect, useRef, useState } from 'react';
import lottie from 'lottie-web';
import loading from '../../json-assets/loading.json';

import '../../styles/loading-overlay.css';

type LoadingScreenProps = {
  isFullScreen?: boolean;
  /** Delay before showing loader (ms) */
  delayMs?: number;
};

const LoadingScreen = ({ isFullScreen = true, delayMs = 400 }: LoadingScreenProps) => {
  const container = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(70); // default to largest
  const [show, setShow] = useState(false);

  // Delay before showing loader
  useEffect(() => {
    const t = setTimeout(() => setShow(true), delayMs);
    return () => clearTimeout(t);
  }, [delayMs]);

  // Lottie setup (only if visible)
  useEffect(() => {
    if (!show || !container.current) return;
    const width = window.innerWidth;
    if (width <= 767) {
      setSize(32);
    } else if (width <= 1024) {
      setSize(40);
    } else {
      setSize(56);
    }

    const anim = lottie.loadAnimation({
      container: container.current,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      animationData: loading,
    });

    return () => anim.destroy();
  }, [show]);

  if (!show) {
    // Empty placeholder to keep structure aligned
    return (
      <div
        className={`loading-screen-wrapper ${isFullScreen ? 'fullscreen' : 'contained'}`}
        aria-hidden="true"
      />
    );
  }

  return (
    <div className={`loading-screen-wrapper ${isFullScreen ? 'fullscreen' : 'contained'}`}>
      <div
        className="loading-lottie"
        ref={container}
        style={{
          width: `${size}px`,
          height: `${size}px`,
        }}
      />
    </div>
  );
};

export default LoadingScreen;
