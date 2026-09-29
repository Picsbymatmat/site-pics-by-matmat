import { useEffect, useState } from "react";

// The desktop layout is designed at this viewport size (the client's
// laptop, measured). Must match --u in tokens.css.
export const STAGE_WIDTH = 1440;
export const STAGE_HEIGHT = 812;

function measure() {
  if (typeof window === "undefined") return { u: 1, width: STAGE_WIDTH };
  const u = Math.min(window.innerWidth / STAGE_WIDTH, window.innerHeight / STAGE_HEIGHT);
  return { u, width: window.innerWidth };
}

/** JS mirror of the CSS --u unit: 1 at the design viewport, scaling with
 *  whichever of width/height is tighter. For layout math CSS can't do
 *  (parallax distances, frame counts, SVG pattern sizes). */
export function useStageUnit(): { u: number; width: number } {
  const [stage, setStage] = useState(measure);

  useEffect(() => {
    const handler = () => setStage(measure());
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  return stage;
}
