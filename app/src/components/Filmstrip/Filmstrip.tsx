import { useCallback, useRef, useState } from "react";
import type { FilmstripProps } from "../../types";
import "./Filmstrip.css";

const HOVER_DEBOUNCE_MS = 60;

// Sprocket holes rendered as a repeating SVG pattern along both edges, per
// spec §3 ("sprocket holes running both edges"). Pure decoration: hidden
// from the accessibility tree.
const SPROCKET_PATTERN_ID = "filmstrip-sprocket";

function SprocketEdge({ side }: { side: "left" | "right" }) {
  return (
    <svg
      className={`filmstrip-sprockets filmstrip-sprockets--${side}`}
      aria-hidden="true"
      focusable="false"
      preserveAspectRatio="none"
      width="100%"
      height="100%"
    >
      <defs>
        <pattern
          id={`${SPROCKET_PATTERN_ID}-${side}`}
          patternUnits="userSpaceOnUse"
          width="18"
          height="18"
        >
          <rect x="5" y="4" width="8" height="10" rx="2" fill="var(--rule)" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${SPROCKET_PATTERN_ID}-${side})`} />
    </svg>
  );
}

export default function Filmstrip({ category, frames, onHoverStart, onOpen }: FilmstripProps) {
  const [active, setActive] = useState(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const hasFrames = frames.length > 0;
  // 3-4 frames per spec §3; if more are supplied, only show the first 4.
  const shown = hasFrames ? frames.slice(0, 4) : [null, null, null];

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
      <div className="filmstrip-strip">
        <SprocketEdge side="left" />
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
        <SprocketEdge side="right" />
      </div>
      <div className="filmstrip-label mono">{category.label}</div>
    </div>
  );
}
