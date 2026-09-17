import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CategoryViewProps, PhotoAsset } from "../../types";
import LightTable from "./LightTable";
import "./CategoryView.css";

const MOBILE_QUERY = "(max-width: 767px)";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

// Rates from spec §6 "Rails". Index order matches row order.
const PARALLAX_RATES = [-0.35, 0.22, -0.5];
// Starting offset into `frames` for each row — the middle row starts one
// frame further along ("one more image to the left") so it doesn't open
// on the same frame as the top row.
const ROW_OFFSETS = [0, 2, 2];
// Extra frames appended to each row's target length, per row index — one
// more added to every row (the third row now carries two extra on top of
// the shared baseline).
const ROW_EXTRA = [1, 1, 2];
// Scales raw scrollY into a translate distance; keeps the drift readable
// without letting a tall page fling rails far off-screen.
const PARALLAX_SCALE = 0.4;
const PARALLAX_CLAMP = 480;
// Baseline shift applied to every row before scroll-linked parallax, so
// rails open already scrolled halfway into the first frame (matches
// .category-frame's fixed desktop width) rather than starting flush on
// its left edge.
const PARALLAX_INITIAL_OFFSET = -120;

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

export default function CategoryView({
  category,
  frames,
  onReturn,
  onLightTableChange,
}: CategoryViewProps) {
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
    return ROW_OFFSETS.map((offset, i) => buildRow(frames, offset, targetLength + ROW_EXTRA[i]));
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
        el.style.transform = `translate3d(${PARALLAX_INITIAL_OFFSET + x}px, 0, 0)`;
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

  // Mobile rails read as infinitely repeating while side-scrolling: each
  // row's frame sequence is tripled, the scroll position starts at the
  // middle copy, and crossing into the first or last copy jumps back to
  // the middle copy by exactly one set's width — imperceptible since the
  // three copies are identical, so the loop has no visible seam.
  const displayRows = useMemo(() => {
    if (!isMobile) return rows;
    return rows.map((row) => [...row, ...row, ...row]);
  }, [rows, isMobile]);

  useEffect(() => {
    if (!isMobile || rows.length === 0) return;

    const tracks = rowRefs.current.filter((el): el is HTMLDivElement => el !== null);

    // Start each track scrolled to its middle copy.
    tracks.forEach((el) => {
      el.scrollLeft = el.scrollWidth / 3;
    });

    const handlers = tracks.map((el) => {
      const handleScroll = () => {
        const oneSet = el.scrollWidth / 3;
        if (oneSet <= 0) return;
        if (el.scrollLeft < oneSet * 0.5) {
          el.scrollLeft += oneSet;
        } else if (el.scrollLeft > oneSet * 1.5) {
          el.scrollLeft -= oneSet;
        }
      };
      el.addEventListener("scroll", handleScroll, { passive: true });
      return { el, handleScroll };
    });

    return () => {
      handlers.forEach(({ el, handleScroll }) => el.removeEventListener("scroll", handleScroll));
    };
  }, [isMobile, rows]);

  const openLightTable = useCallback(
    (originalIndex: number, el: HTMLElement) => {
      savedScrollY.current = window.scrollY;
      lastActivatedEl.current = el;
      setOpenIndex(originalIndex);
      onLightTableChange?.(true);
    },
    [onLightTableChange],
  );

  const closeLightTable = useCallback(() => {
    setOpenIndex(null);
    // Scroll position is never touched by the light table, so nothing to
    // restore beyond returning focus — but guard anyway in case something
    // upstream moved it while open.
    if (window.scrollY !== savedScrollY.current) {
      window.scrollTo(0, savedScrollY.current);
    }
    lastActivatedEl.current?.focus();
    onLightTableChange?.(false);
  }, [onLightTableChange]);

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
          {displayRows.map((row, rowIndex) => (
            <div className="category-rail-block" key={rowIndex}>
              <p className="category-rail-label mono">shoot type {rowIndex + 1}</p>
              <div className="category-rail-viewport">
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
                      key={`${itemIndex}-${item.originalIndex}`}
                      onClick={(e) => openLightTable(item.originalIndex, e.currentTarget)}
                      aria-label={`Open photograph ${frameLabel(item.originalIndex)}: ${item.frame.alt}`}
                    >
                      <img
                        src={item.frame.src}
                        alt={item.frame.alt}
                        width={item.frame.w}
                        height={item.frame.h}
                        loading="lazy"
                      />
                    </button>
                  ))}
                </div>
              </div>
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
