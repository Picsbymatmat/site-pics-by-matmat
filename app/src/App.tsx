import { useEffect, useState } from "react";
import { Route, Routes, matchPath, useLocation } from "react-router-dom";
import Nav from "./components/Nav/Nav";
import Landing from "./components/Landing/Landing";
import BookingRoute from "./components/BookingRoute/BookingRoute";
import SuccessPage from "./components/SuccessPage/SuccessPage";
import AppPlate from "./components/AppPlate/AppPlate";
import { CATEGORY_BY_SLUG } from "./data/categories";
import { usePhotoManifest } from "./lib/usePhotoManifest";
import type { CategoryKey } from "./types";
import type { SuccessState } from "./components/BookingFlow/BookingFlow";

export default function App() {
  const [lightTableOpen, setLightTableOpen] = useState(false);

  // The one background pick that follows the whole journey — set by
  // hovering/opening a strip on Landing, or by changing the shoot type in
  // CallSheet's dropdown (inline or standalone). Persists here, above the
  // route switch, until Landing sets a new one. Defaults to "brand" rather
  // than null so the very first paint, before any hover, already shows an
  // atmosphere plate instead of flat --bg.
  const [plateCategory, setPlateCategory] = useState<CategoryKey | null>("brand");

  const location = useLocation();
  const bookMatch = matchPath("/book/:category", location.pathname);
  const urlCategory: CategoryKey | null = bookMatch?.params.category
    ? CATEGORY_BY_SLUG[bookMatch.params.category]?.key ?? null
    : null;
  const successCategory: CategoryKey | null =
    location.pathname === "/success" ? (location.state as SuccessState | null)?.category ?? null : null;

  // Render-time value covers a direct URL hit before the sync effects
  // below have run; the effects then fold it into plateCategory so a
  // later return to Landing still remembers it.
  const activeCategory = urlCategory ?? successCategory ?? plateCategory;

  useEffect(() => {
    if (urlCategory) setPlateCategory(urlCategory);
  }, [urlCategory]);

  useEffect(() => {
    if (successCategory) setPlateCategory(successCategory);
  }, [successCategory]);

  const photos = usePhotoManifest();
  const plate = activeCategory ? photos[activeCategory].background : null;

  return (
    <>
      <AppPlate src={plate?.src ?? null} />

      <Nav hidden={lightTableOpen} />
      <Routes>
        <Route
          path="/"
          element={
            <Landing onLightTableChange={setLightTableOpen} onPlateChange={setPlateCategory} />
          }
        />
        <Route path="/book" element={<BookingRoute onCategoryChange={setPlateCategory} />} />
        <Route path="/book/:category" element={<BookingRoute onCategoryChange={setPlateCategory} />} />
        <Route path="/success" element={<SuccessPage />} />
      </Routes>
    </>
  );
}
