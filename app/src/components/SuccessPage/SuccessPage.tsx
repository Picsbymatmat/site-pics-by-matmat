import { useEffect, useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import Polaroid from "../Polaroid/Polaroid";
import content from "../../data/content.json";
import { CATEGORIES } from "../../data/categories";
import { getPolaroid } from "../../lib/cloudinary";
import { useMediaQuery, REDUCED_MOTION_QUERY } from "../../lib/useMediaQuery";
import type { SuccessState } from "../BookingFlow/BookingFlow";
import type { PhotoAsset } from "../../types";
import "./SuccessPage.css";

export default function SuccessPage() {
  const location = useLocation();
  const state = location.state as SuccessState | null;
  const reducedMotion = useMediaQuery(REDUCED_MOTION_QUERY);
  // undefined = tag lookup still in flight. Polaroid waits for it so the
  // rise/develop animation runs once, on the final photo, instead of
  // restarting when the photo arrives.
  const [polaroid, setPolaroid] = useState<PhotoAsset | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    getPolaroid().then((photo) => {
      if (!cancelled) setPolaroid(photo);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Reached without going through a submission (refresh, stale link, typed
  // URL) — there's no booking to confirm, so there's nothing to show.
  if (!state) return <Navigate to="/" replace />;

  const meta = CATEGORIES.find((c) => c.key === state.category);

  return (
    <div className="success-page">
      {meta && polaroid !== undefined ? (
        <Polaroid category={meta} hero={polaroid} reducedMotion={reducedMotion} />
      ) : null}
      <Link className="success-page__back mono" to="/">
        ← {content.copy["landing.backLink"]}
      </Link>
    </div>
  );
}
