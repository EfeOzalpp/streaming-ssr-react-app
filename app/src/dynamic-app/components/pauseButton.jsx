// src/dynamic-app/components/pauseButton.jsx
import React, { useRef, useState, useEffect } from 'react';
import lottie from '../../behaviors/load-lottie'; 
import animationData from '../../json-assets/pauseButton.json';

const PauseButton = ({ toggleP5Animation }) => {
  const containerRef = useRef(null);
  const animRef = useRef(null);
  const [isClicked, setIsClicked] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(3);

  // Sync initial state with fireworks logic
  useEffect(() => {
    if (toggleP5Animation) {
      toggleP5Animation(!isClicked);
    }
  }, [toggleP5Animation, isClicked]);

  // Setup the lottie instance
  useEffect(() => {
    if (!containerRef.current) return;
    let mounted = true;

    lottie.loadAnimation({
      container: containerRef.current,
      renderer: 'svg',
      loop: false,
      autoplay: false,
      animationData,
    }).then((anim) => {
      if (!mounted) return;
      animRef.current = anim;
      anim.goToAndStop(currentFrame, true);
    });

    return () => {
      mounted = false;
      if (animRef.current) {
        animRef.current.destroy();
        animRef.current = null;
      }
    };
  }, []);

  const handleMouseEnter = () => {
    if (animRef.current && !isClicked) {
      animRef.current.playSegments([3, 10], true);
    }
  };

  const handleMouseLeave = () => {
    if (animRef.current && !isClicked) {
      animRef.current.goToAndStop(currentFrame, true);
    }
  };

  const handleClick = (event) => {
    event.stopPropagation();

    if (animRef.current) {
      const targetFrame = isClicked ? 3 : 20;
      animRef.current.playSegments([currentFrame, targetFrame], true);
      setCurrentFrame(targetFrame);
      setIsClicked(!isClicked);

      if (toggleP5Animation) {
        toggleP5Animation(!isClicked);
      }
    }
  };

  return (
    <div
      className="lottie-container"
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    />
  );
};

export default PauseButton;
