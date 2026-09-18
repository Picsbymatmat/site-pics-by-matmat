import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Filmstrip from "../Filmstrip/Filmstrip";
import CategoryView from "../CategoryView/CategoryView";
import BookingFlow from "../BookingFlow/BookingFlow";
import content from "../../data/content.json";
import { CATEGORIES } from "../../data/categories";
import { usePhotoManifest } from "../../lib/usePhotoManifest";
import { useMediaQuery, MOBILE_QUERY } from "../../lib/useMediaQuery";
import type { CategoryKey } from "../../types";
import "./Landing.css";

// Alternating off-vertical angles for the loose overlapping fan, §3: "each
// angled slightly off vertical in alternating directions." Four values,
// matching CATEGORIES order.
const STRIP_ROTATIONS = ["-4deg", "3deg", "-3deg", "5deg"];

const INLINE_BOOKING_ID = "inline-booking";

interface LandingProps {
  onLightTableChange: (open: boolean) => void;
  /** Reports every hover/open back up to App's app-wide background pick,
   *  which is what actually persists it into /book/:category and /success —
   *  Landing itself no longer renders a plate of its own. */
  onPlateChange: (key: CategoryKey) => void;
}

export default function Landing({ onLightTableChange, onPlateChange }: LandingProps) {
  const photos = usePhotoManifest();
  const [openCategory, setOpenCategory] = useState<CategoryKey | null>(null);
  // Mobile only: which strip the swipe has landed on, for the dot
  // indicator (§7, Instagram-style carousel dots).
  const [mobileIndex, setMobileIndex] = useState(0);
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const stripRefs = useRef<Partial<Record<CategoryKey, HTMLDivElement | null>>>({});

  // Preload all four plates so the first hover/scroll doesn't flash empty
  // (§6 explicit requirement).
  useEffect(() => {
    CATEGORIES.forEach((c) => {
      const background = photos[c.key].background;
      if (background) {
        const img = new Image();
        img.src = background.src;
      }
    });
  }, [photos]);

  // Mobile: one strip fills the swipe at a time, so whichever strip is
  // currently landed on (scroll-snap, one discrete swipe per category —
  // §7) sets the plate — the strip with the highest intersection ratio.
  useEffect(() => {
    if (!isMobile) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const landed = entries.reduce<IntersectionObserverEntry | null>(
          (best, e) => (e.intersectionRatio > (best?.intersectionRatio ?? 0) ? e : best),
          null,
        );
        if (landed && landed.intersectionRatio > 0.5) {
          const key = (landed.target as HTMLElement).dataset.categoryKey as CategoryKey;
          onPlateChange(key);
          const index = CATEGORIES.findIndex((c) => c.key === key);
          if (index !== -1) setMobileIndex(index);
        }
      },
      { threshold: [0.5, 0.75, 1] },
    );
    Object.values(stripRefs.current).forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [isMobile, onPlateChange]);

  const handleHoverStart = useCallback(
    (key: CategoryKey) => {
      if (!isMobile) onPlateChange(key);
    },
    [isMobile, onPlateChange],
  );

  const handleOpen = useCallback(
    (key: CategoryKey) => {
      setOpenCategory(key);
      onPlateChange(key);
    },
    [onPlateChange],
  );

  const handleReturn = useCallback(() => {
    setOpenCategory(null);
  }, []);

  const openMeta = openCategory ? CATEGORIES.find((c) => c.key === openCategory) ?? null : null;

  const strips = useMemo(
    () =>
      CATEGORIES.map((c) => ({
        meta: c,
        frames: photos[c.key].film,
      })),
    [photos],
  );

  // Downscaled from the base sizing per client feedback, applied multiple
  // times now: 10%, 10%, then 20% (to help the landing page fit one
  // viewport with no scroll). Mobile shows one strip at a time rather than
  // four overlapping, so it gets its own clamp (§7) — scaled down 35%, then
  // back up 10% twice, per client feedback.
  //
  // Mobile's preferred value is tied to viewport *height* (dvh), not
  // width — the whole point of the mobile layout is one strip filling the
  // available vertical space, so a taller phone should show a bigger strip
  // rather than leaving dead space below it, the way a vw-based value did.
  // min() with a vw figure is just a horizontal safety rail so a narrow
  // but unusually tall viewport can't blow out sideways.
  const stripVars: Record<string, string> = {
    "--frame-width": isMobile ? "clamp(64px, min(13dvh, 30vw), 130px)" : "clamp(62px, 7.8vw, 94px)",
  };

  if (openMeta && openCategory) {
    return (
      <div className="category-page">
        <CategoryView
          category={openMeta}
          rows={photos[openCategory].rows}
          onReturn={handleReturn}
          onLightTableChange={onLightTableChange}
        />
        <div id={INLINE_BOOKING_ID}>
          <BookingFlow presetCategory={openCategory} onCategoryChange={onPlateChange} />
        </div>
      </div>
    );
  }

  return (
    <div className="landing">
      <div className="landing-content">
        <p className="landing-heading">{content.copy["landing.heading"]}</p>

        <div className="landing-fan">
          {strips.map(({ meta, frames }, i) => (
            <div
              className="landing-fan__strip"
              key={meta.key}
              data-category-key={meta.key}
              ref={(el) => {
                stripRefs.current[meta.key] = el;
              }}
              style={
                { "--strip-rotate": STRIP_ROTATIONS[i], ...stripVars } as unknown as React.CSSProperties
              }
            >
              <Filmstrip
                category={meta}
                frames={frames}
                onHoverStart={handleHoverStart}
                onOpen={handleOpen}
              />
            </div>
          ))}
        </div>

        {/* Mobile only (hidden on desktop via CSS): Instagram-style carousel
            dots tracking which strip the swipe has landed on. */}
        <div className="landing-dots" role="presentation">
          {CATEGORIES.map((c, i) => (
            <span
              key={c.key}
              className={`landing-dot${i === mobileIndex ? " landing-dot--active" : ""}`}
            />
          ))}
        </div>

        <a className="landing-portfolio-link mono" href={content.portfolioLinks[0]?.url ?? "#"}>
          {content.copy["landing.portfolioLink"]}
        </a>
      </div>
    </div>
  );
}
