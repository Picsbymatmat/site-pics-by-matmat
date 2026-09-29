import { useCallback, useRef, useState } from "react";
import { useMediaQuery, MOBILE_QUERY } from "../../lib/useMediaQuery";
import { useStageUnit } from "../../lib/useStageUnit";
import type { FilmstripProps } from "../../types";
import "./Filmstrip.css";

const HOVER_DEBOUNCE_MS = 60;

// Sprocket holes rendered as a repeating SVG pattern along both edges, per
// spec §3 ("sprocket holes running both edges") and §14 Agent A's append:
// "the same vertical phase on left and right, mirrored rather than
// offset... Drive both edges from one pattern definition so they cannot
// drift." Previously each SprocketEdge instance defined its own <pattern>
// with an id keyed only by side (`${id}-left` / `${id}-right`) — content
// was identical, but two independent definitions is exactly the drift risk
// called out: nothing stops them from being edited out of step later. Now
// there is exactly one <pattern>, defined once per Filmstrip instance
// (keyed by category.key so multiple Filmstrips on one page — all four
// landing strips — don't collide on id), and both edges' <rect>s reference
// it by the same url(#...), so left and right are structurally incapable
// of drifting apart.
// `scale` sizes the holes with the strip on desktop (the pattern is drawn
// in px, so it wouldn't follow the CSS --u scaling on its own).
function SprocketPatternDef({ patternId, scale }: { patternId: string; scale: number }) {
  return (
    <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: "absolute" }}>
      <defs>
        <pattern
          id={patternId}
          patternUnits="userSpaceOnUse"
          width="18"
          height="18"
          patternTransform={`scale(${scale})`}
        >
          <rect x="5" y="4" width="8" height="10" rx="2" fill="var(--rule)" />
        </pattern>
      </defs>
    </svg>
  );
}

function SprocketEdge({ side, patternId }: { side: "left" | "right"; patternId: string }) {
  return (
    <svg
      className={`filmstrip-sprockets filmstrip-sprockets--${side}`}
      aria-hidden="true"
      focusable="false"
      preserveAspectRatio="none"
      width="100%"
      height="100%"
    >
      <rect width="100%" height="100%" fill={`url(#${patternId})`} />
    </svg>
  );
}

export default function Filmstrip({ category, frames, onHoverStart, onOpen }: FilmstripProps) {
  const [active, setActive] = useState(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const { u } = useStageUnit();

  const clearHoverTimer = useCallback(() => {
    if (hoverTimer.current !== null) {
      clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
  }, []);

  const commitHover = useCallback(() => {
    setActive(true);
    onHoverStart(category.key);
  }, [category.key, onHoverStart]);

  const handlePointerEnter = useCallback(() => {
    clearHoverTimer();
    hoverTimer.current = setTimeout(() => {
      hoverTimer.current = null;
      commitHover();
    }, HOVER_DEBOUNCE_MS);
  }, [clearHoverTimer, commitHover]);

  const handlePointerLeave = useCallback(() => {
    clearHoverTimer();
    setActive(false);
  }, [clearHoverTimer]);

  // Keyboard focus is treated as the hover-equivalent: it commits
  // immediately, no debounce, since there is no sustained-pointer signal
  // to debounce against.
  const handleFocus = useCallback(() => {
    clearHoverTimer();
    commitHover();
  }, [clearHoverTimer, commitHover]);

  const handleBlur = useCallback(() => {
    clearHoverTimer();
    setActive(false);
  }, [clearHoverTimer]);

  const handleActivate = useCallback(() => {
    onOpen(category.key);
  }, [category.key, onOpen]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleActivate();
      }
    },
    [handleActivate],
  );

  // 3-4 frames per spec §3; if more are supplied, only show the first 4.
  // Slots come from the category's filmstrip/ folder (§12) — a null entry
  // means fewer photos are uploaded there than slots, rendered as its own
  // placeholder block rather than borrowing another slot's photo.
  const shown = frames.slice(0, 4);
  const patternId = `filmstrip-sprocket-${category.key}`;

  return (
    <div
      className={`filmstrip${active ? " filmstrip--active" : ""}`}
      role="button"
      tabIndex={0}
      aria-label={category.label}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onClick={handleActivate}
      onKeyDown={handleKeyDown}
    >
      <SprocketPatternDef patternId={patternId} scale={isMobile ? 1 : u} />
      <div className="filmstrip-strip">
        <SprocketEdge side="left" patternId={patternId} />
        <div className="filmstrip-frames">
          {shown.map((frame, i) =>
            frame ? (
              <div className="filmstrip-frame" key={frame.src + i}>
                <img src={frame.src} alt={frame.alt} width={frame.w} height={frame.h} loading="lazy" />
              </div>
            ) : (
              <div className="filmstrip-frame filmstrip-frame--placeholder" key={`placeholder-${i}`} aria-hidden="true" />
            ),
          )}
        </div>
        <SprocketEdge side="right" patternId={patternId} />
      </div>
      <div className="filmstrip-label mono">{category.label}</div>
    </div>
  );
}
