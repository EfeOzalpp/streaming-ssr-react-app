import { setScrollTop } from './scroll';

export function animateScrollToTop(
  scroller: HTMLElement | any,
  targetTop: number,
  ms = 260
): (() => void) | undefined {
  const startTop = scroller.scrollTop || 0;
  const delta = targetTop - startTop;

  if (Math.abs(delta) < 1) {
    setScrollTop(scroller, targetTop);
    return;
  }

  const duration = ms;
  const start = performance.now();

  const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

  let raf = 0;
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / duration);
    const y = startTop + delta * easeOutCubic(t);
    setScrollTop(scroller, y);

    if (t < 1) {
      raf = requestAnimationFrame(step);
    }
  };

  raf = requestAnimationFrame(step);

  return () => {
    if (raf) cancelAnimationFrame(raf);
  };
}
