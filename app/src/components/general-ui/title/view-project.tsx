// src/components/general-iu/title/view-project.tsx
import { useEffect, useMemo, useRef, useState } from 'react';

import { useActiveTitle } from './title-context';
import { baseProjects } from '../../../content-orchestration/component-loader';
import { projectColors } from '../../../shared/color-map';
import { useSsrData } from '../../../state/providers/ssr-data-context';
import { seededShuffle } from '../../../content-orchestration/seed';

import TitleObserver from './title-observer';
import { useProjectVisibility } from '../../../state/providers/project-context';

import {
  ProjectButtonTitleIcon,
  ProjectButtonIconTitle,
} from './view-project-cta';

const ViewProject = () => {
  const { activeTitle } = useActiveTitle();
  const { seed = 12345 } = useSsrData() || {};
  const projects = useMemo(() => seededShuffle(baseProjects, seed), [seed]);

  const { focusedProjectKey, setFocusedProjectKey } = useProjectVisibility();

  const focusedProject = useMemo(
    () => projects.find(p => p.key === focusedProjectKey!),
    [projects, focusedProjectKey]
  );

  // Freeze the title (and everything derived from it) when focused
  const displayTitle = focusedProjectKey ? (focusedProject?.title ?? activeTitle) : activeTitle;

  const currentProject = useMemo(
    () => projects.find((p) => p.title === displayTitle),
    [projects, displayTitle]
  );
  const isLink = currentProject?.isLink;
  const currentKey = currentProject?.key;

  // background / hover logic
  const [hovered, _setHovered] = useState(false);
  const hoveredRef = useRef(false);
  const [showBackground, setShowBackground] = useState(true);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHide = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  };

  // single place to schedule/clear hides respecting hover
  const scheduleHide = (delay = 1500) => {
    clearHide();
    hideTimeoutRef.current = setTimeout(() => {
      if (!hoveredRef.current) setShowBackground(false);
    }, delay);
  };

  const setHovered = (v: boolean) => {
    hoveredRef.current = v;
    _setHovered(v);
    if (v) {
      clearHide();
      setShowBackground(true);
    } else {
      scheduleHide(1500);
    }
  };

  // RESET hover/background appropriately when focus toggles
  useEffect(() => {
    if (focusedProjectKey) {
      // entering focus: make bg visible and don't auto-hide
      clearHide();
      setShowBackground(true);
      hoveredRef.current = false;
      _setHovered(false);
    } else {
      // leaving focus: briefly show, then allow auto-hide if not hovered
      setShowBackground(true);
      hoveredRef.current = false;
      _setHovered(false);
      scheduleHide(1500);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusedProjectKey]);

  // on title change: flash bg on, then hide later ONLY if not hovered
  const lastTitleRef = useRef(displayTitle);
  useEffect(() => {
    if (lastTitleRef.current !== displayTitle) {
      lastTitleRef.current = displayTitle;
      setShowBackground(true);
      if (!hoveredRef.current && !focusedProjectKey) {
        scheduleHide(1500);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayTitle]);

  // light “bring it back” when user interacts near bottom — but don't hide if hovered
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const viewportH = window.innerHeight || document.documentElement.clientHeight;
      if (e.clientY >= viewportH * 0.65) {
        setShowBackground(true);
        if (!hoveredRef.current && !focusedProjectKey) scheduleHide(1500);
      }
    };
    const handleTouch = () => {
      setShowBackground(true);
      if (!hoveredRef.current && !focusedProjectKey) scheduleHide(1500);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchstart', handleTouch, { passive: true });
    window.addEventListener('touchmove', handleTouch, { passive: true });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchstart', handleTouch);
      window.removeEventListener('touchmove', handleTouch);
      clearHide();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // compute background color (hovered = higher alpha)
  const backgroundColor = useMemo(() => {
    const colorInfo = projectColors[displayTitle];
    if (!colorInfo) return 'rgba(240, 240, 240, 0.5)';
    const alpha = hovered ? 1 : (colorInfo.defaultAlpha ?? 0.8);
    return `rgba(${colorInfo.rgb}, ${alpha})`;
  }, [displayTitle, hovered]);

  // choose variant based on focus state
  const ButtonComp = focusedProjectKey ? ProjectButtonIconTitle : ProjectButtonTitleIcon;

  return (
    <div className="view-project-wrapper">
      {/* Don’t observe while focused, so title stays frozen */}
      {!focusedProjectKey && <TitleObserver />}

      <ButtonComp
        displayTitle={displayTitle}
        isLink={isLink}
        currentKey={currentKey}
        focusedProjectKey={focusedProjectKey}
        setFocusedProjectKey={setFocusedProjectKey}
        showBackground={showBackground}
        backgroundColor={backgroundColor}
        onHover={setHovered}
      />
    </div>
  );
};

export default ViewProject;
