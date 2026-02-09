import { useEffect } from 'react';
import loadable from '@loadable/component';
import ViewProject from './components/general-ui/title/view-project';
import { TitleProvider } from './components/general-ui/title/title-context';
import ScrollController from './content-orchestration/scroll-controller';
import { ProjectVisibilityProvider } from './state/providers/project-context';

const NavMenu = loadable(
  () => import('./components/general-ui/nav/nav-menu'),
  {
    ssr: false,
    fallback: null,
  }
);

function Frontpage() {
  useEffect(() => {
    // --- Clear prehydrate flag ASAP after hydration ---
    const root = document.getElementById('landing');
    requestAnimationFrame(() => root?.removeAttribute('data-prehydrate'));

    // Allow pinch-zoom only inside elements that explicitly opt in.
    const isAllowZoomTarget = (ev) => {
      const el = ev?.target;
      if (!el || typeof el.closest !== 'function') return false;
      return Boolean(el.closest('[data-allow-zoom="1"], .allow-pinch'));
    };

    // Prevent global pinch zoom (iOS/Android touchmove and Safari gesture*)
    const preventPinchZoom = (event) => {
      const tag = event?.target?.tagName?.toLowerCase?.() || '';
      if (tag === 'video') return;                // let videos use native gestures
      if (isAllowZoomTarget(event)) return;       // opt-in: allow inside pannable
      if ('touches' in event && event.touches?.length > 1) event.preventDefault();
    };

    const preventGesture = (e) => {
      // Safari iOS fires these for pinch
      const tag = e?.target?.tagName?.toLowerCase?.() || '';
      if (tag === 'video') return;
      if (isAllowZoomTarget(e)) return;           // opt-in: allow inside pannable
      e.preventDefault();
    };

    document.addEventListener('touchmove', preventPinchZoom, { passive: false });
    document.addEventListener('gesturestart', preventGesture);
    document.addEventListener('gesturechange', preventGesture);
    document.addEventListener('gestureend', preventGesture);

    return () => {
      document.removeEventListener('touchmove', preventPinchZoom);
      document.removeEventListener('gesturestart', preventGesture);
      document.removeEventListener('gesturechange', preventGesture);
      document.removeEventListener('gestureend', preventGesture);
    };
  }, []);

  return (
    <ProjectVisibilityProvider>
      <div
        className="HereGoesNothing"
        id="landing"
        data-prehydrate
        style={{ position: 'relative' }}
      >
        <NavMenu />
        <TitleProvider>
          <ViewProject />
        </TitleProvider>
        <ScrollController />
      </div>
    </ProjectVisibilityProvider>
  );
}

export default Frontpage;
