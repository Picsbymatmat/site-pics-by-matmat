import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Filmstrip from "../Filmstrip/Filmstrip";
import CategoryView from "../CategoryView/CategoryView";
import BookingFlow from "../BookingFlow/BookingFlow";
import content from "../../data/content.json";
import { CATEGORIES } from "../../data/categories";
import { PHOTOS } from "../../data/photos";
import { useMediaQuery, MOBILE_QUERY } from "../../lib/useMediaQuery";
import type { CategoryKey, PhotoAsset } from "../../types";
import "./Landing.css";

// Alternating off-vertical angles for the loose overlapping fan, §3: "each
// angled slightly off vertical in alternating directions." Four values,
// matching CATEGORIES order.
const STRIP_ROTATIONS = ["-4deg", "3deg", "-3deg", "5deg"];

const INLINE_BOOKING_ID = "inline-booking";

// Cycles through whatever real frames exist to fill a strip's frame count,
// same wrap-around allowance CategoryView uses for its rails — a category
// with only one real photo yet still previews the intended 2- or 4-tall
// layout instead of looking broken.
function repeatToFill(frames: PhotoAsset[], count: number): PhotoAsset[] {
  if (frames.length === 0) return [];
  return Array.from({ length: count }, (_, i) => frames[i % frames.length]);
}

interface LandingProps {
  onLightTableChange: (open: boolean) => void;
}

export default function Landing({ onLightTableChange }: LandingProps) {
  const [openCategory, setOpenCategory] = useState<CategoryKey | null>(null);
  const [activePlate, setActivePlate] = useState<CategoryKey | null>(null);
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const stripRefs = useRef<Partial<Record<CategoryKey, HTMLDivElement | null>>>({});

  // Preload all four plates so the first hover/scroll doesn't flash empty
  // (§6 explicit requirement).
  useEffect(() => {
    CATEGORIES.forEach((c) => {
      const plate = PHOTOS[c.key].plate;
      if (plate) {
        const img = new Image();
        img.src = plate.src;
      }
    });
  }, []);

  // Mobile: whichever strip sits nearest the vertical centre sets the
  // plate, via a centre-band IntersectionObserver root margin (§7).
  useEffect(() => {
    if (!isMobile) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const centred = entries.find((e) => e.isIntersecting);
        if (centred) {
          const key = (centred.target as HTMLElement).dataset.categoryKey as CategoryKey;
          setActivePlate(key);
        }
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 },
    );
    Object.values(stripRefs.current).forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [isMobile]);

  const handleHoverStart = useCallback(
    (key: CategoryKey) => {
      if (!isMobile) setActivePlate(key);
    },
    [isMobile],
  );

  const handleOpen = useCallback((key: CategoryKey) => {
    setOpenCategory(key);
  }, []);

  const handleReturn = useCallback(() => {
    setOpenCategory(null);
  }, []);

  const plate = activePlate ? PHOTOS[activePlate].plate : null;
  const openMeta = openCategory ? CATEGORIES.find((c) => c.key === openCategory) ?? null : null;

  const strips = useMemo(
    () =>
      CATEGORIES.map((c) => ({
        meta: c,
        frames: repeatToFill(PHOTOS[c.key].frames, 3),
      })),
    [],
  );

  // Downscaled from the base sizing per client feedback, applied multiple
  // times now: 10%, 10%, then 20% (to help the landing page fit one
  // viewport with no scroll).
  const stripVars: Record<string, string> = { "--frame-width": "clamp(62px, 7.8vw, 94px)" };

  if (openMeta && openCategory) {
    return (
      <div className="category-page">
        <CategoryView
          category={openMeta}
          frames={PHOTOS[openCategory].frames}
          onReturn={handleReturn}
          onLightTableChange={onLightTableChange}
        />
        <div id={INLINE_BOOKING_ID}>
          <BookingFlow presetCategory={openCategory} />
        </div>
      </div>
    );
  }

  return (
    <div className="landing">
      <div className="landing-plate-layer" aria-hidden="true">
        {plate ? (
          <img key={plate.src} className="landing-plate plate" src={plate.src} alt="" />
        ) : null}
        <div className="landing-plate-vignette" />
        <div className="grain-overlay" />
      </div>

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

        <a className="landing-portfolio-link mono" href={content.portfolioLinks[0]?.url ?? "#"}>
          {content.copy["landing.portfolioLink"]}
        </a>
      </div>
    </div>
  );
}
