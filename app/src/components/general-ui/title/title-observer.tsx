// src/components/general-iu/title/title-observer.tsx
import { useEffect, useRef } from 'react';
import { baseProjects } from '../../../content-orchestration/component-loader';
import { useActiveTitle } from './title-context';
import { useSsrData } from '../../../state/providers/ssr-data-context';
import { seededShuffle } from '../../../content-orchestration/seed';
import { useProjectVisibility } from '../../../state/providers/project-context';

const TitleObserver = () => {
  const { setActiveTitle } = useActiveTitle();
  const { focusedProjectKey } = useProjectVisibility();
  const { seed = 12345 } = useSsrData() || {};

  // Stable order for this session
  const projectsRef = useRef(seededShuffle(baseProjects, seed));
  const lastTitleRef = useRef<string | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const moRef = useRef<MutationObserver | null>(null);

  // Helper: pick the element whose center is closest to viewport center
  const pickCenteredNow = () => {
    // While focused, never mutate the title from visibility.
    if (focusedProjectKey) return;

    const vh = window.innerHeight || document.documentElement.clientHeight || 0;
    const viewportCenter = vh * 0.5;

    let bestTitle: string | null = null;
    let bestDist = Infinity;

    for (const p of projectsRef.current) {
      const el = document.getElementById(`block-${p.key}`);
      if (!el || el.style.display === 'none') continue;

      const r = el.getBoundingClientRect();
      if (r.bottom <= 0 || r.top >= vh) continue;

      const center = r.top + r.height / 2;
      const dist = Math.abs(center - viewportCenter);
      if (dist < bestDist) {
        bestDist = dist;
        bestTitle = p.title;
      }
    }

    if (bestTitle && bestTitle !== lastTitleRef.current) {
      lastTitleRef.current = bestTitle;
      setActiveTitle(bestTitle);
    }
  };

  // Build observer once
  useEffect(() => {
    const io = new IntersectionObserver(
      () => {
        if (focusedProjectKey) return; // ignore while focused
        requestAnimationFrame(pickCenteredNow);
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1] }
    );
    observerRef.current = io;

    // Observe all blocks that exist (will keep observing through display:none)
    for (const p of projectsRef.current) {
      const el = document.getElementById(`block-${p.key}`);
      if (el) io.observe(el);
    }

    // Also react to late-mounted blocks
    const mo = new MutationObserver(() => {
      const cur = observerRef.current;
      if (!cur) return;
      for (const p of projectsRef.current) {
        const el = document.getElementById(`block-${p.key}`);
        if (el) cur.observe(el);
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });
    moRef.current = mo;

    // Initial pick
    requestAnimationFrame(pickCenteredNow);

    return () => {
      io.disconnect();
      mo.disconnect();
      observerRef.current = null;
      moRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // once per mount

  // NEW: Freeze title on focus & pause the observer; resume on unfocus
  useEffect(() => {
    const io = observerRef.current;

    if (focusedProjectKey) {
      // 1) Set title to the focused project's title exactly once on enter
      const focused = projectsRef.current.find(p => p.key === focusedProjectKey);
      if (focused && focused.title !== lastTitleRef.current) {
        lastTitleRef.current = focused.title;
        setActiveTitle(focused.title);
      }
      // 2) Pause the observer work during focus
      io?.disconnect();
    } else {
      // Resubscribe and immediately pick based on visibility when leaving focus
      if (io) {
        for (const p of projectsRef.current) {
          const el = document.getElementById(`block-${p.key}`);
          if (el) io.observe(el);
        }
      }
      requestAnimationFrame(pickCenteredNow);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusedProjectKey, setActiveTitle]);

  return null;
};

export default TitleObserver;
