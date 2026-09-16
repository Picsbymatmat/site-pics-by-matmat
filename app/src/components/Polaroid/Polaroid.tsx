import { useEffect, useRef, useState } from "react";
import type { PolaroidProps } from "../../types";
import content from "../../data/content.json";
import "./Polaroid.css";

// No token exists for the pause between the rise finishing and the develop
// starting (only the rise and develop durations themselves are tokenized).
// Spec §6: "a short delay first so the blank white reads" — this is that
// pause, kept short and deliberate.
const DEVELOP_START_DELAY_MS = 300;

const CONFIRMATION_LINE = content.copy["confirmation.message"];

/** Reads a --dur-* CSS custom property in ms, falling back if unset. */
function readDurationMs(varName: string, fallback: number): number {
  if (typeof window === "undefined") return fallback;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  if (!raw) return fallback;
  const parsed = parseFloat(raw);
  return raw.endsWith("s") && !raw.endsWith("ms") ? parsed * 1000 : parsed;
}

export default function Polaroid({ category, hero, reducedMotion, subtitleLines }: PolaroidProps) {
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
          {hero ? (
            <img
              className={`polaroid__photo${developed ? " polaroid__photo--developed" : ""}`}
              src={hero.src}
              alt={hero.alt}
              width={hero.w}
              height={hero.h}
              style={
                reducedMotion
                  ? undefined
                  : { transitionDuration: `${developMsForStyle}ms` }
              }
            />
          ) : (
            <div className="polaroid__develop">
              <div
                className={`polaroid__tint${developed ? " polaroid__tint--developed" : ""}`}
                style={
                  reducedMotion
                    ? undefined
                    : { transitionDuration: `${developMsForStyle}ms` }
                }
                aria-hidden="true"
              />
              <p
                className={`polaroid__exposure${developed ? " polaroid__exposure--developed" : ""}`}
                style={
                  reducedMotion
                    ? undefined
                    : { transitionDuration: `${developMsForStyle}ms` }
                }
              >
                {CONFIRMATION_LINE}
              </p>
            </div>
          )}
          <div className="grain-overlay" />
        </div>
        <figcaption className="polaroid__margin">
          <div className="polaroid__margin-inner">
            {subtitleLines?.map((line, i) => (
              <p className="polaroid__mono mono" key={i}>
                {line}
              </p>
            ))}
          </div>
        </figcaption>
      </div>
    </figure>
  );
}
