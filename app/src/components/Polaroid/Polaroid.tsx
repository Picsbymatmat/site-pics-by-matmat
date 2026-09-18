import { useEffect, useRef, useState } from "react";
import type { PolaroidProps } from "../../types";
import "./Polaroid.css";

// No token exists for the pause between the rise finishing and the develop
// starting (only the rise and develop durations themselves are tokenized).
// Spec §6: "a short delay first so the blank white reads" — this is that
// pause, kept short and deliberate.
const DEVELOP_START_DELAY_MS = 300;

/** Reads a --dur-* CSS custom property in ms, falling back if unset. */
function readDurationMs(varName: string, fallback: number): number {
  if (typeof window === "undefined") return fallback;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  if (!raw) return fallback;
  const parsed = parseFloat(raw);
  return raw.endsWith("s") && !raw.endsWith("ms") ? parsed * 1000 : parsed;
}

export default function Polaroid({ category, hero, reducedMotion }: PolaroidProps) {
  // risen: frame has completed (or, under reduced motion, skipped) its rise.
  // developed: image/tint has completed (or skipped) its develop.
  const [risen, setRisen] = useState(reducedMotion);
  const [developed, setDeveloped] = useState(reducedMotion);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];

    if (reducedMotion) {
      // Spec §6 reduced motion: "The Polaroid appears already developed."
      setRisen(true);
      setDeveloped(true);
      return;
    }

    // Start from the un-risen, undeveloped state, then advance on the next
    // frame so the CSS transition actually runs instead of snapping in.
    setRisen(false);
    setDeveloped(false);

    const riseMs = readDurationMs("--dur-polaroid-rise", 450);

    const raf = requestAnimationFrame(() => setRisen(true));
    const developTimer = setTimeout(() => {
      setDeveloped(true);
    }, riseMs + DEVELOP_START_DELAY_MS);

    timers.current.push(developTimer);

    return () => {
      cancelAnimationFrame(raf);
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
  }, [reducedMotion, hero, category.key]);

  const developMsForStyle = readDurationMs("--dur-polaroid-develop", 2400);

  return (
    <figure
      className={[
        "polaroid",
        risen ? "polaroid--risen" : "",
        reducedMotion ? "polaroid--no-motion" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="polaroid__frame">
        <div className="polaroid__image-area">
          {/* Every Polaroid develops from full flat grey, real hero photo
             or not — a real photo is hidden behind that grey the same way
             the generic placeholder is, rather than being visible in a
             desaturated state from the start. */}
          <div className="polaroid__develop">
            <img
              className={`polaroid__photo${developed ? " polaroid__photo--developed" : ""}`}
              src={hero ? hero.src : "/images/placeholder/polaroid/develop.png"}
              alt={hero ? hero.alt : ""}
              aria-hidden={hero ? undefined : true}
              width={hero?.w}
              height={hero?.h}
              style={
                reducedMotion
                  ? undefined
                  : { transitionDuration: `${developMsForStyle}ms` }
              }
            />
            <div
              className={`polaroid__tint${developed ? " polaroid__tint--developed" : ""}`}
              style={
                reducedMotion
                  ? undefined
                  : { transitionDuration: `${developMsForStyle}ms` }
              }
              aria-hidden="true"
            />
          </div>
          <div className="grain-overlay" />
        </div>
        <figcaption className="polaroid__margin">
          <div className="polaroid__margin-inner">
            <img
              className="polaroid__signature"
              src="/images/placeholder/polaroid/signature.png"
              alt="Signature"
            />
          </div>
        </figcaption>
      </div>
    </figure>
  );
}
