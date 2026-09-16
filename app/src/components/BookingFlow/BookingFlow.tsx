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
export default function BookingFlow({ presetCategory }: BookingFlowProps) {
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
      <CallSheet presetCategory={presetCategory} onCategoryChange={() => {}} onSuccess={handleSuccess} />
    </div>
  );
}
