import { useEffect, useRef, useState } from "react";

/**
 * Smooth, looping WIP progress:
 * up (0→99), pause, down (99→min), pause, repeat.
 * All timings are in milliseconds.
 */
type Config = {
  minFloor?: number; // where the backslide stops
  upDuration?: number; // time to go 0→99
  downDuration?: number; // time to go 99→minFloor
  pauseAtTop?: number;
  pauseAtBottom?: number;
};

type Phase = "up" | "pauseTop" | "down" | "pauseBottom";

export function useWipProgress(cfg: Config = {}) {
  const {
    minFloor = 68,
    upDuration = 24000,
    downDuration = 14000,
    pauseAtTop = 2200,
    pauseAtBottom = 1200,
  } = cfg;

  const [value, setValue] = useState(0);
  const [phase, setPhase] = useState<Phase>("up");

  const raf = useRef<number | null>(null);
  const t0 = useRef<number>(0);

  // Simple symmetric ease in/out
  const easeInOut = (t: number) =>
    t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

  useEffect(() => {
    const stop = () => {
      if (raf.current) cancelAnimationFrame(raf.current);
      raf.current = null;
    };

    const tick = (now: number) => {
      if (!t0.current) t0.current = now;

      if (phase === "up") {
        const p = Math.min(1, (now - t0.current) / upDuration);
        setValue(99 * easeInOut(p));
        if (p >= 1) {
          setPhase("pauseTop");
          t0.current = performance.now();
          stop();
          raf.current = requestAnimationFrame(tick);
          return;
        }
      }

      if (phase === "pauseTop") {
        if (now - t0.current >= pauseAtTop) {
          setPhase("down");
          t0.current = performance.now();
        }
      }

      if (phase === "down") {
        const p = Math.min(1, (now - t0.current) / downDuration);
        const start = 99;
        const end = minFloor;
        const eased = start + (end - start) * easeInOut(p);
        setValue(eased);
        if (p >= 1) {
          setPhase("pauseBottom");
          t0.current = performance.now();
        }
      }

      if (phase === "pauseBottom") {
        if (now - t0.current >= pauseAtBottom) {
          // restart a new cycle
          setPhase("up");
          t0.current = performance.now();
        }
      }

      raf.current = requestAnimationFrame(tick);
    };

    raf.current = requestAnimationFrame(tick);
    return () => stop();
  }, [minFloor, phase, upDuration, downDuration, pauseAtTop, pauseAtBottom]);

  return Math.max(0, Math.min(100, value));
}
