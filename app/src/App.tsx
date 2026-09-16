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
        <Route path="/book" element={<BookingRoute />} />
        <Route path="/book/:category" element={<BookingRoute />} />
        <Route path="/success" element={<SuccessPage />} />
      </Routes>
    </>
  );
}
