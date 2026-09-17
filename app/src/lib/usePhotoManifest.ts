import { useEffect, useState } from "react";
import { PHOTOS } from "../data/photos";
import { getAllCategoryPhotos } from "./cloudinary";
import type { PhotoManifest } from "../types";

/** The live photo manifest: local placeholders immediately (so nothing
 *  ever renders empty), swapped for Cloudinary's tagged uploads once that
 *  fetch resolves (a no-op when no cloud name is configured, or a tag has
 *  nothing uploaded yet — see lib/cloudinary.ts's per-category fallback). */
export function usePhotoManifest(): PhotoManifest {
  const [manifest, setManifest] = useState<PhotoManifest>(PHOTOS);

  useEffect(() => {
    let cancelled = false;
    getAllCategoryPhotos().then((real) => {
      if (!cancelled) setManifest(real);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return manifest;
}
