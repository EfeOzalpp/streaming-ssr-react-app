export function getScroller(
  scrollContainerRef: React.RefObject<HTMLElement | null>
): HTMLElement | null {
  return (
    scrollContainerRef.current ??
    (document.scrollingElement as unknown as HTMLElement | null)
  );
}

export function getOffsetTopWithin(
  el: HTMLElement,
  scroller: HTMLElement | any
): number {
  const r1 = el.getBoundingClientRect();
  const r2 = (scroller as HTMLElement).getBoundingClientRect?.() ?? { top: 0 };
  const st =
    ('scrollTop' in scroller
      ? scroller.scrollTop
      : document.documentElement.scrollTop) || 0;
  return r1.top - r2.top + st;
}

export function setScrollTop(scroller: any, top: number) {
  if ('scrollTop' in scroller) {
    scroller.scrollTop = top;
  } else {
    scroller.scrollTo?.({ top, left: 0, behavior: 'auto' });
  }
}
