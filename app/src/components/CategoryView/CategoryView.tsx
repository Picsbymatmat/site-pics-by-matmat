import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CategoryViewProps, PhotoAsset } from "../../types";
import LightTable from "./LightTable";
import "./CategoryView.css";

const MOBILE_QUERY = "(max-width: 767px)";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

// Rates from spec §6 "Rails". Index order matches row order.
const PARALLAX_RATES = [-0.35, 0.22, -0.5];
// Scales raw scrollY into a translate distance; keeps the drift readable
// without letting a tall page fling rails far off-screen.
const PARALLAX_SCALE = 0.4;
const PARALLAX_CLAMP = 480;

interface RailItem {
  frame: PhotoAsset;
  originalIndex: number;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

// Builds one row's frame sequence. Categories may have very few real
// photos yet (spec: frames may be empty, or hold just one placeholder) —
// rows repeat/wrap the available frames rather than come up short, per
// spec §3's explicit allowance.
function buildRow(frames: PhotoAsset[], offset: number, targetLength: number): RailItem[] {
  if (frames.length === 0) return [];
  const out: RailItem[] = [];
  for (let i = 0; i < targetLength; i++) {
    const originalIndex = (i + offset) % frames.length;
    out.push({ frame: frames[originalIndex], originalIndex });
  }
  return out;
}

function frameLabel(index: number): string {
  return String(index + 1).padStart(2, "0");
}

// Frame-number rule content between rails, e.g. "→01 02 03 04". Bare
// numerals only — no manufacturer/stock names, per spec §5.
function railMarkings(row: RailItem[]): string {
  const seen = new Set<number>();
  const numbers: string[] = [];
  for (const item of row) {
    if (seen.has(item.originalIndex)) continue;
    seen.add(item.originalIndex);
    numbers.push(frameLabel(item.originalIndex));
    if (numbers.length >= 8) break;
  }
  return `→${numbers.join(" ")}`;
}

export default function CategoryView({ category, frames, onReturn, onBook }: CategoryViewProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia(MOBILE_QUERY).matches,
  );
  const [reducedMotion, setReducedMotion] = useState(
    () => typeof window !== "undefined" && window.matchMedia(REDUCED_MOTION_QUERY).matches,
  );

  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const savedScrollY = useRef(0);
  const lastActivatedEl = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const mobileQuery = window.matchMedia(MOBILE_QUERY);
    const motionQuery = window.matchMedia(REDUCED_MOTION_QUERY);
    const handleMobile = () => setIsMobile(mobileQuery.matches);
    const handleMotion = () => setReducedMotion(motionQuery.matches);
    mobileQuery.addEventListener("change", handleMobile);
    motionQuery.addEventListener("change", handleMotion);
    return () => {
      mobileQuery.removeEventListener("change", handleMobile);
      motionQuery.removeEventListener("change", handleMotion);
    };
  }, []);

  const rows = useMemo(() => {
    if (frames.length === 0) return [];
    const targetLength = Math.max(frames.length, 6);
    return PARALLAX_RATES.map((_, i) => buildRow(frames, i, targetLength));
  }, [frames]);

  // Single shared rAF loop driving all rows' parallax, per spec §6 ("one
  // requestAnimationFrame loop for all rails"). Disabled entirely on
  // mobile (native scroll takes over) and under reduced motion (rails
  // become plain scrollable rows, no translation at all).
  useEffect(() => {
    if (isMobile || reducedMotion || rows.length === 0) return;

    let rafId: number;
    const tick = () => {
      const y = window.scrollY;
      rowRefs.current.forEach((el, i) => {
        if (!el) return;
        const rate = PARALLAX_RATES[i] ?? 0;
        const x = clamp(y * rate * PARALLAX_SCALE, -PARALLAX_CLAMP, PARALLAX_CLAMP);
        el.style.transform = `translate3d(${x}px, 0, 0)`;
      });
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isMobile, reducedMotion, rows.length]);

  // Reset any leftover transform when switching into mobile/reduced-motion
  // mode so rails don't stick at a stale offset.
  useEffect(() => {
    if (isMobile || reducedMotion) {
      rowRefs.current.forEach((el) => {
        if (el) el.style.transform = "";
      });
    }
  }, [isMobile, reducedMotion]);

  const openLightTable = useCallback((originalIndex: number, el: HTMLElement) => {
    savedScrollY.current = window.scrollY;
    lastActivatedEl.current = el;
    setOpenIndex(originalIndex);
  }, []);

  const closeLightTable = useCallback(() => {
    setOpenIndex(null);
    // Scroll position is never touched by the light table, so nothing to
    // restore beyond returning focus — but guard anyway in case something
    // upstream moved it while open.
    if (window.scrollY !== savedScrollY.current) {
      window.scrollTo(0, savedScrollY.current);
    }
    lastActivatedEl.current?.focus();
  }, []);

  const navigateLightTable = useCallback((next: number) => {
    setOpenIndex(next);
  }, []);

  const hasFrames = frames.length > 0;

  return (
    <div className="category-view">
      <div className="category-view-bar">
        <button type="button" className="category-return mono" onClick={onReturn}>
          ← All shoots
        </button>
      </div>

      <h2 className="category-view-heading">{category.label}</h2>

      {hasFrames ? (
        <div className="category-rails" aria-label={`${category.label} photographs`}>
          {rows.map((row, rowIndex) => (
            <div className="category-rail-block" key={rowIndex}>
              <div
                className="category-rail-track"
                ref={(el) => {
                  rowRefs.current[rowIndex] = el;
                }}
              >
                {row.map((item, itemIndex) => (
                  <button
                    type="button"
                    className="category-frame"
                    key={`${item.originalIndex}-${itemIndex}`}
                    onClick={(e) => openLightTable(item.originalIndex, e.currentTarget)}
                    aria-label={`Open photograph ${frameLabel(item.originalIndex)}: ${item.frame.alt}`}
                  >
                    <span className="category-frame-sprocket" aria-hidden="true" />
                    <img
                      src={item.frame.src}
                      alt={item.frame.alt}
                      width={item.frame.w}
                      height={item.frame.h}
                      loading="lazy"
                    />
                    <span className="category-frame-sprocket" aria-hidden="true" />
                  </button>
                ))}
              </div>
              {rowIndex < rows.length - 1 && (
                <div className="category-rail-rule mono" aria-hidden="true">
                  {railMarkings(row)}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="category-empty">
          <p className="category-empty-text">
            Proof photographs for {category.label.toLowerCase()} are on the way. Book now and be among
            the first shoots.
          </p>
        </div>
      )}

      <div className="category-view-cta">
        <button type="button" className="category-book" onClick={() => onBook(category.key)}>
          Book this shoot
        </button>
      </div>

      {openIndex !== null && (
        <LightTable
          frames={frames}
          index={openIndex}
          onClose={closeLightTable}
          onNavigate={navigateLightTable}
          reducedMotion={reducedMotion}
        />
      )}
    </div>
  );
}
