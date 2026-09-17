import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import CallSheet from "../CallSheet/CallSheet";
import type { BookingPayload, CategoryKey } from "../../types";
import "./BookingFlow.css";

interface BookingFlowProps {
  /** Preset category, or null for direct-entry mode (shoot type is the
   *  first field). When rendered at /book/:category, CallSheet resolves
   *  the category from the URL itself, so this is only needed when
   *  embedding the flow outside that route (the inline case). */
  presetCategory: CategoryKey | null;
  /** Fires whenever CallSheet's own shoot-type dropdown changes the
   *  category, so the app-wide background pick stays in sync with manual
   *  selection too, not just Landing's hover/open. Optional: the callers
   *  that don't care about the persistent background can omit it. */
  onCategoryChange?: (key: CategoryKey) => void;
}

/** Success-page navigation state — category/date/location travel with the
 *  navigation itself rather than a URL param, since /success has nothing
 *  category-specific left to link to directly (§ /success feedback). */
export interface SuccessState {
  category: CategoryKey;
  date: string;
  location: string | null;
}

/** Call sheet for the standalone /book route and the inline booking
 *  section under a category's gallery (§3). On success, navigates to
 *  /success with the booking details as router state. */
export default function BookingFlow({ presetCategory, onCategoryChange }: BookingFlowProps) {
  const navigate = useNavigate();

  const handleSuccess = useCallback(
    (payload: BookingPayload) => {
      const state: SuccessState = {
        category: payload.category,
        date: payload.shootDate,
        location: payload.location,
      };
      navigate("/success", { state });
    },
    [navigate],
  );

  return (
    <div className="booking-flow">
      <CallSheet
        presetCategory={presetCategory}
        onCategoryChange={onCategoryChange ?? (() => {})}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
