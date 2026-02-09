// src/dynamic-app/components/title.jsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { useStyleInjection } from '../../state/providers/style-injector.ts';
import titleCss from '../../styles/dynamic-app/title.css?raw';

const isTriplet = (v) => Array.isArray(v) && v.length === 3 && v.every(x => typeof x === 'string');

const TitleDivider = ({ svgIcon, movingTextColors, pauseAnimation }) => {
  useStyleInjection(titleCss, 'dynamic-app-style-title');

  // visibility of this component
  const rootRef = useRef(null);
  const [isVisible, setIsVisible] = useState(true);
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      ([entry]) => setIsVisible(!!entry.isIntersecting),
      { threshold: 0.01 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // stable palette that only changes when visible
  const defaultTriplet = ['#70c6b0', '#5670b5', '#50b0c5'];
  const incoming = isTriplet(movingTextColors) ? movingTextColors : defaultTriplet;

  const [stableColors, setStableColors] = useState(incoming);
  const pendingRef = useRef(null);

  // shallow compare helper
  const sameTriplet = (a, b) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];

  // When palette prop changes: apply immediately if visible, else stash it.
  useEffect(() => {
    if (!isTriplet(incoming)) return;
    if (isVisible) {
      setStableColors(prev => (sameTriplet(prev, incoming) ? prev : incoming));
      pendingRef.current = null;
    } else {
      // hold for later to avoid flicker while hidden
      pendingRef.current = incoming;
    }
  }, [incoming, isVisible]);

  // When we become visible, commit any pending palette once.
  useEffect(() => {
    if (isVisible && pendingRef.current && !sameTriplet(stableColors, pendingRef.current)) {
      setStableColors(pendingRef.current);
      pendingRef.current = null;
    }
  }, [isVisible, stableColors]);

  // brightness adjust + smooth transition
  const adjustBrightness = (hex, mul) => {
    if (!/^#[0-9a-f]{6}$/i.test(hex)) return hex;
    let r = parseInt(hex.slice(1, 3), 16);
    let g = parseInt(hex.slice(3, 5), 16);
    let b = parseInt(hex.slice(5, 7), 16);
    r = Math.min(255, Math.max(0, Math.floor(r * mul)));
    g = Math.min(255, Math.max(0, Math.floor(g * mul)));
    b = Math.min(255, Math.max(0, Math.floor(b * mul)));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  };

  const colors = useMemo(() => ([
    adjustBrightness(stableColors[0], 1.05),
    adjustBrightness(stableColors[1], 1.25),
    adjustBrightness(stableColors[2], 1.10),
  ]), [stableColors]);

  const textSegments = useMemo(() => ([
    { text: 'Institute Gallery', suffix: '' },
    { text: 'Dyna', suffix: 'mic Media' },
    { text: 'Dyn', suffix: 'mic Media' },
  ]), []);

  const renderMovingContent = (repeatCount = 2) =>
    [...Array(repeatCount)].flatMap((_, repeatIndex) =>
      textSegments.map((segment, i) => (
        <span
          key={`${repeatIndex}-${i}`}
          className="moving-text"
          style={{
            color: colors[i],
            transition: 'color 120ms linear',
          }}
        >
          {segment.text}
          <span className="logo-container">
            <span
              className="svg-icon"
              // If your injected SVG respects currentColor, you could instead set color here.
              style={{ fill: colors[i], transition: 'fill 120ms linear' }}
              dangerouslySetInnerHTML={{ __html: svgIcon }}
            />
          </span>
          {segment.suffix}
        </span>
      ))
    );

  return (
    <div className="title-container" ref={rootRef}>
      <div className="static-title">
        <h1>MassArt 2024</h1>
      </div>
      <div className={`moving-title ${pauseAnimation ? 'paused' : ''}`}>
        <h1 className="title-with-icon moving-text-wrapper">
          {renderMovingContent()}
        </h1>
      </div>
    </div>
  );
};

export default TitleDivider;
