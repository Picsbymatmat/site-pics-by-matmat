import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CategoryViewProps, PhotoAsset } from "../../types";
import LightTable from "./LightTable";
import "./CategoryView.css";

const MOBILE_QUERY = "(max-width: 767px)";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

// Rates from spec §6 "Rails". Index order matches row order.
const PARALLAX_RATES = [-0.35, 0.22, -0.5];
// §3: a row repeats its own real photos (cloudinary.ts already sorts by
// public_id, so the repeat cycle stays in filename order) to fill out to
// this many images — desktop 10, mobile 5 — unless the row already has
// more real photos than that, in which case it shows all of them once,
// with no repeats.
const ROW_FILL_TARGET_DESKTOP = 10;
const ROW_FILL_TARGET_MOBILE = 5;
// Scales raw scrollY into a translate distance; keeps the drift readable
// without letting a tall page fling rails far off-screen.
const PARALLAX_SCALE = 0.4;
const PARALLAX_CLAMP = 480;
// .category-frame's fixed desktop width (240px) plus the rail track's gap
// (--space-3, 12px) — one full frame-and-gap's width, used below to shift
// the second row left by exactly one frame.
const FRAME_STEP = 240 + 12;
// Extra nudge left, applied to all three rows together so their relative
// alignment is untouched: shifting row 2 by exactly one FRAME_STEP lines
// its second frame up with rows 1/3's first frame, but its now off-screen
// first frame's trailing edge lands 4px past the clip boundary — a sliver
// still peeking in. Padding (--space-4, 16px) inside the track gives
// rows 1/3 plenty of room to absorb this same nudge without their own
// first frame losing any visible width.
const CLIP_MARGIN = 8;
// Baseline shift applied to each row before scroll-linked parallax. Rows
// 1 and 3 open flush (minus the margin above), first frame fully visible.
// Row 2 opens shifted left by one full frame plus that margin, so its
// *second* frame lands in that same spot and its first frame is fully
// hidden, not just moved mostly off-screen.
const PARALLAX_INITIAL_OFFSETS = [-CLIP_MARGIN, -(FRAME_STEP + CLIP_MARGIN), -CLIP_MARGIN];

interface RailItem {
  frame: PhotoAsset;
  originalIndex: number;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

// Builds one row's display sequence from its own independent pool (§11:
// shoot1/2/3, one per row). §3: below `target`, the row cycles its real
// photos to fill out to that length (a fixed, finite list — not the old
// infinite-scroll illusion, see the §7 note near the mobile effect below);
// at or above `target`, it shows every real photo once, no repeats.
function buildRow(frames: PhotoAsset[], target: number): RailItem[] {
  if (frames.length === 0) return [];
  if (frames.length >= target) {
    return frames.map((frame, originalIndex) => ({ frame, originalIndex }));
  }
  const out: RailItem[] = [];
  for (let i = 0; i < target; i++) {
    const originalIndex = i % frames.length;
    out.push({ frame: frames[originalIndex], originalIndex });
  }
  return out;
}

function frameLabel(index: number): string {
  return String(index + 1).padStart(2, "0");
}

export default function CategoryView({
  category,
  rows,
  onReturn,
  onLightTableChange,
}: CategoryViewProps) {
  const [openFrame, setOpenFrame] = useState<{ rowIndex: number; index: number } | null>(null);
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

  const railRows = useMemo(
    () =>
      rows.map((rowFrames) =>
        buildRow(rowFrames, isMobile ? ROW_FILL_TARGET_MOBILE : ROW_FILL_TARGET_DESKTOP),
      ),
    [rows, isMobile],
  );

  // Single shared rAF loop driving all rows' parallax, per spec §6 ("one
  // requestAnimationFrame loop for all rails"). Disabled entirely on
  // mobile (native scroll takes over) and under reduced motion (rails
  // become plain scrollable rows, no translation at all).
  useEffect(() => {
    if (isMobile || reducedMotion || railRows.length === 0) return;

    let rafId: number;
    const tick = () => {
      const y = window.scrollY;
      rowRefs.current.forEach((el, i) => {
        if (!el) return;
        const rate = PARALLAX_RATES[i] ?? 0;
        const x = clamp(y * rate * PARALLAX_SCALE, -PARALLAX_CLAMP, PARALLAX_CLAMP);
        const initialOffset = PARALLAX_INITIAL_OFFSETS[i] ?? 0;
        el.style.transform = `translate3d(${initialOffset + x}px, 0, 0)`;
      });
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isMobile, reducedMotion, railRows.length]);

  // Reset any leftover transform when switching into mobile/reduced-motion
  // mode so rails don't stick at a stale offset.
  useEffect(() => {
    if (isMobile || reducedMotion) {
      rowRefs.current.forEach((el) => {
        if (el) el.style.transform = "";
      });
    }
  }, [isMobile, reducedMotion]);

  // §7/§15: rails do not loop — no infinite scroll, no wraparound, no
  // tripled copies or scroll-position rewriting. railRows above may repeat
  // a sparse row's real photos to fill out the mobile/desktop threshold,
  // but that list is fixed and finite: native scroll-snap in
  // CategoryView.css just scrolls it like any other row and stops at the
  // real end.

  const openLightTable = useCallback(
    (rowIndex: number, index: number, el: HTMLElement) => {
      savedScrollY.current = window.scrollY;
      lastActivatedEl.current = el;
      setOpenFrame({ rowIndex, index });
      onLightTableChange?.(true);
    },
    [onLightTableChange],
  );

  const closeLightTable = useCallback(() => {
    setOpenFrame(null);
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
    setOpenFrame((prev) => (prev ? { ...prev, index: next } : prev));
  }, []);

  const hasAnyRow = rows.some((row) => row.length > 0);

  return (
    <div className="category-view">
      <div className="category-view-bar">
        <button type="button" className="category-return mono" onClick={onReturn}>
          ← All shoots
        </button>
      </div>

      <h2 className="category-view-heading">{category.label}</h2>

      {hasAnyRow ? (
        <div className="category-rails" aria-label={`${category.label} photographs`}>
          {railRows.map((row, rowIndex) => (
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
                      onClick={(e) => openLightTable(rowIndex, item.originalIndex, e.currentTarget)}
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

      {openFrame && (
        <LightTable
          frames={rows[openFrame.rowIndex]}
          index={openFrame.index}
          onClose={closeLightTable}
          onNavigate={navigateLightTable}
          reducedMotion={reducedMotion}
        />
      )}
    </div>
  );
}
