import { Link, Navigate, useLocation } from "react-router-dom";
import Polaroid from "../Polaroid/Polaroid";
import content from "../../data/content.json";
import { CATEGORIES } from "../../data/categories";
import { useMediaQuery, REDUCED_MOTION_QUERY } from "../../lib/useMediaQuery";
import type { SuccessState } from "../BookingFlow/BookingFlow";
import "./SuccessPage.css";

function formatDate(iso: string): string | null {
  if (!iso) return null;
  const parsed = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export default function SuccessPage() {
  const location = useLocation();
  const state = location.state as SuccessState | null;
  const reducedMotion = useMediaQuery(REDUCED_MOTION_QUERY);

  // Reached without going through a submission (refresh, stale link, typed
  // URL) — there's no booking to confirm, so there's nothing to show.
  if (!state) return <Navigate to="/" replace />;

  const meta = CATEGORIES.find((c) => c.key === state.category);
  const formattedDate = formatDate(state.date);
  const firstLine = [meta?.label, formattedDate].filter(Boolean).join("   ");
  const subtitleLines = [firstLine, state.location?.trim()].filter(
    (line): line is string => Boolean(line),
  );

  return (
    <div className="success-page">
      {meta ? (
        <Polaroid category={meta} hero={null} reducedMotion={reducedMotion} subtitleLines={subtitleLines} />
      ) : null}
      <Link className="success-page__back mono" to="/">
        ← {content.copy["landing.backLink"]}
      </Link>
    </div>
  );
}
