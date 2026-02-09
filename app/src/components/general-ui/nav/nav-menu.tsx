// src/components/general-ui/nav/NavMenu.tsx
import { useEffect, useRef } from "react";
import lottie from '../../../behaviors/load-lottie';
import titleData from '../../../json-assets/efeozalp.json';
import githubData from '../../../json-assets/github.json';
import linkedinData from '../../../json-assets/linkedin.json';

const NavMenu = () => {
  const lottieContainer = useRef<HTMLDivElement>(null);
  const githubContainer = useRef<HTMLDivElement>(null);
  const linkedinContainer = useRef<HTMLDivElement>(null);

  // Title animation (hover scrubs between frames)
  useEffect(() => {
    const el = lottieContainer.current;
    if (!el) return;

    let anim: any;
    let mounted = true;

    (async () => {
      anim = await lottie.loadAnimation({
        container: el,
        renderer: "svg",
        loop: false,
        autoplay: true,
        animationData: titleData,
      });
      if (!mounted) return;

      const stopAt = 175;
      const startHold = 80;

      const stepToFrame = (target: number) => {
        const step = () => {
          if (!anim) return;
          const cur = anim.currentFrame;
          if (Math.abs(cur - target) <= 1) {
            anim.goToAndStop(target, true);
            return;
          }
          anim.goToAndStop(cur + (cur < target ? 1 : -1), true);
          requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      };

      const onEnterFrame = () => {
        if (anim.currentFrame >= stopAt) {
          anim.removeEventListener("enterFrame", onEnterFrame);
          anim.goToAndStop(stopAt, true);
        }
      };
      const onEnter = () => stepToFrame(startHold);
      const onLeave = () => stepToFrame(stopAt);

      el.addEventListener("mouseenter", onEnter);
      el.addEventListener("mouseleave", onLeave);
      anim.addEventListener("enterFrame", onEnterFrame);

      // cleanup listeners on effect re-run (component unmount cleanup below)
      return () => {
        el.removeEventListener("mouseenter", onEnter);
        el.removeEventListener("mouseleave", onLeave);
        anim?.removeEventListener("enterFrame", onEnterFrame);
      };
    })();

    return () => {
      mounted = false;
      anim?.destroy?.();
      anim = null as any;
    };
  }, []);

  // GitHub animation (auto plays to a frame, then holds)
  useEffect(() => {
    const el = githubContainer.current;
    if (!el) return;

    let anim: any;
    let mounted = true;
    let timer: number | null = null;

    const onEnterFrame = () => {
      if (anim.currentFrame >= 26) {
        anim.removeEventListener("enterFrame", onEnterFrame);
        anim.goToAndStop(26, true);
      }
    };

    (async () => {
      anim = await lottie.loadAnimation({
        container: el,
        renderer: "svg",
        loop: false,
        autoplay: false,
        animationData: githubData,
      });
      if (!mounted) return;

      anim.goToAndStop(0, true);
      timer = window.setTimeout(() => {
        anim.play();
        anim.addEventListener("enterFrame", onEnterFrame);
      }, 1600);
    })();

    return () => {
      mounted = false;
      if (timer != null) window.clearTimeout(timer);
      anim?.removeEventListener?.("enterFrame", onEnterFrame);
      anim?.destroy?.();
      anim = null as any;
    };
  }, []);

  // LinkedIn animation (auto plays to a frame, then holds)
  useEffect(() => {
    const el = linkedinContainer.current;
    if (!el) return;

    let anim: any;
    let mounted = true;
    let timer: number | null = null;

    const onEnterFrame = () => {
      if (anim.currentFrame >= 20) {
        anim.removeEventListener("enterFrame", onEnterFrame);
        anim.goToAndStop(20, true);
      }
    };

    (async () => {
      anim = await lottie.loadAnimation({
        container: el,
        renderer: "svg",
        loop: false,
        autoplay: false,
        animationData: linkedinData,
      });
      if (!mounted) return;

      anim.goToAndStop(0, true);
      timer = window.setTimeout(() => {
        anim.play();
        anim.addEventListener("enterFrame", onEnterFrame);
      }, 1200);
    })();

    return () => {
      mounted = false;
      if (timer != null) window.clearTimeout(timer);
      anim?.removeEventListener?.("enterFrame", onEnterFrame);
      anim?.destroy?.();
      anim = null as any;
    };
  }, []);

  const handleHomeClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    window.location.reload();
  };

  return (
    <nav className="nav-menu">
      <div className="nav-left">
        <a
          href="/"
          className="home-link"
          draggable="false"
          onClick={handleHomeClick}
          aria-label="Home"
        >
          <div ref={lottieContainer} className="title-lottie" />
        </a>
      </div>

      <div className="nav-right">
        <a
          href="https://github.com/EfeOzalpp"
          target="_blank"
          rel="noopener noreferrer"
          className="github-link"
          draggable="false"
          aria-label="GitHub"
        >
          <div ref={githubContainer} className="github-lottie" />
        </a>

        <a
          href="https://www.linkedin.com/in/efe-ozalp/"
          target="_blank"
          rel="noopener noreferrer"
          className="linkedin-link"
          draggable="false"
          aria-label="LinkedIn"
        >
          <div ref={linkedinContainer} className="linkedin-lottie" />
        </a>
      </div>
    </nav>
  );
};

export default NavMenu;
