import { Link } from "react-router-dom";
import BookingFlow from "../BookingFlow/BookingFlow";
import content from "../../data/content.json";
import "./BookingRoute.css";

export default function BookingRoute() {
  return (
    <div className="booking-route">
      <div className="booking-route__bar">
        <Link className="booking-route__back mono" to="/">
          ← {content.copy["landing.backLink"]}
        </Link>
      </div>
      <BookingFlow presetCategory={null} />
    </div>
  );
}
