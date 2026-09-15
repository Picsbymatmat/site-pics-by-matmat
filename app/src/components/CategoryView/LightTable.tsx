import { useCallback, useEffect, useRef, useState } from "react";
import type { PhotoAsset } from "../../types";
import "./LightTable.css";

interface LightTableProps {
  frames: PhotoAsset[];
  index: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
  reducedMotion: boolean;
}

const MOBILE_QUERY = "(max-width: 767px)";

// Frame number rendered bare, e.g. "07" — no manufacturer/stock name, per
// spec §5's explicit ban. Zero-padded two digits is plenty for a 15-25
// frame category.
function frameNumber(index: number): string {
  return String(index + 1).padStart(2, "0");
}

export default function LightTable({ frames, index, onClose, onNavigate, reducedMotion }: LightTableProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia(MOBILE_QUERY).matches,
  );
  // Guards against the mobile scroll-position effect fighting the user's
  // own in-flight swipe (we set scrollLeft programmatically on index
  // change from arrow-key/prop updates, not on every native scroll tick).
  const isProgrammaticScroll = useRef(false);

  const frame = frames[index];
  const count = frames.length;

  useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY);
    const handler = () => setIsMobile(mql.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  const goPrev = useCallback(() => {
    onNavigate((index - 1 + count) % count);
  }, [index, count, onNavigate]);

  const goNext = useCallback(() => {
    onNavigate((index + 1) % count);
  }, [index, count, onNavigate]);

  // Focus trap + keyboard nav. Escape closes, arrow keys navigate, Tab
  // cycles only within the light table's focusable controls.
  useEffect(() => {
    const node = dialogRef.current;
    if (!node) return;
    const dialogNode = node;

    function getFocusable(): HTMLElement[] {
      return Array.from(
        dialogNode.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => !el.hasAttribute("disabled"));
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
        return;
      }
      if (e.key === "Tab") {
        const focusable = getFocusable();
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement;
        if (e.shiftKey) {
          if (active === first || !dialogNode.contains(active)) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (active === last || !dialogNode.contains(active)) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [goPrev, goNext, onClose]);

  // Move focus into the light table on open.
  useEffect(() => {
    closeBtnRef.current?.focus();
  }, []);

  // Mobile: keep the scroll-snap track in sync with `index` when it
  // changes from something other than the user's own swipe (e.g. arrow
  // key nav, or the initial frame clicked from the rails).
  useEffect(() => {
    if (!isMobile) return;
    const track = trackRef.current;
    if (!track) return;
    const target = track.children[index] as HTMLElement | undefined;
    if (!target) return;
    isProgrammaticScroll.current = true;
    track.scrollTo({ left: target.offsetLeft, behavior: reducedMotion ? "auto" : "smooth" });
    const clear = setTimeout(() => {
      isProgrammaticScroll.current = false;
    }, 400);
    return () => clearTimeout(clear);
  }, [index, isMobile, reducedMotion]);

  // Mobile: detect which frame the swipe settled on and report it up so
  // the frame number / aria-live label track the visible frame.
  const handleTrackScroll = useCallback(() => {
    if (!isMobile || isProgrammaticScroll.current) return;
    const track = trackRef.current;
    if (!track) return;
    const children = Array.from(track.children) as HTMLElement[];
    let nearest = 0;
    let nearestDist = Infinity;
    children.forEach((child, i) => {
      const dist = Math.abs(child.offsetLeft - track.scrollLeft);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = i;
      }
    });
    if (nearest !== index) onNavigate(nearest);
  }, [isMobile, index, onNavigate]);

  const handleScrimClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose],
  );

  if (!frame) return null;

  return (
    <div
      className={`lighttable-scrim${reducedMotion ? " lighttable--reduced" : ""}`}
      onClick={handleScrimClick}
    >
      <div
        className="lighttable-dialog"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Photograph viewer"
      >
        <button
          type="button"
          className="lighttable-close"
          ref={closeBtnRef}
          onClick={onClose}
        >
          Close
        </button>

        {!isMobile && count > 1 && (
          <button
            type="button"
            className="lighttable-nav lighttable-nav--prev"
            onClick={goPrev}
            aria-label="Previous photograph"
          >
            ‹
          </button>
        )}

        {isMobile ? (
          <div className="lighttable-track" ref={trackRef} onScroll={handleTrackScroll}>
            {frames.map((f, i) => (
              <div className="lighttable-frame lighttable-frame--snap" key={f.src + i}>
                <img src={f.src} alt={f.alt} width={f.w} height={f.h} />
                <span className="lighttable-framenumber mono">{frameNumber(i)}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="lighttable-frame-wrap">
            <div className="lighttable-frame" key={frame.src}>
              <img src={frame.src} alt={frame.alt} width={frame.w} height={frame.h} />
              <span className="lighttable-framenumber mono">{frameNumber(index)}</span>
            </div>
          </div>
        )}

        {!isMobile && count > 1 && (
          <button
            type="button"
            className="lighttable-nav lighttable-nav--next"
            onClick={goNext}
            aria-label="Next photograph"
          >
            ›
          </button>
        )}

        <div className="visually-hidden" aria-live="polite">
          {`Photograph ${index + 1} of ${count}`}
        </div>
      </div>
    </div>
  );
}
