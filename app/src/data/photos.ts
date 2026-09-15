import type { PhotoManifest } from "../types";

/**
 * Placeholder manifest for Milestone 1 development, before Cloudinary is
 * wired to Matt's real folders (§11) and before he supplies photography
 * (§15). Two categories (brand, portrait) reuse a single real photo across
 * frame/plate/hero, per an explicit interim call — not the final asset
 * count (15–25 per category). Product and event have no usable real photo
 * yet: frames is empty and plate/hero are null on purpose, so components
 * must render their defined placeholder/empty states rather than break.
 */
export const PHOTOS: PhotoManifest = {
  product: {
    frames: [],
    plate: null,
    hero: null,
  },
  brand: {
    frames: [
      {
        src: "/images/placeholder/brand/01-brand.jpg",
        alt: "Brand and lifestyle photography, client sample shoot.",
        w: 600,
        h: 750,
      },
    ],
    plate: {
      src: "/images/placeholder/brand/01-brand.jpg",
      alt: "",
      w: 600,
      h: 750,
    },
    hero: {
      src: "/images/placeholder/brand/01-brand.jpg",
      alt: "Brand and lifestyle photography, client sample shoot.",
      w: 600,
      h: 750,
    },
  },
  event: {
    frames: [],
    plate: null,
    hero: null,
  },
  portrait: {
    frames: [
      {
        src: "/images/placeholder/portrait/01-portrait.jpg",
        alt: "Graduation portrait, outdoor golden-hour setting.",
        w: 600,
        h: 900,
      },
    ],
    plate: {
      src: "/images/placeholder/portrait/01-portrait.jpg",
      alt: "",
      w: 600,
      h: 900,
    },
    hero: {
      src: "/images/placeholder/portrait/01-portrait.jpg",
      alt: "Graduation portrait, outdoor golden-hour setting.",
      w: 600,
      h: 900,
    },
  },
};
