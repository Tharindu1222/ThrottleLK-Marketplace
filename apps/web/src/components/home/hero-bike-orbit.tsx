'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import gsap from 'gsap';
import { HERO_BIKES } from '@/lib/hero-bikes';

const COUNT = HERO_BIKES.length;
const STEP = (Math.PI * 2) / COUNT;
/** Focus slot = left of the circle (main bike shows clearly). */
const FOCUS = Math.PI;
const AUTOPLAY_MS = 4000;
const TWEEN_DURATION = 1.15;

function shortestAngleDelta(from: number, to: number) {
  return (
    ((((to - from) % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2)) - Math.PI
  );
}

function angularDistance(a: number, b: number) {
  return Math.abs(shortestAngleDelta(a, b));
}

function indexFromAngle(angle: number) {
  const raw = Math.round(-angle / STEP);
  return ((raw % COUNT) + COUNT) % COUNT;
}

export function HeroBikeOrbit() {
  const stageRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const shadowRef = useRef<HTMLDivElement>(null);
  const rotation = useRef({ angle: 0 });
  const tweenRef = useRef<gsap.core.Tween | null>(null);
  const autoplayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pausedRef = useRef(false);
  const reducedRef = useRef(false);
  const [active, setActive] = useState(0);
  const [ready, setReady] = useState(false);

  const layout = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const w = stage.clientWidth;
    const h = stage.clientHeight;
    // Circle on the right → top / left / bottom arc. Other bikes stay on this path.
    const cx = w * 0.82;
    const cy = h * 0.5;
    const rx = Math.min(w * 0.36, h * 0.55);
    const ry = h * 0.45;
    const base = rotation.current.angle;
    const centerX = w * 0.5;
    const centerY = h * 0.52;

    itemRefs.current.forEach((el, i) => {
      if (!el) return;
      const φ = FOCUS + base + i * STEP;
      const orbitX = cx + rx * Math.cos(φ);
      const orbitY = cy + ry * Math.sin(φ);

      const dist = angularDistance(φ, FOCUS);
      const t = 1 - dist / Math.PI;
      const focusness = Math.pow(Math.max(0, t), 1.35);
      // Only the focus bike moves to center; neighbors keep orbit positions.
      const pull = Math.max(0, (focusness - 0.75) / 0.25);
      const x = orbitX + (centerX - orbitX) * pull;
      const y = orbitY + (centerY - orbitY) * pull;

      const scale = 0.48 + 0.80 * focusness;
      const opacity =
        dist > Math.PI * 0.72 ? 0 : 0.28 + 0.72 * focusness;

      gsap.set(el, {
        x,
        y,
        xPercent: -50,
        yPercent: -50,
        scale,
        opacity,
        zIndex: Math.round(10 + focusness * 90),
        force3D: true,
      });
    });

    if (shadowRef.current) {
      gsap.set(shadowRef.current, {
        x: centerX,
        y: centerY + Math.min(w, h) * 0.03,
        xPercent: -50,
        yPercent: -50,
        opacity: 0.22,
      });
    }
  }, []);

  const clearAutoplay = useCallback(() => {
    if (autoplayRef.current) {
      clearTimeout(autoplayRef.current);
      autoplayRef.current = null;
    }
  }, []);

  const stepRef = useRef<(dir: 1 | -1) => void>(() => {});

  const scheduleAutoplay = useCallback(() => {
    clearAutoplay();
    if (reducedRef.current || pausedRef.current) return;
    autoplayRef.current = setTimeout(() => {
      stepRef.current(1);
    }, AUTOPLAY_MS);
  }, [clearAutoplay]);

  const step = useCallback(
    (dir: 1 | -1) => {
      if (reducedRef.current) return;

      const nextAngle = rotation.current.angle - dir * STEP;

      tweenRef.current?.kill();
      tweenRef.current = gsap.to(rotation.current, {
        angle: nextAngle,
        duration: TWEEN_DURATION,
        ease: 'power3.inOut',
        onUpdate: layout,
        onComplete: () => {
          setActive(indexFromAngle(rotation.current.angle));
          scheduleAutoplay();
        },
      });

      setActive(indexFromAngle(nextAngle));
    },
    [layout, scheduleAutoplay],
  );

  stepRef.current = step;

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedRef.current = mq.matches;

    const onMq = () => {
      reducedRef.current = mq.matches;
      if (mq.matches) {
        clearAutoplay();
        tweenRef.current?.kill();
        rotation.current.angle = 0;
        setActive(0);
        layout();
      } else {
        scheduleAutoplay();
      }
    };
    mq.addEventListener('change', onMq);

    layout();
    setReady(true);

    const ro = new ResizeObserver(() => layout());
    if (stageRef.current) ro.observe(stageRef.current);

    if (!mq.matches) scheduleAutoplay();

    return () => {
      mq.removeEventListener('change', onMq);
      ro.disconnect();
      clearAutoplay();
      tweenRef.current?.kill();
    };
  }, [layout, clearAutoplay, scheduleAutoplay]);

  const pause = () => {
    pausedRef.current = true;
    clearAutoplay();
  };

  const resume = () => {
    pausedRef.current = false;
    scheduleAutoplay();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      clearAutoplay();
      step(-1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      clearAutoplay();
      step(1);
    }
  };

  return (
    <div
      ref={stageRef}
      role="region"
      aria-roledescription="carousel"
      aria-label="Featured motorbikes"
      tabIndex={0}
      onKeyDown={onKeyDown}
      onMouseEnter={pause}
      onMouseLeave={resume}
      onFocus={pause}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          resume();
        }
      }}
      className={`relative h-full min-h-full w-full overflow-hidden outline-none ${
        ready ? 'opacity-100' : 'opacity-0'
      } transition-opacity duration-300`}
    >
      {/* Soft tire contact only — no drop-shadow pods */}
      <div
        ref={shadowRef}
        aria-hidden
        className="pointer-events-none absolute top-0 left-0 h-2.5 w-40 rounded-[100%] bg-black/20 blur-[3px] sm:h-3 sm:w-52"
      />

      {HERO_BIKES.map((bike, i) => (
        <div
          key={bike.src}
          ref={(el) => {
            itemRefs.current[i] = el;
          }}
          className="pointer-events-none absolute top-0 left-50 bg-transparent will-change-transform"
          style={{ width: 'min(50vw, 520px)' }}
          aria-hidden={i !== active}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={bike.src}
            alt={bike.alt}
            draggable={false}
            className="h-auto w-full bg-transparent select-none object-contain"
            style={{ filter: 'none', boxShadow: 'none' }}
          />
        </div>
      ))}

      <div className="absolute right-3 bottom-4 z-[130] flex gap-2 sm:right-5 sm:bottom-5">
        <button
          type="button"
          aria-label="Previous bike"
          onClick={() => {
            clearAutoplay();
            step(-1);
          }}
          className="flex h-9 w-9 items-center justify-center border border-black/20 bg-white/90 text-lg text-black/70 transition hover:border-accent hover:text-accent"
        >
          ‹
        </button>
        <button
          type="button"
          aria-label="Next bike"
          onClick={() => {
            clearAutoplay();
            step(1);
          }}
          className="flex h-9 w-9 items-center justify-center border border-black/20 bg-white/90 text-lg text-black/70 transition hover:border-accent hover:text-accent"
        >
          ›
        </button>
      </div>

      <span className="sr-only" aria-live="polite">
        Bike {active + 1} of {COUNT}
      </span>
    </div>
  );
}
