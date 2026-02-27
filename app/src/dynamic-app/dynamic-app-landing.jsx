// src/dynamic-app/dynamic-app-landing.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Navigation from './components/navigation';
import TitleDivider from './components/title';
import SortBy from './components/sortBy';
import FireworksDisplay from './components/fireworksDisplay';
import PauseButton from './components/pauseButton';
import Footer from './components/footer';
import ObservedCard from './lib/observedCard';
import setupAltObserver from './lib/setupAltObserver';
import IntroOverlay from './components/IntroOverlay';
import { colorMapping } from './lib/colorString';
import { useShadowRoot } from '../state/providers/shadow-root-context';
import indexCss from '../styles/dynamic-app/index.css?raw';
import miscCss from '../styles/dynamic-app/misc.css?raw';
import overlayCss from '../styles/loading-overlay.css?raw';

// style injector for the UI cards
import { UIcardsStyle } from './components/homepage-UIcards';

import {
  getPreloadedDynamicApp,
  whenDynamicPreloadReady,
  ensureDynamicPreload,
} from './preload-dynamic-app';

import { resolvePalette, computeStateFromPalette } from './lib/palette';

function DynamicTheme({ onReady }) {
  const [sortedImages, setSortedImages] = useState([]);
  const [svgIcons, setSvgIcons] = useState({});
  const [activeColor, setActiveColor] = useState('#FFFFFF');
  const [movingTextColors, setMovingTextColors] = useState(['#FFFFFF', '#FFFFFF', '#FFFFFF']);
  const [lastKnownColor, setLastKnownColor] = useState('#FFFFFF');
  const [isLoading, setIsLoading] = useState(true);
  const [pauseAnimation, setPauseAnimation] = useState(false);
  const [showNavigation, setShowNavigation] = useState(false);

  const toggleFireworksRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const shadowRef = useRef(null);

  const [isHostVisible, setIsHostVisible] = useState(false);
  const hostVisibleRef = useRef(false);

  const { getShadowRoot, injectStyle } = useShadowRoot();

  useEffect(() => {
    [indexCss, miscCss, overlayCss].forEach(injectStyle);
  }, [injectStyle]);

  useEffect(() => {
    const id = requestAnimationFrame(() => { try { onReady?.(); } catch {} });
    return () => cancelAnimationFrame(id);
  }, [onReady]);

  useEffect(() => {
    const snap = getPreloadedDynamicApp();
    if (snap.icons) setSvgIcons(snap.icons);
    if (Array.isArray(snap.images)) setSortedImages(snap.images);

    let cancelled = false;
    ensureDynamicPreload()
      .catch(() => whenDynamicPreloadReady())
      .then((cache) => {
        if (cancelled || !cache) return;
        if (cache.icons) setSvgIcons(cache.icons);
        if (Array.isArray(cache.images)) setSortedImages(cache.images);
        setIsLoading(false);
        setShowNavigation(true);
      })
      .catch(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  const observerRoot = useRef(null);
  useEffect(() => {
    const root = typeof getShadowRoot === 'function' ? getShadowRoot() : document;
    observerRoot.current = root;
  }, [getShadowRoot]);

  const handleActivate = useCallback((alt1) => {
    const quartet = resolvePalette(alt1, colorMapping);
    if (!Array.isArray(quartet) || quartet.length < 4) return;

    const { activeColor: nextActive, movingText: nextTriplet, lastKnown } =
      computeStateFromPalette(quartet);

    if (nextActive !== activeColor) {
      setActiveColor(nextActive);
      setLastKnownColor(lastKnown ?? nextActive);
    }
    setMovingTextColors(nextTriplet);
  }, [activeColor]);

  const handleDeactivate = useCallback(() => {
    if (activeColor !== lastKnownColor) setActiveColor(lastKnownColor);
  }, [activeColor, lastKnownColor]);

  const currentAltRef = useRef(null);
  useEffect(() => {
    if (isLoading || sortedImages.length === 0) return;
    const root = observerRoot.current;
    if (!root) return;

    const guardedActivate = (alt1) => {
      if (!hostVisibleRef.current) return;
      if (currentAltRef.current === alt1) return;
      currentAltRef.current = alt1;
      handleActivate(alt1);
    };

    const guardedDeactivate = (alt1) => {
      if (!hostVisibleRef.current) return;
      if (currentAltRef.current !== alt1) return;
      handleDeactivate(alt1);
    };

    const cleanup = setupAltObserver(guardedActivate, guardedDeactivate, root);
    return typeof cleanup === 'function' ? cleanup : undefined;
  }, [isLoading, sortedImages, handleActivate, handleDeactivate]);

  const handleSetToggleFireworks = useCallback((fn) => {
    toggleFireworksRef.current = fn;
  }, []);

  const handlePauseToggle = useCallback((isEnabled) => {
    setPauseAnimation(!isEnabled);
  }, []);

  useEffect(() => {
    if (!shadowRef.current) return;
    const ro = new ResizeObserver(() => {});
    ro.observe(shadowRef.current);
    return () => ro.disconnect();
  }, []);

  const pendingVisRafRef = useRef(null);

  useEffect(() => {
    const container = document.querySelector('#block-dynamic');
    if (!container) {
      console.warn('[FireworkObserver] #block-dynamic not found in DOM');
      return;
    }

    const applyVisible = (visible) => {
      hostVisibleRef.current = visible;
      setIsHostVisible((prev) => (prev !== visible ? visible : prev));
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        const visible = !!entry?.isIntersecting;
        if (pendingVisRafRef.current) cancelAnimationFrame(pendingVisRafRef.current);
        pendingVisRafRef.current = requestAnimationFrame(() => {
          applyVisible(visible);
          pendingVisRafRef.current = null;
        });
      },
      { threshold: 0, rootMargin: '-20% 0px -20% 0px' }
    );

    io.observe(container);

    const rect = container.getBoundingClientRect();
    const visibleNow = rect.top < window.innerHeight && rect.bottom > 0;
    applyVisible(visibleNow);

    return () => {
      io.disconnect();
      if (pendingVisRafRef.current) cancelAnimationFrame(pendingVisRafRef.current);
      pendingVisRafRef.current = null;
    };
  }, []);

  const desiredFireworksRunning = isHostVisible && !pauseAnimation;

  const lastRunningRef = useRef(null);
  useEffect(() => {
    if (lastRunningRef.current === desiredFireworksRunning) return;
    lastRunningRef.current = desiredFireworksRunning;
    if (toggleFireworksRef.current) toggleFireworksRef.current(desiredFireworksRunning);
  }, [desiredFireworksRunning]);

  return (
    <div className="homePage-container" ref={scrollContainerRef} aria-busy={isLoading ? 'true' : 'false'}>
      {/* inject UIcards CSS once per shadow instance */}
      <UIcardsStyle />

      <IntroOverlay />

      <div className="navigation-wrapper">
        {showNavigation && (
          <Navigation
            customArrowIcon2={svgIcons['arrow1']}
            customArrowIcon={svgIcons['arrow2']}
            items={sortedImages}
            activeColor={activeColor}
            isInShadow={typeof getShadowRoot === 'function' && getShadowRoot() !== document}
            scrollLockContainer={scrollContainerRef.current}
          />
        )}
      </div>

      <div className="firework-wrapper">
        <div className="firework-divider">
          <FireworksDisplay
            colorMapping={colorMapping}
            items={sortedImages}
            activeColor={activeColor}
            lastKnownColor={lastKnownColor}
            onToggleFireworks={handleSetToggleFireworks}
          />
        </div>
      </div>

      <div className="section-divider"></div>

      <div className="title-divider">
        <TitleDivider
          svgIcon={svgIcons['logo-small-1']}
          movingTextColors={movingTextColors}
          pauseAnimation={pauseAnimation}
        />
      </div>

      <div id="homePage">
        <div className="no-overflow">
          <div className="pause-button-wrapper">
            <PauseButton toggleP5Animation={handlePauseToggle} />
          </div>

          <div className="sort-by-divider">
            <h3 className="students-heading">Students</h3>
            <SortBy
              setSortOption={() => {}}
              onFetchItems={setSortedImages}
              customArrowIcon={svgIcons['arrow2']}
              colorMapping={colorMapping}
              getRoot={getShadowRoot}
            />
          </div>

          <div className="section-divider2"></div>

          <div className="UI-card-divider">
            {sortedImages.map((data, index) => (
              <ObservedCard
                key={index}
                data={data}
                index={index}
                getShadowRoot={getShadowRoot}
                pauseAnimation={pauseAnimation}
                customArrowIcon2={svgIcons['arrow1']}
                imagePriority={index < 2}   // only prioritize the first couple
              />
            ))}
          </div>

          <Footer customArrowIcon2={svgIcons['arrow1']} linkArrowIcon={svgIcons['link-icon']} />
        </div>
      </div>
    </div>
  );
}

export default DynamicTheme;