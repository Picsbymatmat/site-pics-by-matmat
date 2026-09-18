import type { PhotoManifest } from "../types";

/**
 * Interim manifest, one real photo per category reused across every slot,
 * ahead of Cloudinary (§11) and Matt's full photo delivery (§15: 15-25 per
 * category) tagged distinctly per slot ({key}-film1/2/3, {key}-shoot1/2/3,
 * {key}-background, {key}-hero). Not the final asset count or arrangement —
 * components must still handle any slot being null/empty.
 */
export const PHOTOS: PhotoManifest = {
  product: {
    film: [
      { src: "/images/placeholder/product/01-product.jpg", alt: "Product photography, studio still life.", w: 600, h: 900 },
      { src: "/images/placeholder/product/01-product.jpg", alt: "Product photography, studio still life.", w: 600, h: 900 },
      { src: "/images/placeholder/product/01-product.jpg", alt: "Product photography, studio still life.", w: 600, h: 900 },
    ],
    rows: [
      [{ src: "/images/placeholder/product/01-product.jpg", alt: "Product photography, studio still life.", w: 600, h: 900 }],
      [{ src: "/images/placeholder/product/01-product.jpg", alt: "Product photography, studio still life.", w: 600, h: 900 }],
      [{ src: "/images/placeholder/product/01-product.jpg", alt: "Product photography, studio still life.", w: 600, h: 900 }],
    ],
    background: { src: "/images/placeholder/product/01-product-plate.jpg", alt: "", w: 800, h: 1000 },
    hero: { src: "/images/placeholder/product/01-product.jpg", alt: "Product photography, studio still life.", w: 600, h: 900 },
  },
  brand: {
    film: [
      { src: "/images/placeholder/brand/01-brand.jpg", alt: "Brand and lifestyle photography, client sample shoot.", w: 600, h: 750 },
      { src: "/images/placeholder/brand/01-brand.jpg", alt: "Brand and lifestyle photography, client sample shoot.", w: 600, h: 750 },
      { src: "/images/placeholder/brand/01-brand.jpg", alt: "Brand and lifestyle photography, client sample shoot.", w: 600, h: 750 },
    ],
    rows: [
      [{ src: "/images/placeholder/brand/01-brand.jpg", alt: "Brand and lifestyle photography, client sample shoot.", w: 600, h: 750 }],
      [{ src: "/images/placeholder/brand/01-brand.jpg", alt: "Brand and lifestyle photography, client sample shoot.", w: 600, h: 750 }],
      [{ src: "/images/placeholder/brand/01-brand.jpg", alt: "Brand and lifestyle photography, client sample shoot.", w: 600, h: 750 }],
    ],
    background: { src: "/images/placeholder/brand/01-brand-plate.jpg", alt: "", w: 1200, h: 800 },
    hero: { src: "/images/placeholder/brand/01-brand.jpg", alt: "Brand and lifestyle photography, client sample shoot.", w: 600, h: 750 },
  },
  event: {
    film: [
      { src: "/images/placeholder/event/01-event.jpg", alt: "Event photography, live coverage.", w: 600, h: 900 },
      { src: "/images/placeholder/event/01-event.jpg", alt: "Event photography, live coverage.", w: 600, h: 900 },
      { src: "/images/placeholder/event/01-event.jpg", alt: "Event photography, live coverage.", w: 600, h: 900 },
    ],
    rows: [
      [{ src: "/images/placeholder/event/01-event.jpg", alt: "Event photography, live coverage.", w: 600, h: 900 }],
      [{ src: "/images/placeholder/event/01-event.jpg", alt: "Event photography, live coverage.", w: 600, h: 900 }],
      [{ src: "/images/placeholder/event/01-event.jpg", alt: "Event photography, live coverage.", w: 600, h: 900 }],
    ],
    background: { src: "/images/placeholder/event/01-event-plate.jpg", alt: "", w: 600, h: 900 },
    hero: { src: "/images/placeholder/event/01-event.jpg", alt: "Event photography, live coverage.", w: 600, h: 900 },
  },
  portrait: {
    film: [
      { src: "/images/placeholder/portrait/01-portrait.jpg", alt: "Graduation portrait, outdoor golden-hour setting.", w: 600, h: 900 },
      { src: "/images/placeholder/portrait/01-portrait.jpg", alt: "Graduation portrait, outdoor golden-hour setting.", w: 600, h: 900 },
      { src: "/images/placeholder/portrait/01-portrait.jpg", alt: "Graduation portrait, outdoor golden-hour setting.", w: 600, h: 900 },
    ],
    rows: [
      [{ src: "/images/placeholder/portrait/01-portrait.jpg", alt: "Graduation portrait, outdoor golden-hour setting.", w: 600, h: 900 }],
      [{ src: "/images/placeholder/portrait/01-portrait.jpg", alt: "Graduation portrait, outdoor golden-hour setting.", w: 600, h: 900 }],
      [{ src: "/images/placeholder/portrait/01-portrait.jpg", alt: "Graduation portrait, outdoor golden-hour setting.", w: 600, h: 900 }],
    ],
    background: { src: "/images/placeholder/portrait/01-portrait-plate.jpg", alt: "", w: 600, h: 900 },
    hero: { src: "/images/placeholder/portrait/01-portrait.jpg", alt: "Graduation portrait, outdoor golden-hour setting.", w: 600, h: 900 },
  },
};
