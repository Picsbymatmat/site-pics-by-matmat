import { Link, Navigate, useLocation } from "react-router-dom";
import Polaroid from "../Polaroid/Polaroid";
import content from "../../data/content.json";
import { CATEGORIES } from "../../data/categories";
import { useMediaQuery, REDUCED_MOTION_QUERY } from "../../lib/useMediaQuery";
import type { SuccessState } from "../BookingFlow/BookingFlow";
import "./SuccessPage.css";

export default function SuccessPage() {
  const location = useLocation();
  const state = location.state as SuccessState | null;
  const reducedMotion = useMediaQuery(REDUCED_MOTION_QUERY);

  // Reached without going through a submission (refresh, stale link, typed
  // URL) — there's no booking to confirm, so there's nothing to show.
  if (!state) return <Navigate to="/" replace />;

  const meta = CATEGORIES.find((c) => c.key === state.category);

  return (
    <div className="success-page">
      {meta ? <Polaroid category={meta} hero={null} reducedMotion={reducedMotion} /> : null}
      <Link className="success-page__back mono" to="/">
        ← {content.copy["landing.backLink"]}
      </Link>
    </div>
  );
}
