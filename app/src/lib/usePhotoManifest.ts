import { useEffect, useState } from "react";
import { PHOTOS } from "../data/photos";
import { getAllCategoryPhotos } from "./cloudinary";
import type { PhotoManifest } from "../types";

/** The live photo manifest: local placeholders immediately (so nothing
 *  ever renders empty), swapped for Cloudinary's folder contents once that
 *  fetch resolves (categories with nothing uploaded keep their
 *  placeholders — see lib/cloudinary.ts). */
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
