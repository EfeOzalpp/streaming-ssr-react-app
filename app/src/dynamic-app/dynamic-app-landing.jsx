// src/dynamic-app/dynamic-app-outgoing.jsx
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

// shared preloader (no TS types in this file)
import {
  getPreloadedDynamicApp,
  whenDynamicPreloadReady,
  ensureDynamicPreload,
} from './preload-dynamic-app';

// 🔸 single source of truth for palette semantics
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

  const [showFireworks, setShowFireworks] = useState(true);
  const [isHostVisible, setIsHostVisible] = useState(false);
  const hostVisibleRef = useRef(false);

  const { getShadowRoot, injectStyle } = useShadowRoot();

  useEffect(() => {
    [indexCss, miscCss, overlayCss].forEach(injectStyle);
  }, [injectStyle]);

  // signal ready on first paint (wrapper de-dupes)
  useEffect(() => {
    const id = requestAnimationFrame(() => { try { onReady?.(); } catch {} });
    return () => cancelAnimationFrame(id);
  }, [onReady]);

  // Prime from cache, then wait for preload (deduped)
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

  // 🔹 Activation now uses the shared palette-controller
  const handleActivate = useCallback((alt1) => {
    // resolve a quartet [c0, c1, c2, c3] for this alt
    const quartet = resolvePalette(alt1, colorMapping);
    if (!Array.isArray(quartet) || quartet.length < 4) return;

    // compute state (activeColor, title triplet, lastKnown)
    const { activeColor: nextActive, movingText: nextTriplet, lastKnown } =
      computeStateFromPalette(quartet);

    // minimize state churn
    if (nextActive !== activeColor) {
      setActiveColor(nextActive);
      setLastKnownColor(lastKnown ?? nextActive);
    }
    // nextTriplet is a [c0, c1, c3] triplet per controller semantics
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
    if (toggleFireworksRef.current) toggleFireworksRef.current(isEnabled);
    setPauseAnimation(!isEnabled);
  }, []);

  useEffect(() => {
    if (!shadowRef.current) return;
    const ro = new ResizeObserver(() => {
      // optional diagnostics
      // console.log('[Resize observed]', shadowRef.current?.getBoundingClientRect());
    });
    ro.observe(shadowRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const container = document.querySelector('#block-dynamic');
    if (!container) {
      console.warn('[FireworkObserver] #block-dynamic not found in DOM');
      return;
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        const visible = !!entry.isIntersecting;
        hostVisibleRef.current = visible;
        setIsHostVisible(visible);

        const desired = visible && !pauseAnimation;
        setShowFireworks((prev) => (prev !== desired ? desired : prev));
        if (toggleFireworksRef.current) toggleFireworksRef.current(desired);
      },
      { threshold: 0.3 }
    );

    io.observe(container);

    // prime immediately
    const rect = container.getBoundingClientRect();
    const visibleNow = rect.top < window.innerHeight && rect.bottom > 0;
    hostVisibleRef.current = visibleNow;
    setIsHostVisible(visibleNow);

    const initialDesired = visibleNow && !pauseAnimation;
    setShowFireworks((prev) => (prev !== initialDesired ? initialDesired : prev));
    if (toggleFireworksRef.current) toggleFireworksRef.current(initialDesired);

    return () => io.disconnect();
  }, [pauseAnimation]);

  useEffect(() => {
    if (toggleFireworksRef.current) {
      toggleFireworksRef.current(!pauseAnimation && isHostVisible);
    }
  }, [pauseAnimation, isHostVisible]);

  const cardRefs = useRef([]);
  cardRefs.current = sortedImages.map((_, i) => cardRefs.current[i] ?? React.createRef());

  return (
    <div className="homePage-container" ref={scrollContainerRef} aria-busy={isLoading ? 'true' : 'false'}>
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
          {showFireworks && (
            <FireworksDisplay
              colorMapping={colorMapping}
              items={sortedImages}
              activeColor={activeColor}
              lastKnownColor={lastKnownColor}
              onToggleFireworks={handleSetToggleFireworks}
            />
          )}
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
              />
            ))}
          </div>

          <Footer
            customArrowIcon2={svgIcons['arrow1']}
            linkArrowIcon={svgIcons['link-icon']}
          />
        </div>
      </div>
    </div>
  );
}

export default DynamicTheme;
