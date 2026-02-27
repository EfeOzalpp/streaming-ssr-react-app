// src/behaviors/useRealMobile.ts
import { useEffect, useState } from 'react';

export function useRealMobileViewport() {
  const [isRealMobile, setIsRealMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const touchPoints = navigator.maxTouchPoints ?? 0;
      const touch = touchPoints > 0;

      const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
      const width = window.innerWidth;

      const ua = navigator.userAgent || navigator.vendor || (window as any).opera || '';

      // iOS detection (iPhone / iPad)
      const isIOS =
        /iPad|iPhone|iPod/.test(ua) ||
        (navigator.platform === 'MacIntel' && touch); // iPadOS pretends to be Mac

      // Android detection
      const isAndroid = /Android/.test(ua);

      const looksMobileUA = /Android|iPhone|iPad|iPod/.test(ua);

      function isLikelyEmulatedMobile() {
        // Strong signal: automation
        const webdriver = (navigator as any).webdriver === true;

        // Heuristic: "mobile-ish runtime" but UA doesn't look mobile.
        // (This is the classic DevTools case: small viewport + touch, but desktop UA.)
        const looksMobileRuntime = touch && width <= 1024;
        const devtoolsStyleEmulation = looksMobileRuntime && !looksMobileUA;

        return webdriver || devtoolsStyleEmulation;
      }

      const realMobile =
        ((touch && width <= 1024) || isIOS || isAndroid || coarse || looksMobileUA) &&
        !isLikelyEmulatedMobile();

      setIsRealMobile(realMobile);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    window.addEventListener('orientationchange', checkMobile);

    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('orientationchange', checkMobile);
    };
  }, []);

  return isRealMobile;
}
