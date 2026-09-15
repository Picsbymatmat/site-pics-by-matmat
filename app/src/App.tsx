import { useState } from "react";
import { Route, Routes } from "react-router-dom";
import Nav from "./components/Nav/Nav";
import Landing from "./components/Landing/Landing";
import BookingRoute from "./components/BookingRoute/BookingRoute";
import SuccessPage from "./components/SuccessPage/SuccessPage";

export default function App() {
  const [lightTableOpen, setLightTableOpen] = useState(false);

  return (
    <>
      <Nav hidden={lightTableOpen} />
      <Routes>
        <Route path="/" element={<Landing onLightTableChange={setLightTableOpen} />} />
        {/* Hidden comparison layout, not linked from anywhere in the UI —
            landscape-aspect frames, 4 per strip, vs. the real site's
            portrait/2-per-strip fan. */}
        <Route
          path="/alt"
          element={<Landing onLightTableChange={setLightTableOpen} variant="horizontal" />}
        />
        <Route path="/book" element={<BookingRoute />} />
        <Route path="/book/:category" element={<BookingRoute />} />
        <Route path="/success" element={<SuccessPage />} />
      </Routes>
    </>
  );
}
