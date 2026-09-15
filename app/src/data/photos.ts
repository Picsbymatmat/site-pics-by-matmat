import type { PhotoManifest } from "../types";

/**
 * Interim manifest, one real photo per category (frame + hero) plus a
 * distinct atmosphere plate, ahead of Cloudinary (§11) and Matt's full
 * photo delivery (§15: 15-25 per category). Not the final asset count —
 * components must still handle frames arrays of any length.
 */
export const PHOTOS: PhotoManifest = {
  product: {
    frames: [
      {
        src: "/images/placeholder/product/01-product.jpg",
        alt: "Product photography, studio still life.",
        w: 600,
        h: 900,
      },
    ],
    plate: {
      src: "/images/placeholder/product/01-product-plate.jpg",
      alt: "",
      w: 800,
      h: 1000,
    },
    hero: {
      src: "/images/placeholder/product/01-product.jpg",
      alt: "Product photography, studio still life.",
      w: 600,
      h: 900,
    },
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
      src: "/images/placeholder/brand/01-brand-plate.jpg",
      alt: "",
      w: 1200,
      h: 800,
    },
    hero: {
      src: "/images/placeholder/brand/01-brand.jpg",
      alt: "Brand and lifestyle photography, client sample shoot.",
      w: 600,
      h: 750,
    },
  },
  event: {
    frames: [
      {
        src: "/images/placeholder/event/01-event.jpg",
        alt: "Event photography, live coverage.",
        w: 600,
        h: 900,
      },
    ],
    plate: {
      src: "/images/placeholder/event/01-event-plate.jpg",
      alt: "",
      w: 600,
      h: 900,
    },
    hero: {
      src: "/images/placeholder/event/01-event.jpg",
      alt: "Event photography, live coverage.",
      w: 600,
      h: 900,
    },
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
      src: "/images/placeholder/portrait/01-portrait-plate.jpg",
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
