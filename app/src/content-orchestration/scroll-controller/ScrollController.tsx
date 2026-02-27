// src/ScrollController/ScrollController.tsx
import { useState, useEffect, useMemo, useRef } from 'react';
import { useProjectVisibility } from '../../state/providers/project-context';
import { baseProjects } from '../component-loader';
import { ProjectPane } from '../project-pane';
import { useSsrData } from '../../state/providers/ssr-data-context';
import { orderProjectsTopTwoSeeded } from '../seed/project-order';

import { useRealMobileViewport } from '../../shared/useRealMobile';

import type { ScrollControllerProps } from './types';
import { useProjectRefs } from './hooks/useProjectRefs';
import { useFocusEntryChoreography } from './hooks/useFocusEntryChoreography';
import { useAutoUnfocusWhileFocused } from './hooks/useAutoUnfocusWhileFocused';
import { useFocusExitChoreography } from './hooks/useFocusExitChoreography';

type ProjectLike = { key: string; [k: string]: any };

function useMaxWidth(max: number) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${max}px)`);
    const update = () => setMatches(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, [max]);

  return matches;
}

const ScrollController = ({ className }: ScrollControllerProps) => {
  const { scrollContainerRef, focusedProjectKey, setFocusedProjectKey } =
    useProjectVisibility();

  const isRealMobile = useRealMobileViewport();
  const isUnder900 = useMaxWidth(900);
  const isSnapMode = isRealMobile && isUnder900;

  const { seed = 12345 } = useSsrData() || {};

  // stable order for session
  const projectsRef = useRef<ProjectLike[]>(
    orderProjectsTopTwoSeeded(baseProjects as any, seed) as any
  );
  const projects = projectsRef.current;

  const { projectRefs, setProjectRef } = useProjectRefs();

  // Track last non-null focused key (used for exit anchoring)
  const lastFocusedKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (focusedProjectKey) lastFocusedKeyRef.current = focusedProjectKey;
  }, [focusedProjectKey]);

  // Preferred exit target (set when user scrolls away during focus)
  const exitTargetKeyRef = useRef<string | null>(null);

  // Entry: when focus engages, align that pane
  useFocusEntryChoreography({
    scrollContainerRef,
    focusedProjectKey,
    projectRefs,
  });

  // While focused: if user scrolls enough that another pane is visible, exit focus
  useAutoUnfocusWhileFocused({
    enabled: isSnapMode,
    scrollContainerRef,
    focusedProjectKey,
    setFocusedProjectKey,
    projects,
    exitTargetKeyRef,
    visRatioToExit: 0.2,
    visDwellMs: 120,
  });

  // On focus exit: do the anchor / proximity ramp choreography
  // (matches your current hook signature: enabled + refs only)
  useFocusExitChoreography({
    enabled: isSnapMode,
    scrollContainerRef,
    focusedProjectKey,
    projectRefs,
    lastFocusedKeyRef,
    exitTargetKeyRef,
  });

  const focusedIdx = focusedProjectKey
    ? projects.findIndex((p) => p.key === focusedProjectKey)
    : -1;

  const blockIds = useMemo(() => projects.map((p) => `#block-${p.key}`), [projects]);
  void blockIds; // reserved for future consumers

  return (
    <div
      ref={scrollContainerRef}
      className={`Scroll ${className ?? ''} ${isSnapMode ? '' : 'no-snap-desktop'}`}
      style={{
        overflowY: 'auto',
        scrollSnapType: isSnapMode ? (focusedProjectKey ? 'none' : 'y mandatory') : 'none',
        scrollBehavior: isSnapMode ? 'smooth' : 'auto',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      }}
    >
      <style>{`
        .Scroll::-webkit-scrollbar { display: none; }
        .Scroll { overscroll-behavior: auto; }
        .embedded-app { touch-action: pan-y; overscroll-behavior: auto; }

        /* used by exit choreography */
        .Scroll.no-snap { scroll-snap-type: none !important; }
        .Scroll.snap-proximity { scroll-snap-type: y proximity !important; }
      `}</style>

      {projects.map((item, idx) => {
        const isFocused = focusedProjectKey === item.key;
        const collapseBelow = focusedIdx >= 0 && idx > focusedIdx;

        return (
          <ProjectPane
            key={item.key}
            item={item}
            isFocused={isFocused}
            collapseBelow={collapseBelow}
            isFirst={idx === 0}
            setRef={(el) => setProjectRef(item.key, el)}
          />
        );
      })}
    </div>
  );
};

export default ScrollController;