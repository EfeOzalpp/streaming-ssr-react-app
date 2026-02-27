import { useEffect } from 'react';
import { getScroller } from '../lib/scroll';

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

    requestAnimationFrame(() => {
      targetEl?.scrollIntoView?.({ block: 'start', behavior: 'smooth' });
    });
  }, [focusedProjectKey, scrollContainerRef, projectRefs]);
}