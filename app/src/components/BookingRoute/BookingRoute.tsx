import { Link } from "react-router-dom";
import BookingFlow from "../BookingFlow/BookingFlow";
import content from "../../data/content.json";
import type { CategoryKey } from "../../types";
import "./BookingRoute.css";

interface BookingRouteProps {
  /** Reports every dropdown change back up to App's app-wide background
   *  pick — the plate image itself is rendered globally in App, keyed off
   *  the URL (see App.tsx), this just keeps that pick remembered going
   *  forward (e.g. a later return to Landing). */
  onCategoryChange: (key: CategoryKey) => void;
}

export default function BookingRoute({ onCategoryChange }: BookingRouteProps) {
  return (
    <div className="booking-route">
      <div className="booking-route__content">
        <div className="booking-route__bar">
          <Link className="booking-route__back mono" to="/">
            ← {content.copy["landing.backLink"]}
          </Link>
        </div>
        <BookingFlow presetCategory={null} onCategoryChange={onCategoryChange} />
      </div>
    </div>
  );
}
