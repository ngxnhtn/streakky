import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "@streakky/ui/lib/motion";

/** Eases a number toward its target (ease-out); jumps straight there under reduced motion. */
export function useTween(target: number, ms = 900): number {
  const [value, setValue] = useState(() => (prefersReducedMotion() ? target : 0));
  const shown = useRef(value);
  useEffect(() => {
    if (prefersReducedMotion()) {
      shown.current = target;
      setValue(target);
      return;
    }
    const from = shown.current;
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / ms);
      const v = from + (target - from) * (1 - (1 - k) ** 4);
      shown.current = v;
      setValue(v);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return value;
}
