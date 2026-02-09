// src/dynamic-app/components/fireworksDisplay.jsx
import React, { useRef, useEffect, useState, useCallback } from 'react';
import q5 from 'q5';
import { useRealMobileViewport } from '../../behaviors/useRealMobile.ts';

const FireworksDisplay = ({ colorMapping = {}, items = [], lastKnownColor, onToggleFireworks }) => {
  const canvasRef = useRef(null);
  const [fireworksEnabled, setFireworksEnabled] = useState(true);
  const fireworksRef = useRef([]);
  const fireworksEnabledRef = useRef(true);

  const isPageHiddenRef = useRef(false);
  const hiddenStartTimeRef = useRef(0);
  const hiddenDurationRef = useRef(0);

  const isRealMobile = useRealMobileViewport();
  const isRealMobileRef = useRef(isRealMobile);

  useEffect(() => {
    isRealMobileRef.current = isRealMobile;
  }, [isRealMobile]);

  // Documént visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        isPageHiddenRef.current = true;
        hiddenStartTimeRef.current = performance.now();
      } else if (document.visibilityState === 'visible') {
        isPageHiddenRef.current = false;
        const now = performance.now();
        hiddenDurationRef.current += now - hiddenStartTimeRef.current;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Function to adjust brightness of a hex color
  function adjustBrightness(hex, multiplier) {
    // Convert hex to RGB
    let r = parseInt(hex.slice(1, 3), 16);
    let g = parseInt(hex.slice(3, 5), 16);
    let b = parseInt(hex.slice(5, 7), 16);

    // Apply brightness multiplier
    r = Math.min(255, Math.max(0, Math.floor(r * multiplier)));
    g = Math.min(255, Math.max(0, Math.floor(g * multiplier)));
    b = Math.min(255, Math.max(0, Math.floor(b * multiplier)));

    // Convert back to hex and return
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

    const p5InstanceRef = useRef(null); // Track single p5 instance
    const latestItems = useRef(items);
    const latestColorMapping = useRef(colorMapping);
    const latestLastKnownColor = useRef(lastKnownColor);

  useEffect(() => {
    latestItems.current = items;
    latestColorMapping.current = colorMapping;
    latestLastKnownColor.current = lastKnownColor;
    }, [items, colorMapping, lastKnownColor]);

  useEffect(() => {
    let destroyed = false;

    if (!canvasRef.current || p5InstanceRef.current || destroyed) return;


      const sketch = (p) => {
        let fireworks = fireworksRef.current;
        let lastFireworkTime = -8000;
        let lastLaunchPosition = p.createVector(p.width / 2, p.height);
        const minDistance = 1000;

        class Particle {
          constructor(x, y, c, firework, size, type, hasTrail = false) {
            this.pos = p.createVector(x, y);
            this.vel = firework
              ? p.createVector(0, p.random(-10, -20)) // Firework launch velocity
              : p.createVector(p.random(-1, 1), p.random(-1, 1)).mult(p.random(0, 18)); // Explosion velocity
            this.acc = p.createVector(0, 0);
          
            // Adjust brightness based on firework type and size
            this.col = this.adjustBrightness(
              c,
              size > 10
                ? p.random(1.4, 2) // Larger particles
                : size > 5
                ? p.random(1.1, 1.3) // Mid-size particles
                : p.random(0.7, 1.1) // Smaller particles
            );
          
            this.firework = firework;
            this.size = size;
            this.type = type;
            this.hasTrail = hasTrail;
          
            this.shapeType = p.random(['circle', 'square', 'triangle']); // Add random shape selection
          
            // Randomize lifespan based on size (larger particles live longer)
            let minLifespan, maxLifespan;

            if (p.windowWidth < 768) {
              minLifespan = p.random(30, 60);
              maxLifespan = p.random(40, 80);
            } else if (p.windowWidth <= 1024) {
              minLifespan = p.random(50, 80);
              maxLifespan = p.random(70, 100);
            } else {
              minLifespan = p.random(50, 90);
              maxLifespan = p.random(80, 140);
            }

            this.lifespan = p.map(size, 1, 12, minLifespan, maxLifespan);

          
            // Adjust trail length based on particle size
            this.trailLength = size >= 4 && size <= 12 ? 8 : 1; // Longer trail for larger particles
            this.trail = Array(this.trailLength).fill(p.createVector(x, y)); // Set trail array
          
            // Map trailLifespan to speed (higher speed -> higher alpha, lower speed -> fade out)
            const initialSpeed = this.vel.mag();
            this.trailLifespan = Array(this.trailLength).fill(p.map(initialSpeed, 0, 20, 0, 100)); // Dynamically set based on speed
          
            this.fadeFactor = p.map(size, 1, 15, 0.6, 0.5); // Smaller particles fade faster
          
            // Blinking properties (only for explosion particles)
            this.blinkingSpeed = firework ? 0 : p.random(5, 30); // Blinking speed for explosion particles
            this.blinkingAlpha = firework ? 255 : 255; // Default alpha value for explosion particles
          }           
        
          // Adjust brightness of the color
          adjustBrightness(baseColor, multiplier) {
            const r = Math.min(255, Math.max(0, baseColor.levels[0] * multiplier));
            const g = Math.min(255, Math.max(0, baseColor.levels[1] * multiplier));
            const b = Math.min(255, Math.max(0, baseColor.levels[2] * multiplier));
            return p.color(r, g, b);
          }
        
          applyForce(force) {
            this.acc.add(force);
          }
        
          update() {
            this.vel.add(this.acc);
            this.pos.add(this.vel);
            this.acc.mult(0);
        
            if (!this.firework) {
              this.vel.mult(0.927); // Slow down over time
              this.lifespan -= this.fadeFactor; // Decrease lifespan
        
              // Make sure lifespan does not go below 0
              if (this.lifespan <= 0) {
                this.lifespan = 0;
              }
      
              // Trail
              if (this.hasTrail) {
                this.trail.pop(); // Remove the oldest trail point
                this.trail.unshift(this.pos.copy()); // Add the newest trail point
                for (let i = 0; i < this.trailLifespan.length; i++) {
                  this.trailLifespan[i] -= this.fadeFactor; // Gradually fade trail points
                  this.trailLifespan[i] = Math.max(0, this.trailLifespan[i]); // Clamp lifespan to 0
                }
              }
        
              // Apply gravity based on particle size
              let gravityForce;
              if (this.size >= 1 && this.size < 2) {
                gravityForce = p.random(-0.151, -0.161); // Weaker gravity for size 1
              } else if (this.size >= 2 && this.size < 3) {
                gravityForce = p.random(-0.146, -0.156); // Gravity for size 2
              } else if (this.size >= 3 && this.size < 4) {
                gravityForce = p.random(-0.144, -0.145); // Gravity for size 3
              } else if (this.size >= 4 && this.size < 5) {
                gravityForce = p.random(-0.141, -0.143); // Gravity for size 4
              } else if (this.size >= 5 && this.size < 6) {
                gravityForce = p.random(-0.139, -0.14); // Gravity for size 5
              } else if (this.size >= 6 && this.size < 7) {
                gravityForce = p.random(-0.137, -0.138); // Gravity for size 6
              } else if (this.size >= 7 && this.size < 8) {
                gravityForce = p.random(-0.135, -0.136); // Gravity for size 7
              } else if (this.size >= 8 && this.size < 9) {
                gravityForce = p.random(-0.134, -0.136); // Gravity for size 8
              } else if (this.size <= 9) {
                gravityForce = p.random(-0.135, -0.137); // Stronger gravity for size 9
              } else if (this.size >= 10 && this.size <= 12) {
                gravityForce = p.random(-0.094, -0.137); // Stronger gravity for size 9
              }

              this.applyForce(p.createVector(0, gravityForce)); // Apply gravity
            }
        
            // Update blinking alpha for explosion particles
            if (!this.firework && this.type === 'BLINKING') {
              this.blinkingAlpha = Math.abs(255 * Math.sin((p.millis() / 1000) * this.blinkingSpeed));
            }
          }
        
          show() {
            let alpha = this.firework
              ? p.map(this.lifespan, 0, 255, 0, 255) // Normal fading for firework particles
              : this.type === 'BLINKING'
              ? this.blinkingAlpha // Blinking for explosion particles
              : p.map(this.lifespan, 0, 255, 0, 255); // Fading for explosion particles
          
            p.noStroke();
          
            // Shrinking logic for the particle
            let shrinkSize = this.size;
            if (!this.firework) {
              // Lifespan timing: calculate elapsed time (255 lifespan = full life)
              const elapsedTime = p.map(this.lifespan, 255, 0, 0, 5); // 5 seconds total lifespan
              const shrinkFactor = elapsedTime <= 2
                ? 1 // No shrinking for the first 2 seconds
                : p.map(this.lifespan, 255, 0, 1, 0); // Start shrinking after 2 seconds
          
              // Exponential shrinking towards the end
              shrinkSize = this.size * (1 - Math.pow(1 - shrinkFactor, 6)); 
            }
          
            const normalizedSize = Math.max(shrinkSize * 1.1, 1); // Clamp minimum size to 1
          
            // Calculate rotation angle based on velocity vector
            const rotationAngle = p.atan2(this.vel.y, this.vel.x); // Angle in radians
          
            // Draw trails first
            if (this.hasTrail) {
              for (let i = 0; i < this.trail.length; i++) {
                const trailAlpha = this.trailLifespan[i];
                if (trailAlpha > 0) {
                  // Use a fixed size for trail points
                  const trailSize = this.firework ? this.size * 0.9 : this.size * 0.8;
            
                  p.strokeWeight(trailSize); // Fixed trail size
                  p.stroke(
                    this.col.levels[0],
                    this.col.levels[1],
                    this.col.levels[2],
                    trailAlpha
                  );
                  p.point(this.trail[i].x, this.trail[i].y);
                }
              }
            }
          
            // Draw the main particle shape
            p.push();
            p.translate(this.pos.x, this.pos.y); // Move to particle position
            p.rotate(rotationAngle); // Rotate based on velocity direction
          
            // Apply speed-based rotation scaling (optional)
            const rotationSpeed = this.vel.mag() * 0.01; // Scale speed to adjust rotation dynamics
            p.rotate(p.frameCount * rotationSpeed);
          
            p.fill(this.col.levels[0], this.col.levels[1], this.col.levels[2], alpha);
          
            // Draw shape based on shapeType
            if (this.shapeType === 'circle') {
              p.ellipse(0, 0, normalizedSize, normalizedSize);
            } else if (this.shapeType === 'square') {
              const halfSize = normalizedSize / 2;
              p.rect(-halfSize, -halfSize, normalizedSize, normalizedSize);
            } else if (this.shapeType === 'triangle') {
              const halfSize = normalizedSize / 2;
              p.triangle(
                0, -halfSize, // Top vertex
                -halfSize, halfSize, // Bottom-left vertex
                halfSize, halfSize // Bottom-right vertex
              );
            }
          
            p.pop(); // Reset transformations
          }        
                      
          // Check if the particle is done (lifespan is 0)
          isDone() {
            return this.lifespan <= 0; // Particle is done when lifespan is depleted
          }
        }
        
        class Firework {
          constructor(x, y, targetX, targetY, col, type) {
            this.firework = new Particle(x, y, col, true, 4, type);
            this.particles = [];
            this.exploded = false;
            this.targetX = targetX;
        
            // Adjust explosion location based on screen width
            if (p.windowWidth < 768) {
              // For screens smaller than 768px, make the explosion higher on the screen
              this.targetX = p.random(p.width * 0.5, p.width * 0.9);  
              this.targetY = p.random(p.height * 0.1, p.height * 0.3);  
              } else if (p.windowWidth >= 768 && p.windowWidth <= 1024) {
              // For screens between 768px and 1024px, make the explosion in the middle
              this.targetX = p.random(p.width * 0.65, p.width * 0.9);  
              this.targetY = p.random(p.height * 0.05, p.height * 0.3);  
              } else {
              // For screens larger than 1024px, make the explosion lower on the screen
              this.targetX = p.random(p.width * 0.3, p.width * 0.7);  
              this.targetY = p.random(p.height * 0.05, p.height * 0.4);  
            }
        
            this.col = col;
            this.type = type;
            this.explosionStartTime = -1;

            // Particle amount logic
            let baseCount;
          if (p.windowWidth < 768) {
            baseCount = type === 'BLINKING'
              ? p.random(150, 275)
              : p.random(125, 225);
          } else if (p.windowWidth <= 1024) {
            baseCount = type === 'BLINKING'
              ? p.random(275, 325)
              : p.random(200, 250); // Fewer PROJECTILE particles on medium screens
          } else {
            baseCount = type === 'BLINKING'
              ? p.random(250, 300)
              : p.random(300, 350);
            }
            this.numParticles = Math.floor(baseCount);
          }
        
          explode() {
            // Capture the firework's initial velocity to influence explosion particles
            let initialVel = this.firework.vel.copy(); // Copy firework's velocity to influence explosion
            
            //limit particle count for larger ones between 25 to 50
            const largerParticleCount = this.type === 'PROJECTILE' ? Math.floor(p.random(25, 50)) : 0;

            for (let i = 0; i < this.numParticles; i++) {
              let size;
          
              // Assign size based on whether it's a larger particle or a regular one
              if (this.type === 'PROJECTILE' && i < largerParticleCount) {
                size = p.random(10, 12); // Extra large particles for PROJECTILE
              } else {
                size = this.type === 'BLINKING' ? p.random(1, 9) : p.random(1, 8); // Smaller particles
              }
          
              let speed = this.type === 'BLINKING'
              ? (() => {
                  // Inline definition for BLINKING firework speed calculation
                  let speed;
                  if (size >= 1 && size < 2) {
                    speed = p.random(0.5, 2.7);
                  } else if (size >= 2 && size < 3) {
                    speed = p.random(2.5, 4.7);
                  } else if (size >= 3 && size < 4) {
                    speed = p.random(4.5, 6.7);
                  } else if (size >= 4 && size < 5) {
                    speed = p.random(6.5, 8.7);
                  } else if (size >= 5 && size < 6) {
                    speed = p.random(8.5, 8.7);
                  } else if (size >= 6 && size < 7) {
                    speed = p.random(8.8, 9);
                  } else if (size >= 7 && size < 8) {
                    speed = p.random(9.1, 9.2);
                  } else if (size >= 8 && size < 9) {
                    speed = p.random(9.2, 9.3);
                  } else {
                    speed = p.random(9.4, 9.5);
                  }
                  return adjustForScreenWidth(speed);
                })()
              : (() => {
                  // Inline definition for PROJECTILE firework speed calculation
                  let speed;
                  if (size >= 1 && size < 7) {
                    speed = p.random(1, 9);
                  } else if (size >= 7 && size < 9) {
                    speed = p.random(8, 9);
                  } else if (size >= 10 && size < 12) {
                    speed = p.random(9, 9.2);
                  } else {
                    speed = p.random(1, 4);
                  }
                  return adjustForScreenWidth(speed);
                })();
            
            // Function to adjust speed based on screen size
            function adjustForScreenWidth(speed) {
              let screenWidth = p.windowWidth;
              let screenMultiplier = 1; // Default multiplier
            
              if (screenWidth < 768) {
                screenMultiplier = p.random(1.8, 2.6);
              } else if (screenWidth >= 768 && screenWidth <= 1024) {
                screenMultiplier = p.random(1.6, 2.2);
              } else if (screenWidth > 1024) {
                screenMultiplier = p.random(1.2, 2.2);
              } 
              return speed * screenMultiplier;
            }
          
              let angle = p.random(p.TWO_PI);
              let velocity = p.createVector(p.cos(angle), p.sin(angle)).mult(speed);
              
              // Apply a smaller influence from firework velocity if particle is in line with the projectile
              let angleDiff = Math.abs(p.atan2(velocity.y, velocity.x) - p.atan2(initialVel.y, initialVel.x));
              
              // If angle difference is small (i.e., the particle is moving along the same vector as the firework's trajectory), apply less multiplier
              let velocityMultiplier = angleDiff < p.HALF_PI / 4 ? p.random(0, 0.5) : p.random(0.5, 0.8);
              velocity.add(initialVel.mult(velocityMultiplier)); // Small influence from projectile velocity
          
              let hasTrail = size > 6; // Larger particles have trails
                  
              let type = 'BLINKING';
              let particle = new Particle(
                this.firework.pos.x + p.random(-2, 6),
                this.firework.pos.y + p.random(-2, 6),
                this.col,
                false,
                size,
                type,
                hasTrail
              );
                  
              particle.vel = velocity;
              this.particles.push(particle);
            }
            this.exploded = true;
            this.explosionStartTime = p.millis();
          }
          
          update() {
            if (!this.exploded) {
              let direction = p.createVector(this.targetX - this.firework.pos.x, this.targetY - this.firework.pos.y);
              direction.normalize();
              let launchSpeed;
                if (p.windowWidth < 768) {
                  launchSpeed = p.random(6, 11);
                } else if (p.windowWidth <= 1024) {
                  launchSpeed = p.random(5, 9); // Moderate speed boost for medium screens
                } else {
                  launchSpeed = p.random(3, 8);
                }

              direction.mult(launchSpeed);
              this.firework.vel = direction;
              this.firework.update();
              if (p.dist(this.firework.pos.x, this.firework.pos.y, this.targetX, this.targetY) < 10) {
                this.explode();
              }
            }
            for (let i = this.particles.length - 1; i >= 0; i--) {
              let particle = this.particles[i];
              particle.applyForce(p.createVector(0, 0.160));  // Apply gravity force
              particle.update();
              if (particle.isDone()) {
                this.particles.splice(i, 1);
              }
            }
          }

          show() {
            if (!this.exploded) {
              this.firework.show();
            }
            for (let particle of this.particles) {
              particle.show();
            }
          }
        }

        function addNewFirework(fireworkType) {

          const startX = p.width / 2;
          const startY = p.height;

          const selectedAlt1 = latestItems.current?.[0]?.alt1 || '';
          const colorArray = latestColorMapping.current[selectedAlt1] || [];

          // Early exit if no colors are available
          if (!colorArray.length) {
            console.warn(`No colors available for alt1: '${selectedAlt1}'`);
            return;
          }

          let topColorCount;
          if (p.windowWidth >= 1025) {
            topColorCount = 3;
          } else if (p.windowWidth >= 768) {
            topColorCount = 2;
          } else {
            topColorCount = 1;
          }

          // Safely extract just 0, 1, and 3 (skip index 2)
          const usableColors = [
            colorArray[0],
            colorArray[1],
            colorArray[3],
          ].filter(Boolean); // filter out undefined if array is incomplete
          if (usableColors.length === 0) return;

          const randomHex = usableColors[Math.floor(p.random(usableColors.length))]; // Pick one color

          const brightnessMultiplier = p.random(1, 1.4);
          const adjustedHex = adjustBrightness(randomHex, brightnessMultiplier);
          const fireworkColor = p.color(adjustedHex);

          const targetX = p.width / 2 + p.random(-50, 50);
          const targetY = fireworkType === 'BLINKING' ? p.height * 0.2 : p.height * 0.7;

          lastLaunchPosition = p.createVector(targetX, targetY);
          fireworks.push(new Firework(startX, startY, targetX, targetY, fireworkColor, fireworkType));
        }

        p.setup = () => {
          p.createCanvas(p.windowWidth, p.windowHeight);
          const firstFireworkType = Math.random() < 0.5 ? 'BLINKING' : 'PROJECTILE'; // Randomize first firework type
          addNewFirework(firstFireworkType); // Launch the first firework
          lastFireworkTime = p.millis(); // Reset lastFireworkTime after the first launch
        };      

        hiddenDurationRef.current = 0;
        lastFireworkTime = 0;
        
        let fireworkToggle = true; // Starts with BLINKING
        let nextFireworkDelay = p.random(3000, 7000); // Random delay between 2000ms and 5000ms

        p.draw = () => {
          if (isRealMobileRef.current) {
            p.clear(); // transparent
          } else {
            p.background('#1e1e1f'); // fallback
          }
            
          if (!fireworksEnabledRef.current) {
            fireworksRef.current.length = 0;
            return;
          }

          for (let firework of fireworks) {
            firework.update();
            firework.show();
          }

          const adjustedTime = p.millis() - hiddenDurationRef.current;

          // Fix: fallback in case adjustedTime went backward or got corrupted
          if (adjustedTime < lastFireworkTime) {
            console.warn("Adjusted time went backward or stale. Forcing firework reset.");
            lastFireworkTime = adjustedTime - nextFireworkDelay - 1;
          }

          // Regular triggering condition
          if (adjustedTime - lastFireworkTime > nextFireworkDelay) {
            const fireworkType = fireworkToggle ? 'BLINKING' : 'PROJECTILE';
            addNewFirework(fireworkType);
            fireworkToggle = !fireworkToggle;
            lastFireworkTime = adjustedTime;
            nextFireworkDelay = p.random(2000, 8000);
          }
        };
      };
      
    p5InstanceRef.current = new q5(sketch, canvasRef.current);

    return () => {
      destroyed = true;
      if (p5InstanceRef.current) {
        p5InstanceRef.current.remove();
        p5InstanceRef.current = null;
      }
      fireworksRef.current = [];
    };
  }, []);

  const toggleFireworks = useCallback((isEnabled) => {
    setFireworksEnabled(isEnabled);
    fireworksEnabledRef.current = isEnabled; // update live value for q5
  }, []);

  useEffect(() => {
    if (onToggleFireworks) {
      onToggleFireworks(toggleFireworks);
    }
  }, [onToggleFireworks, toggleFireworks]); // Ensure dependencies are stable  

  return <div ref={canvasRef}></div>;
};

export default FireworksDisplay;