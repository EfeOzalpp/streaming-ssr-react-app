import { useEffect } from 'react';
import { getScroller, getOffsetTopWithin } from '../lib/scroll';
import { animateScrollToTop } from '../lib/animate';

export function useFocusEntryChoreography(opts: {
  scrollContainerRef: React.RefObject<HTMLElement | null>;
  focusedProjectKey: string | null;
  projectRefs: React.RefObject<Record<string, HTMLDivElement | null>>;
}) {
  const { scrollContainerRef, focusedProjectKey, projectRefs } = opts;

  useEffect(() => {
    if (!focusedProjectKey) return;

    const scroller = getScroller(scrollContainerRef);
    if (!scroller) return;

    const targetEl =
      projectRefs.current[focusedProjectKey] ??
      (document.getElementById(
        `block-${focusedProjectKey}`
      ) as HTMLDivElement | null);

    if (!targetEl) return;

    requestAnimationFrame(() => {
      const targetTop = getOffsetTopWithin(targetEl, scroller);
      animateScrollToTop(scroller, targetTop + scroller.clientHeight * 0.33, 400);
    });
  }, [focusedProjectKey, scrollContainerRef, projectRefs]);
}
