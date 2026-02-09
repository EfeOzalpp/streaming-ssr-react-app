// src/dynamic-app/dynamic-app-ssr/dynamic-theme.route.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import loadable from '@loadable/component';
import { createPortal } from 'react-dom';
import { useSsrData } from '../../state/providers/ssr-data-context';
import { useStyleInjection } from '../../state/providers/style-injector';

import {
  primeDynamicThemeFromSSR as primeFromSSR,
  ensureDynamicThemePreload as ensureDynamicPreload,
} from '../preload-dynamic-app-route';
import { enhanceDynamicThemeSSR } from '../../ssr/dynamic-app/UIcards+sort';
import { colorMapping } from '../lib/colorString';
import fetchSVGIcons from '../lib/fetchSVGIcons';
import miscCss from '../../styles/dynamic-app/misc.css?raw';

import {
  normalizeIconMap,
  toClientIconMap,
} from '../lib/svg-icon-map';
import type { IconLike } from '../lib/svg-icon-map';

// use the actual export you have
import { computeStateFromPalette } from '../lib/palette';

// local types to satisfy TS based on your controller’s API
type Quartet = [string, string, string, string];
type Triplet = [string, string, string];

// client-only chunks
const Navigation = loadable(() => import('../components/navigation'), { ssr: false });
const FireworksDisplay = loadable(() => import('../components/fireworksDisplay'), { ssr: false });
const Footer = loadable(() => import('../components/footer'), { ssr: false });
const TitleDivider = loadable(() => import('../components/title'), { ssr: false });
const PauseButton = loadable(() => import('../components/pauseButton'), { ssr: false });

// SSR shell (UI cards + sort stub)
const DynamicTheme = loadable(() => import('../../dynamicTheme'), { ssr: true });

/* ---------- portals ---------- */
function NavigationPortal(props: {
  items: any[];
  arrow1?: string;
  arrow2?: string;
  activeColor?: string;
}) {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  useStyleInjection(miscCss, 'dynamic-app-style-misc');
  useEffect(() => { setTarget(document.getElementById('dynamic-nav-mount')); }, []);
  if (!target) return null;
  return createPortal(
    <Navigation
      items={props.items}
      customArrowIcon2={props.arrow1}
      customArrowIcon={props.arrow2}
      activeColor={props.activeColor ?? '#FFFFFF'}
      isInShadow={false}
      scrollLockContainer={undefined}
    />,
    target
  );
}

function FireworksPortal(props: {
  items: any[];
  activeColor: string;
  lastKnownColor: string;
  onToggleFireworks?: (fn: (enabled: boolean) => void) => void;
}) {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  useEffect(() => { setTarget(document.getElementById('dynamic-fireworks-mount')); }, []);
  if (!target) return null;
  return createPortal(
    <FireworksDisplay
      colorMapping={colorMapping}
      items={props.items}
      activeColor={props.activeColor}
      lastKnownColor={props.lastKnownColor}
      onToggleFireworks={props.onToggleFireworks || (() => {})}
    />,
    target
  );
}

function TitlePortal(props: {
  logoSvg?: string;
  movingTextColors?: Triplet;
  pauseAnimation?: boolean;
}) {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  useEffect(() => { setTarget(document.getElementById('dynamic-title-mount')); }, []);
  if (!target) return null;
  return createPortal(
    <TitleDivider
      svgIcon={props.logoSvg || ''}
      movingTextColors={props.movingTextColors || ['#FFFFFF', '#FFFFFF', '#FFFFFF']}
      pauseAnimation={!!props.pauseAnimation}
    />,
    target
  );
}

function PausePortal(props: { onToggle: (isEnabled: boolean) => void }) {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  useEffect(() => { setTarget(document.getElementById('dynamic-pause-mount')); }, []);
  if (!target) return null;
  return createPortal(
    <div className="pause-button-wrapper">
      <PauseButton toggleP5Animation={props.onToggle} />
    </div>,
    target
  );
}

function FooterPortal(props: {
  arrow1?: string;
  linkArrowIcon?: string;
}) {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  useEffect(() => { setTarget(document.getElementById('dynamic-footer-mount')); }, []);
  if (!target) return null;
  return createPortal(
    <Footer
      customArrowIcon2={props.arrow1}
      linkArrowIcon={props.linkArrowIcon}
    />,
    target
  );
}

/* ---------- route ---------- */
export default function DynamicThemeRoute() {
  const ssr = useSsrData();
  const preload = ssr?.preloaded?.dynamicTheme;

  const [items, setItems] = useState<any[]>(Array.isArray(preload?.images) ? preload!.images : []);
  const [icons, setIcons] = useState<Record<string, string>>(normalizeIconMap(preload?.icons || {}));
  const [pauseAnimation, setPauseAnimation] = useState(false);

  const [activeColor, setActiveColor] = useState('#FFFFFF');
  const [movingTextColors, setMovingTextColors] = useState<Triplet>(['#FFFFFF', '#FFFFFF', '#FFFFFF']);
  const [lastKnownColor, setLastKnownColor] = useState('#FFFFFF');

  const fwToggleRef = useRef<((enabled: boolean) => void) | null>(null);
  const handleSetToggleFireworks = (fn: (enabled: boolean) => void) => { fwToggleRef.current = fn; };
  const handlePauseToggle = (isEnabled: boolean) => {
    setPauseAnimation(!isEnabled);
    try { fwToggleRef.current?.(isEnabled); } catch {}
  };

  useEffect(() => { if (preload) primeFromSSR(preload); }, [preload]);

  useEffect(() => {
    const w = typeof window !== 'undefined' ? (window as any) : null;
    const boot = w?.__DYNAMIC_THEME_PRELOAD__;
    if (boot) {
      if (Array.isArray(boot.images)) setItems(boot.images);
      if (boot.icons) setIcons(normalizeIconMap(boot.icons));
      primeFromSSR(boot);
    }
  }, []);

  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        const cache = await ensureDynamicPreload();
        if (!dead && cache) {
          if (!items.length && Array.isArray(cache.images)) setItems(cache.images);
          if (!Object.keys(icons).length && cache.icons) setIcons(normalizeIconMap(cache.icons));
        }
      } catch {}
    })();
    return () => { dead = true; };
  }, []);

  useEffect(() => {
    let dead = false;
    (async () => {
      if (icons && (icons['arrow1'] || icons['arrow2'] || icons['link-icon'] || icons['logo-small-1'])) return;
      try {
        const raw = (await fetchSVGIcons().catch(() => [])) as IconLike[];
        if (!dead && Array.isArray(raw)) {
          const map = toClientIconMap(raw);
          if (Object.keys(map).length) setIcons(prev => ({ ...map, ...prev }));
        }
      } catch {}
    })();
    return () => { dead = true; };
  }, [icons]);

  // compute palette-driven state from the enhancer (which gives a Quartet)
  useEffect(() => {
    if (typeof window !== 'undefined')
      enhanceDynamicThemeSSR({
        onColorChange: (_alt: string, palette?: string[] | null) => {
          // only accept quartets
          if (!Array.isArray(palette) || palette.length < 4) return;
          const { activeColor: nextActive, movingText: nextTriplet, lastKnown } =
            computeStateFromPalette(palette as Quartet);

          if (nextActive !== activeColor) {
            setActiveColor(nextActive);
            setLastKnownColor(lastKnown ?? nextActive);
          }
          setMovingTextColors(nextTriplet as Triplet);
        },
      });
  }, [activeColor]);

  const propsMemo = useMemo(() => ({
    items,
    arrow1: icons['arrow1'] || '',
    arrow2: icons['arrow2'] || '',
    linkArrowIcon: icons['link-icon'] || '',
    logoSmall: icons['logo-small-1'] || '',
  }), [items, icons]);

  return (
    <>
      <DynamicTheme />

      <NavigationPortal
        items={propsMemo.items}
        arrow1={propsMemo.arrow1}
        arrow2={propsMemo.arrow2}
        activeColor={activeColor}
      />

      <FireworksPortal
        items={propsMemo.items}
        activeColor={activeColor}
        lastKnownColor={lastKnownColor}
        onToggleFireworks={handleSetToggleFireworks}
      />

      <TitlePortal
        logoSvg={propsMemo.logoSmall}
        movingTextColors={movingTextColors}
        pauseAnimation={pauseAnimation}
      />

      <PausePortal onToggle={handlePauseToggle} />

      <FooterPortal
        arrow1={propsMemo.arrow1}
        linkArrowIcon={propsMemo.linkArrowIcon}
      />
    </>
  );
}
