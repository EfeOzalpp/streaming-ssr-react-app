// src/components/rock-escapade/GameCanvas.tsx
import { useEffect, useRef } from 'react';
import { useRealMobileViewport } from '../../behaviors/useRealMobile';

type Props = {
  onCoinsChange?: (coins: number) => void;
  highScore?: number;
  onGameOver?: (finalCoins: number, isNewHigh: boolean) => void;
  onReady?: (api: { restart: () => void }) => void;
  pauseWhenHidden?: boolean;
  demoMode?: boolean;
  overlayActive?: boolean;
  allowSpawns?: boolean;
};

export default function GameCanvas({
  onCoinsChange,
  highScore = 0,
  onGameOver,
  onReady,
  pauseWhenHidden = true,
  demoMode = false,
  overlayActive = false,
  allowSpawns = true,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const q5Ref = useRef<any>(null);
  const visibleRef = useRef(true);
  const cleanupRef = useRef<(() => void) | null>(null);

  // prop refs
  const coinsChangeRef = useRef(onCoinsChange);
  const gameOverRef = useRef(onGameOver);
  const readyRef = useRef(onReady);
  const highScoreRef = useRef(highScore);
  const pauseHiddenRef = useRef(pauseWhenHidden);
  const demoRef = useRef(!!demoMode);
  const overlayRef = useRef(!!overlayActive);
  const allowSpawnsRef = useRef(allowSpawns);

  coinsChangeRef.current = onCoinsChange;
  gameOverRef.current = onGameOver;
  readyRef.current = onReady;
  highScoreRef.current = highScore;
  pauseHiddenRef.current = pauseWhenHidden;
  demoRef.current = !!demoMode;
  overlayRef.current = !!overlayActive;
  allowSpawnsRef.current = !!allowSpawns;

  const isRealMobile = useRealMobileViewport();

  useEffect(() => {
    let alive = true;
    let io: IntersectionObserver | null = null;
    let onResize: (() => void) | null = null;

    import('q5').then((q5mod) => {
      if (!alive) return;
      const q5 = (q5mod as any).default ?? (q5mod as any);

      const el = hostRef.current;
      if (!el || !el.isConnected) return;

      // clear any old instance/canvas
      el.replaceChildren();
      if (q5Ref.current?.remove) {
        try { q5Ref.current.remove(); } catch {}
        q5Ref.current = null;
      }

      const sketch = (p: any) => {
        // ---------------- Local state ----------------
        let verticalMode = false;
        let rectangles: any[] = [];
        let octagons: any[] = [];
        let particles: any[] = [];
        let projectiles: any[] = [];
        let circle: any;
        let lastSpawnTime = 0;
        let lastOctagonSpawnTime = 0;
        let rectangleSpawnRate = 2;
        let coins = 0;
        let gameOver = false;
        let prevGameOver = false;
        let lastDemoFlag = true;

        let lastFiredTime = -Infinity;
        const cooldownDuration = 1500;
        const cooldownRadiusMax = 48;

        // perf caps
        const MAX_PARTICLES = isRealMobile ? 600 : 1200;
        const MAX_PROJECTILES = 140;
        const MAX_RECTANGLES = 220;

        // ---------- Pointer gesture state ----------
        let dragPointerId: number | null = null;
        let lastTouch: { x: number; y: number } | null = null;

        let primaryCandidateId: number | null = null;
        type TapInfo = { x0: number; y0: number; x: number; y: number; t0: number };
        let primaryTapInfo: TapInfo | null = null;

        const tapCandidates = new Map<number, TapInfo>();

        // thresholds
        const TAP_MS = 180;
        const TAP_MOVE = 12;     // also used as drag promotion threshold
        const DRAG_PROMOTE = TAP_MOVE;
        const baseImpulse = isRealMobile ? 0.5 : 0.35;

        let movingUp = false;
        let movingDown = false;
        let movingLeft = false;
        let movingRight = false;

        // cached colors
        let GOLD_COLORS: any[] = [];

        // small scratch object to avoid GC in getCanvasCoords
        const scratchXY = { x: 0, y: 0 };

        function canSpawn() {
          return demoRef.current || allowSpawnsRef.current;
        }

        // ---------------- API ----------------
        const restartGame = () => {
          gameOver = false;
          coins = 0;
          coinsChangeRef.current?.(coins);
          rectangles.length = 0;
          octagons.length = 0;
          particles.length = 0;
          projectiles.length = 0;
          circle = new Circle(p, 240, p.height / 2, 33);
          (q5Ref.current as any).circle = circle;
          lastOctagonSpawnTime = p.millis();
        };
        (p as any).restartGame = restartGame;

        // ---------------- Setup ----------------
        p.setup = () => {
          const w = el.offsetWidth;
          const h = el.offsetHeight;

          if (isRealMobile && p.pixelDensity) p.pixelDensity(1);
          p.frameRate?.(60);
          p.createCanvas(w, h);

          // keep the page from stealing gestures
          (el as HTMLElement).style.touchAction = 'none';
          (p as any).canvas.style.touchAction = 'none';
          (el as HTMLElement).style.overscrollBehavior = 'none';
          (el as HTMLElement).style.webkitUserSelect = 'none';
          (el as HTMLElement).style.userSelect = 'none';

          const canvas = (p as any).canvas as HTMLCanvasElement;

          const getCanvasCoords = (e: PointerEvent) => {
            const r = canvas.getBoundingClientRect();
            scratchXY.x = (e.clientX - r.left) * (p.width / r.width);
            scratchXY.y = (e.clientY - r.top) * (p.height / r.height);
            return scratchXY;
          };

          const promoteToDrag = (pointerId: number, x: number, y: number) => {
            dragPointerId = pointerId;
            lastTouch = { x, y };
            try { canvas.setPointerCapture(pointerId); } catch {}
          };

          // ----- handlers -----
          const onDown = (e: PointerEvent) => {
            if (demoRef.current || overlayRef.current) return;
            const { x, y } = getCanvasCoords(e);

            if (dragPointerId === null && primaryCandidateId === null) {
              primaryCandidateId = e.pointerId;
              primaryTapInfo = { x0: x, y0: y, x, y, t0: p.millis() };
            } else {
              tapCandidates.set(e.pointerId, { x0: x, y0: y, x, y, t0: p.millis() });
            }
            e.preventDefault();
          };

          const onMove = (e: PointerEvent) => {
            if (demoRef.current || overlayRef.current) return;
            const { x, y } = getCanvasCoords(e);

            // Candidate → promote to drag when moved enough
            if (primaryCandidateId === e.pointerId && dragPointerId === null) {
              if (primaryTapInfo) { primaryTapInfo.x = x; primaryTapInfo.y = y; }
              const dx0 = x - (primaryTapInfo?.x0 ?? x);
              const dy0 = y - (primaryTapInfo?.y0 ?? y);
              const moved = Math.hypot(dx0, dy0);
              if (moved > DRAG_PROMOTE) {
                promoteToDrag(e.pointerId, x, y);
                primaryCandidateId = null;
                primaryTapInfo = null;
              }
              e.preventDefault();
              return;
            }

            // Active drag: only this pointer moves the ship
            if (e.pointerId === dragPointerId) {
              if (!lastTouch || !circle) { lastTouch = { x, y }; e.preventDefault(); return; }
              const dx = x - lastTouch.x;
              const dy = y - lastTouch.y;
              const dist = Math.hypot(dx, dy) || 1;
              const speedFactor = Math.log2(dist + 1);
              const force = baseImpulse * speedFactor;
              circle.vx += (dx / dist) * force;
              circle.vy += (dy / dist) * force;
              lastTouch = { x, y };
              e.preventDefault();
              return;
            }

            // Secondary tap candidates: track movement for tap thresholding
            const ti = tapCandidates.get(e.pointerId);
            if (ti) { ti.x = x; ti.y = y; }
            e.preventDefault();
          };

          const tryFire = () => {
            const now = p.millis();
            if (now - lastFiredTime >= cooldownDuration) {
              lastFiredTime = now;
              const vx = (circle.vx !== 0 || circle.vy !== 0) ? circle.vx : 5;
              const vy = (circle.vy !== 0 || circle.vx !== 0) ? circle.vy : 0;
              projectiles.push(new Projectile(p, circle.x, circle.y, vx, vy));
              if (projectiles.length > MAX_PROJECTILES) {
                projectiles.splice(0, projectiles.length - MAX_PROJECTILES);
              }
            }
          };

          const onUp = (e: PointerEvent) => {
            if (demoRef.current || overlayRef.current) return;

            // End drag only if the drag pointer lifted
            if (e.pointerId === dragPointerId) {
              try { canvas.releasePointerCapture(e.pointerId); } catch {}
              dragPointerId = null;
              lastTouch = null;
              e.preventDefault();
              return;
            }

            // Primary candidate ended without being promoted → evaluate as tap
            if (primaryCandidateId === e.pointerId && dragPointerId === null) {
              const ti = primaryTapInfo;
              primaryCandidateId = null;
              primaryTapInfo = null;
              if (ti) {
                const dt = p.millis() - ti.t0;
                const moved = Math.hypot(ti.x - ti.x0, ti.y - ti.y0);
                if (dt <= TAP_MS && moved <= TAP_MOVE) tryFire();
              }
              e.preventDefault();
              return;
            }

            // Secondary tap candidate → evaluate as tap
            const ti = tapCandidates.get(e.pointerId);
            if (ti) {
              tapCandidates.delete(e.pointerId);
              const dt = p.millis() - ti.t0;
              const moved = Math.hypot(ti.x - ti.x0, ti.y - ti.y0);
              if (dt <= TAP_MS && moved <= TAP_MOVE) tryFire(); // does NOT affect drag
              e.preventDefault();
            }
          };

          const onCancel = (e: PointerEvent) => {
            // Clean up states safely
            if (e.pointerId === dragPointerId) {
              dragPointerId = null;
              lastTouch = null;
            }
            if (primaryCandidateId === e.pointerId) {
              primaryCandidateId = null;
              primaryTapInfo = null;
            }
            tapCandidates.delete(e.pointerId);
          };

          canvas.addEventListener('pointerdown', onDown, { passive: false });
          canvas.addEventListener('pointermove', onMove, { passive: false });
          canvas.addEventListener('pointerup', onUp, { passive: false });
          canvas.addEventListener('pointercancel', onCancel as any, { passive: false });
          canvas.addEventListener('lostpointercapture', (e: any) => {
            if (e.pointerId === dragPointerId) {
              dragPointerId = null;
              lastTouch = null;
            }
          });

          (p as any)._pointerCleanup = () => {
            try {
              canvas.removeEventListener('pointerdown', onDown as any);
              canvas.removeEventListener('pointermove', onMove as any);
              canvas.removeEventListener('pointerup', onUp as any);
              canvas.removeEventListener('pointercancel', onCancel as any);
            } catch {}
          };

          verticalMode = window.innerWidth <= 1024 && window.innerHeight > window.innerWidth;

          GOLD_COLORS = [
            p.color(255, 215, 0),
            p.color(255, 223, 70),
            p.color(255, 200, 0),
            p.color(255, 170, 50),
          ];

          lastOctagonSpawnTime = p.millis();
          circle = new Circle(p, 240, h / 2, 33);
          (q5Ref.current as any).circle = circle;

          readyRef.current?.({ restart: restartGame });
        };

        // ---------------- Draw loop ----------------
        p.draw = () => {
          const demo = demoRef.current;

          // detect demo → live transition
          if (!demo && lastDemoFlag) {
            rectangles.length = 0;
            octagons.length = 0;
            particles.length = 0;
            projectiles.length = 0;
            coins = 0;
            coinsChangeRef.current?.(0);

            circle.x = 240;
            circle.y = p.height / 2;
            circle.vx = circle.vy = circle.ax = circle.ay = 0;

            const now = p.millis();
            lastOctagonSpawnTime = now;
            lastSpawnTime = now;
          }
          lastDemoFlag = demo;

          if (pauseHiddenRef.current && !visibleRef.current) {
            p.background(28);
            return;
          }

          const delta = p.deltaTime / 16.67;
          const nowMillis = p.millis();
          const vw = p.width;
          const vh = p.height;

          p.background(28);

          if (!demo && overlayRef.current) {
            movingUp = movingDown = movingLeft = movingRight = false;
            circle.stopHorizontal();
            circle.stopVertical();
          }

          if (demo) {
            autoEvade();
          } else {
            if (movingUp) circle.moveUp(); else if (movingDown) circle.moveDown(); else circle.stopVertical();
            if (movingLeft) circle.moveLeft(); else if (movingRight) circle.moveRight(); else circle.stopHorizontal();
          }

          circle.update(delta, vw, vh);
          circle.display(p);

          spawnRectangles(p, nowMillis, vw, vh);
          updateRectangles(p, delta, nowMillis, vw, vh);

          spawnOctagons(p, nowMillis);
          updateOctagons(p, delta, vw, vh);

          if (!isRealMobile) p.blendMode(p.ADD);
          // update & draw particles
          for (let i = particles.length - 1; i >= 0; i--) {
            const part = particles[i];
            part.update(delta);
            part.display(p);
            if (part.isDead()) particles.splice(i, 1);
          }
          if (!isRealMobile) p.blendMode(p.BLEND);

          // projectiles
          for (let i = projectiles.length - 1; i >= 0; i--) {
            const proj = projectiles[i];
            proj.update(delta, vw, vh);
            proj.display(p);
            if (proj.isDead(vw, vh)) projectiles.splice(i, 1);
          }

          // live-mode only HUD & game-over
          if (!demo) {
            if (!prevGameOver && gameOver) {
              const isNewHigh = coins > (highScoreRef.current ?? 0);
              gameOverRef.current?.(coins, isNewHigh);
            }
            prevGameOver = gameOver;

            if (gameOver) { p.background(28, 180); return; }
            drawCooldownRing(p, nowMillis);
          } else {
            gameOver = false; // demo never ends
          }

          // --- helpers (closed over locals) ---
          function drawCooldownRing(pAny: any, now: number) {
            const elapsed = now - lastFiredTime;
            if (elapsed >= cooldownDuration) return;
            const progress = 1 - (elapsed / cooldownDuration);
            const radius = progress * cooldownRadiusMax;
            pAny.noStroke();
            pAny.fill(200, 150, 255, 100);
            pAny.ellipse(circle.x, circle.y, radius * 2, radius * 2);
          }
        };

        // --- Demo simple AI: evade rectangles, seek octagons
        function autoEvade() {
          let evadeX = 0, evadeY = 0, danger = 0;

          for (const rect of rectangles) {
            const cx = rect.x + rect.w / 2;
            const cy = rect.y + rect.h / 2;
            const dx = circle.x - cx;
            const dy = circle.y - cy;
            const distSq = dx * dx + dy * dy;
            if (distSq < 20000) {
              const dist = Math.sqrt(distSq) || 1;
              const weight = 1 / (dist + 300);
              const force = weight * 150;
              evadeX += (dx / dist) * force;
              evadeY += (dy / dist) * force;
              danger += (1 / (dist + 1)) * 10;
            }
          }

          let attractX = 0, attractY = 0;
          if (octagons.length > 0 && danger < 50) {
            const target = octagons.reduce((a, b) => {
              const da = Math.hypot(circle.x - (a.x + a.size / 2), circle.y - (a.y + a.size / 2));
              const db = Math.hypot(circle.x - (b.x + b.size / 2), circle.y - (b.y + b.size / 2));
              return db < da ? b : a;
            });
            const dx = (target.x + target.size / 2) - circle.x;
            const dy = (target.y + target.size / 2) - circle.y;
            const d = Math.hypot(dx, dy) || 1;
            attractX = (dx / d) * 0.45;
            attractY = (dy / d) * 0.45;
          }

          circle.ax = evadeX + attractX;
          circle.ay = evadeY + attractY;

          if (circle.ax === 0 && circle.ay === 0) {
            const cx = p.width / 2 - circle.x;
            const cy = p.height / 2 - circle.y;
            const d = Math.hypot(cx, cy) || 1;
            circle.ax = (cx / d) * 0.1;
            circle.ay = (cy / d) * 0.1;
          }
        }

        // ---------------- Spawners/Updaters ----------------
        function spawnRectangles(p: any, now: number, vw: number, vh: number) {
          if (!allowSpawnsRef.current) return;
          if (!canSpawn()) return;

          const inView = rectangles.filter((r) =>
            verticalMode ? r.y + r.h > 0 && r.y < vh : r.x + r.w > 0 && r.x < vw
          ).length;

          let maxRectangles: number;
          const ww = window.innerWidth;
          const wh = window.innerHeight;
          if (ww >= 1025) {
            maxRectangles = 50;
            if (inView < 10) rectangleSpawnRate = 6;
            else if (inView < 25) rectangleSpawnRate = 5;
            else if (inView < 40) rectangleSpawnRate = 4;
            else rectangleSpawnRate = 0;
          } else if (ww >= 768) {
            maxRectangles = 60;
            if (inView < 8) rectangleSpawnRate = 5;
            else if (inView < 20) rectangleSpawnRate = 4;
            else if (inView < 40) rectangleSpawnRate = 3;
            else rectangleSpawnRate = 0;
          } else {
            maxRectangles = 25;
            if (inView < 10) rectangleSpawnRate = 4;
            else if (inView < 20) rectangleSpawnRate = 3;
            else rectangleSpawnRate = 1;
          }

          if (rectangleSpawnRate > 0 && now - lastSpawnTime > 2000 / rectangleSpawnRate && inView < maxRectangles) {
            rectangles.push(new Shape(p, true, false, verticalMode, GOLD_COLORS));
            lastSpawnTime = now;
          }

          if (rectangles.length > MAX_RECTANGLES) rectangles.splice(0, rectangles.length - MAX_RECTANGLES);

          if (now % 5000 < 20) {
            rectangles = rectangles.filter((r) => !isNaN(r.x) && !isNaN(r.y));
          }
        }

        function updateRectangles(p: any, delta: number, now: number, vw: number, vh: number) {
          for (let i = rectangles.length - 1; i >= 0; i--) {
            const r = rectangles[i];
            r.update(delta);
            r.display(p);
            if (!demoRef.current && circle.overlaps(r)) gameOver = true;

            // projectile collision
            for (let j = projectiles.length - 1; j >= 0; j--) {
              const proj = projectiles[j];
              const projSize = (proj.size ?? proj.radius * 2);
              const projX = proj.x - (proj.size ? proj.size / 2 : proj.radius);
              const projY = proj.y - (proj.size ? proj.size / 2 : proj.radius);
              const projW = projSize;
              const projH = projSize;

              if (
                projX + projW > r.x &&
                projX < r.x + r.w &&
                projY + projH > r.y &&
                projY < r.y + r.h
              ) {
                if (proj instanceof RectangleProjectile) {
                  if (p.random() < 0.05) {
                    rectangles.splice(i, 1);
                    projectiles.splice(j, 1);
                    burstRectangles(p, r.x + r.w / 2, r.y + r.h / 2);
                  } else {
                    proj.vx *= -1;
                    proj.vy *= -1;
                    proj.x += proj.vx * delta * 2;
                    proj.y += proj.vy * delta * 2;
                  }
                } else {
                  rectangles.splice(i, 1);
                  projectiles.splice(j, 1);
                  burstRectangles(p, r.x + r.w / 2, r.y + r.h / 2);
                }
                break;
              }
            }

            const off = verticalMode
              ? r.y - r.h > vh + 100 || r.y + r.h < -100
              : r.x + r.w < -100 || r.x - r.w > vw + 100;

            if (off) {
              rectangles.splice(i, 1);
              continue;
            }
          }

          // resolve collisions (unchanged logic)
          for (let i = 0; i < rectangles.length; i++) {
            const r1 = rectangles[i];
            for (let j = i + 1; j < rectangles.length; j++) {
              const r2 = rectangles[j];
              if (r1.overlaps(r2)) r1.resolveCollision(r2);
            }
          }
        }

        function burstRectangles(p: any, cx: number, cy: number) {
          for (let k = 0; k < 8; k++) {
            const angle = (p.TWO_PI / 8) * k;
            const speed = p.random(2, 4);
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;
            projectiles.push(new RectangleProjectile(p, cx, cy, vx, vy, '#c896ff'));
          }
          if (projectiles.length > MAX_PROJECTILES) projectiles.splice(0, projectiles.length - MAX_PROJECTILES);
        }

        function spawnOctagons(p: any, now: number) {
          if (!allowSpawnsRef.current) return;
          if (!canSpawn()) return;
          if (now - lastOctagonSpawnTime > 2000) {
            if (octagons.length === 0) octagons.push(new Shape(p, true, true, verticalMode, GOLD_COLORS));
            lastOctagonSpawnTime = now;
          }
        }

        function updateOctagons(p: any, delta: number, vw: number, vh: number) {
          const buffer = 150;

          for (let i = octagons.length - 1; i >= 0; i--) {
            const o = octagons[i];
            o.update(delta);
            o.display(p);

            if (circle.overlaps(o)) {
              if (!demoRef.current) {
                coins += 20;
                coinsChangeRef.current?.(coins);
              }
              for (let j = 0; j < 10; j++) {
                particles.push(new Particle(p, o.x + o.size / 2, o.y + o.size / 2, 255, o.c, 0, 0, 5));
              }
              if (particles.length > MAX_PARTICLES) particles.splice(0, particles.length - MAX_PARTICLES);
              octagons.splice(i, 1);
              continue;
            }

            const speed = Math.abs(o.vx) + Math.abs(o.vy);
            let numParticles: number;
            if (speed < 1) numParticles = 0.05;
            else if (speed < 3) numParticles = 0.1;
            else if (speed < 6) numParticles = 0.2;
            else numParticles = 0.3;

            const whole = Math.floor(numParticles);
            const frac = numParticles - whole;

            for (let j = 0; j < whole; j++) particles.push(new Particle(p, o.x + o.size / 2, o.y + o.size / 2, 255, o.c));
            if (p.random() < frac) particles.push(new Particle(p, o.x + o.size / 2, o.y + o.size / 2, 255, o.c));
            if (particles.length > MAX_PARTICLES) particles.splice(0, particles.length - MAX_PARTICLES);

            if (
              o.x + o.size < -buffer ||
              o.x - o.size > vw + buffer ||
              o.y + o.size < -buffer ||
              o.y - o.size > vh + buffer
            ) {
              octagons.splice(i, 1);
            }
          }
        }

        // ---------------- Keyboard ----------------
        p.keyPressed = () => {
          if (demoRef.current || overlayRef.current) return;
          if (p.key === ' ' || p.key === 'Spacebar') {
            const now = p.millis();
            if (now - lastFiredTime >= cooldownDuration) {
              lastFiredTime = now;
              if (circle) {
                const vx = (circle.vx !== 0 || circle.vy !== 0) ? circle.vx : 5;
                const vy = (circle.vy !== 0 || circle.vx !== 0) ? circle.vy : 0;
                projectiles.push(new Projectile(p, circle.x, circle.y, vx, vy));
                if (projectiles.length > MAX_PROJECTILES) projectiles.splice(0, projectiles.length - MAX_PROJECTILES);
              }
            }
          }
          if (p.key === 'w' || p.keyCode === p.UP_ARROW)    movingUp = true;
          if (p.key === 's' || p.keyCode === p.DOWN_ARROW)  movingDown = true;
          if (p.key === 'a' || p.keyCode === p.LEFT_ARROW)  movingLeft = true;
          if (p.key === 'd' || p.keyCode === p.RIGHT_ARROW) movingRight = true;
        };

        p.keyReleased = () => {
          if (demoRef.current || overlayRef.current) return;
          if (p.key === 'w' || p.keyCode === p.UP_ARROW)    movingUp = false;
          if (p.key === 's' || p.keyCode === p.DOWN_ARROW)  movingDown = false;
          if (p.key === 'a' || p.keyCode === p.LEFT_ARROW)  movingLeft = false;
          if (p.key === 'd' || p.keyCode === p.RIGHT_ARROW) movingRight = false;
        };

        // ---------------- Classes ----------------
        class Circle {
          p:any;x:number;y:number;vx:number;vy:number;ax:number;ay:number;radius:number;c:any;trail:{x:number;y:number}[];
          constructor(p:any,x:number,y:number,r:number){
            this.p=p;this.x=x;this.y=y;this.vx=0;this.vy=0;this.ax=0;this.ay=0;this.radius=r;this.c=p.color(200,150,255);this.trail=[];
          }
          update(delta:number, vw:number, vh:number){
            this.vx+=this.ax*delta;this.vy+=this.ay*delta;
            // damping
            const damp = Math.pow(0.92,delta);
            this.vx*=damp;this.vy*=damp;
            this.x+=this.vx*delta;this.y+=this.vy*delta;

            // wrap
            if(this.y+this.radius<0)this.y=vh+this.radius;else if(this.y-this.radius>vh)this.y=-this.radius;
            if(this.x+this.radius<0)this.x=vw+this.radius;else if(this.x-this.radius>vw)this.x=-this.radius;

            // cheap trail (no p.createVector allocs)
            this.trail.push({x:this.x,y:this.y});
            if(this.trail.length>8)this.trail.shift();

            // clamp
            const lim=10;
            if(this.vx<-lim)this.vx=-lim; else if(this.vx>lim)this.vx=lim;
            if(this.vy<-lim)this.vy=-lim; else if(this.vy>lim)this.vy=lim;
          }
          display(pAny:any){
            const n=this.trail.length;
            for(let i=0;i<n;i++){
              const pos=this.trail[i];
              const a=pAny.map(i,0,n-1,30,100);
              const r=pAny.map(i,0,n-1,this.radius/2,this.radius);
              pAny.fill(200,150,255,a);pAny.noStroke();pAny.ellipse(pos.x,pos.y,r,r);
            }
            pAny.fill(this.c);pAny.noStroke();pAny.ellipse(this.x,this.y,this.radius,this.radius);
          }
          moveUp(){this.ay=-0.5;}moveDown(){this.ay=0.5;}moveLeft(){this.ax=-0.5;}moveRight(){this.ax=0.5;}stopVertical(){this.ay=0;}stopHorizontal(){this.ax=0;}
          overlaps(other:any){
            if(other.isOctagon){
              const dx=this.x-(other.x+other.size/2);
              const dy=this.y-(other.y+other.size/2);
              const sumR=this.radius+other.size/2;
              return dx*dx+dy*dy < sumR*sumR;
            }
            const cx = Math.max(other.x, Math.min(this.x, other.x+other.w));
            const cy = Math.max(other.y, Math.min(this.y, other.y+other.h));
            const dx = this.x-cx, dy=this.y-cy;
            const r = this.radius*0.3; // unchanged gameplay fudge
            return dx*dx+dy*dy < r*r;
          }
        }

        class Shape {
          p:any;isOctagon:boolean;verticalMode:boolean;x=0;y=0;vx=0;vy=0;w=0;h=0;size=0;c:any;rotation=0;rotationSpeed=0;
          private GOLD:any[];
          constructor(p:any,startOff:boolean,isOct:boolean,vertical:boolean, GOLD:any[]){this.p=p;this.isOctagon=isOct;this.verticalMode=vertical;this.GOLD=GOLD;this.reset(startOff);}
          reset(startOff:boolean){
            const ww = window.innerWidth;
            const wh = window.innerHeight;
            if(this.verticalMode){
              this.x=this.p.random(this.p.width);
              if(this.isOctagon){
                this.y=startOff?-this.p.random(30,60):this.p.random(this.p.height);this.vx=this.p.random(-1.2,1.2);
                if(this.p.random()<0.1)this.vy=this.p.random(6,9);else if(this.p.random()<0.2)this.vy=this.p.random(0.5,1.5);else this.vy=this.p.random(2,5);
                this.size=25;this.c=this.p.random(this.GOLD);
              } else {
                this.y=startOff?-this.p.random(60,120):this.p.random(this.p.height);this.vx=this.p.random(-0.5,0.5);this.vy=this.p.random(1,3);
                this.w=this.p.random(28,70);this.h=this.p.random(28,70);this.c=this.p.color(235,235,255);
              }
            } else {
              this.x=startOff?this.p.width+this.p.random(10,40):this.p.random(this.p.width);this.y=this.p.random(this.p.height);
              if(this.isOctagon){
                let baseX=this.p.random(-2.5,-0.5);if(ww>=1025&&ww>wh)baseX*=4.5;
                if(this.p.random()<0.1)baseX*=2;else if(this.p.random()<0.2)baseX*=0.5;this.vx=baseX;this.vy=this.p.random(-0.3,0.3);this.size=25;
                this.c=this.p.random(this.GOLD);
              } else {
                this.vx=this.p.random(-3,-1);this.vy=this.p.random(-0.5,0.5);
                if(ww>=1025&&ww>wh){this.w=this.p.random(33,105);this.h=this.p.random(33,105);}
                else{this.w=this.p.random(30,75);this.h=this.p.random(30,75);}this.c=this.p.color(235,235,255);
              }
            }
            this.rotation=0;this.rotationSpeed=this.p.random(-1,1);
          }
          update(delta:number){this.x+=this.vx*delta;this.y+=this.vy*delta;this.rotation+=this.rotationSpeed*delta;}
          display(pAny:any){
            pAny.push();
            pAny.translate(this.x+(this.isOctagon?this.size/2:this.w/2),this.y+(this.isOctagon?this.size/2:this.h/2));
            pAny.rotate(pAny.radians(this.rotation));pAny.fill(this.c);pAny.noStroke();
            if(this.isOctagon)this.drawOctagon(pAny,0,0,this.size);else{pAny.rectMode(pAny.CENTER);pAny.rect(0,0,this.w,this.h);}
            pAny.pop();
          }
          drawOctagon(pAny:any,x:number,y:number,size:number){
            const step=pAny.TWO_PI/8;pAny.beginShape();
            for(let i=0;i<8;i++){const ang=i*step;const px=x+Math.cos(ang)*size/2;const py=y+Math.sin(ang)*size/2;pAny.vertex(px,py);}
            pAny.endShape(pAny.CLOSE);
          }
          overlaps(o:any){
            const w1=this.isOctagon?this.size:this.w;const h1=this.isOctagon?this.size:this.h;const w2=o.isOctagon?o.size:o.w;const h2=o.isOctagon?o.size:o.h;
            return !(this.x+w1<o.x||this.x>o.x+w2||this.y+h1<o.y||this.y>o.y+h2);
          }
          resolveCollision(other:any){
            const w1=this.isOctagon?this.size:this.w;const h1=this.isOctagon?this.size:this.h;const w2=other.isOctagon?other.size:other.w;const h2=other.isOctagon?other.size:other.h;
            const overlapX=Math.min(this.x+w1,other.x+w2)-Math.max(this.x,other.x);const overlapY=Math.min(this.y+h1,other.y+h2)-Math.max(this.y,other.y);
            if(overlapX<overlapY){
              if(this.x<other.x){this.x-=overlapX/2;other.x+=overlapX/2;}else{this.x+=overlapX/2;other.x-=overlapX/2;}this.vx*=-1;other.vx*=-1;
            } else {
              if(this.y<other.y){this.y-=overlapY/2;other.y+=overlapY/2;}else{this.y+=overlapY/2;other.y-=overlapY/2;}this.vy*=-1;other.vy*=-1;
            }
          }
        }

        class Particle {
          p:any;x:number;y:number;vx:number;vy:number;lifespan:number;c:any;
          constructor(p:any,x:number,y:number,lifespan=255,c=p.color(255,215,0),srcVx=0,srcVy=0,mul:number|null=null){
            this.p=p;this.x=x;this.y=y;this.lifespan=lifespan;this.c=c;
            const srcSpeed=Math.hypot(srcVx,srcVy);
            let speed=p.map(srcSpeed,0,5,1,3);speed=p.constrain(speed,1.2,3.5);if(mul!=null)speed*=mul;
            const ang=p.random(0,p.TWO_PI);this.vx=Math.cos(ang)*speed+srcVx*0.1;this.vy=Math.sin(ang)*speed+srcVy*0.1;
          }
          update(delta:number){this.x+=this.vx*delta;this.y+=this.vy*delta;this.lifespan-=1*delta;}
          display(pAny:any){pAny.noStroke();pAny.fill(this.c.levels[0],this.c.levels[1],this.c.levels[2],this.lifespan);pAny.ellipse(this.x,this.y,4,4);}
          isDead(){return this.lifespan<=0;}
        }

        class Projectile {
          p:any;x:number;y:number;vx:number;vy:number;ux:number;uy:number;radius:number;lifespan:number;trail:{x:number;y:number;alpha:number}[];color:any;
          minSpeed=0.6;maxSpeed=12;speed=this.minSpeed;targetSpeed=8;acceleration=3;
          constructor(p:any,x:number,y:number,vx:number,vy:number){
            this.p=p;this.x=x;this.y=y;
            const mag=Math.hypot(vx,vy)||1;
            this.ux=vx/mag;this.uy=vy/mag;
            this.vx=this.ux*this.speed;this.vy=this.uy*this.speed;this.radius=6;this.lifespan=500;this.trail=[];this.color=p.color(200,150,255);
          }
          update(delta:number){
            // accelerate speed toward target, direction unchanged
            this.speed+=(this.targetSpeed-this.speed)*this.acceleration*delta;
            if(this.speed<this.minSpeed)this.speed=this.minSpeed;if(this.speed>this.maxSpeed)this.speed=this.maxSpeed;
            this.vx=this.ux*this.speed;this.vy=this.uy*this.speed;
            this.x+=this.vx*delta;this.y+=this.vy*delta;this.lifespan-=1*delta;
            this.trail.push({x:this.x,y:this.y,alpha:160});if(this.trail.length>20)this.trail.shift();
            for(let i=0;i<this.trail.length;i++)this.trail[i].alpha*=0.8;
          }
          display(pAny:any){
            for(let i=0;i<this.trail.length;i++){const t=this.trail[i];pAny.fill(200,150,255,t.alpha);pAny.noStroke();pAny.ellipse(t.x,t.y,this.radius*2,this.radius*2);}
            pAny.fill(this.color);pAny.noStroke();pAny.ellipse(this.x,this.y,this.radius*2,this.radius*2);
          }
          isDead(vw:number,vh:number){return this.lifespan<=0||this.x<0||this.x>vw||this.y<0||this.y>vh;}
        }

        class RectangleProjectile {
          p:any;x:number;y:number;vx:number;vy:number;size:number;lifespan:number;maxLifespan:number;color:any;rotation:number;rotationSpeed:number;
          constructor(p:any,x:number,y:number,vx:number,vy:number,color:string){
            this.p=p;this.x=x;this.y=y;this.size=p.random(8,20);const factor=this.p.map(this.size,8,20,1,2);this.vx=vx*factor;this.vy=vy*factor;
            this.lifespan=80;this.maxLifespan=this.lifespan;this.color=p.color(color);this.rotation=p.random(360);this.rotationSpeed=p.random(-20,20);
          }
          update(delta:number){this.x+=this.vx*delta;this.y+=this.vy*delta;this.lifespan-=1*delta;this.rotation+=this.rotationSpeed*delta;}
          display(pAny:any){
            pAny.push();pAny.translate(this.x,this.y);pAny.rotate(pAny.radians(this.rotation));
            const a=pAny.map(this.lifespan,0,this.maxLifespan,0,255);pAny.fill(this.color.levels[0],this.color.levels[1],this.color.levels[2],a);
            pAny.noStroke();pAny.rectMode(pAny.CENTER);pAny.rect(0,0,this.size,this.size);pAny.pop();
          }
          isDead(vw:number,vh:number){return this.lifespan<=0||this.x<-50||this.x>vw+50||this.y<-50||this.y>vh+50;}
        }
      }; // end sketch

      // ----- mount / resize / cleanup -----
      requestAnimationFrame(() => {
        if (!alive || !el.isConnected) return;

        if (q5Ref.current) {
          try { q5Ref.current.remove?.(); } catch {}
          q5Ref.current = null;
        }
        let instance: any;
        try { instance = new q5(sketch, el); }
        catch (err) { console.error('[GameCanvas] q5 init error', err); return; }
        q5Ref.current = instance;

        if (pauseHiddenRef.current && 'IntersectionObserver' in window) {
          io = new IntersectionObserver(([entry]) => {
            visibleRef.current = entry.isIntersecting;
            try {
              if (entry.isIntersecting) q5Ref.current?.loop?.();
              else q5Ref.current?.noLoop?.();
            } catch {}
          }, { threshold: 0.01 });
          io.observe(el);
        }

        let ro: ResizeObserver | null = null;
        const vv: VisualViewport | undefined = (window as any).visualViewport;
        let lastW = 0, lastH = 0;

        const resizeToHost = () => {
          const host = hostRef.current;
          const inst = q5Ref.current;
          if (!host || !host.isConnected || !inst?.resizeCanvas) return;
          const w = Math.max(1, Math.round(host.offsetWidth));
          const h = Math.max(1, Math.round(host.offsetHeight));
          if (w === lastW && h === lastH) return;
          lastW = w; lastH = h;
          try { inst.resizeCanvas(w, h); } catch (e) { console.warn('[GameCanvas] resize skipped', e); }
        };

        onResize = () => requestAnimationFrame(resizeToHost);
        window.addEventListener('resize', onResize);

        if ('ResizeObserver' in window) {
          ro = new ResizeObserver(() => requestAnimationFrame(resizeToHost));
          ro.observe(el);
        }

        window.addEventListener('orientationchange', onResize);
        vv?.addEventListener('resize', onResize);
        vv?.addEventListener('scroll', onResize);

        const onFs = () => requestAnimationFrame(resizeToHost);
        document.addEventListener('fullscreenchange', onFs);

        requestAnimationFrame(resizeToHost);

        cleanupRef.current = () => {
          const instAny = q5Ref.current as any;
          if (instAny && typeof instAny._pointerCleanup === 'function') {
            try { instAny._pointerCleanup(); } catch {}
          }
          if (io) io.disconnect();
          if (onResize) window.removeEventListener('resize', onResize);
          document.removeEventListener('fullscreenchange', onFs);
          ro?.disconnect();
          vv?.removeEventListener('resize', onResize);
          vv?.removeEventListener('scroll', onResize);
          if (q5Ref.current?.remove) q5Ref.current.remove();
          q5Ref.current = null;
          el.replaceChildren();
        };
      });
    });

    return () => {
      alive = false;
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, []); // run once

  return <div className="evade-the-rock" ref={hostRef} style={{ width: '100vw', height: '100dvh' }} />;
}
