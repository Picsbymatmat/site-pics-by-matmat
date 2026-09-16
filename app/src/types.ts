// Frozen Phase 0 contracts. Any change to a shared type here needs the
// orchestrator, not a component agent, to make it.

export type CategoryKey = "product" | "brand" | "event" | "portrait";

export interface CategoryMeta {
  key: CategoryKey;
  /** Display label, sentence case, e.g. "Professional & product" */
  label: string;
  /** URL segment: product, brand, event, portrait */
  slug: string;
}

export interface PhotoAsset {
  src: string;
  alt: string;
  w: number;
  h: number;
}

export interface CategoryPhotos {
  /** Filmstrip + category-view rail source. Empty array = no real photos yet
   *  for this category: components must render a neutral placeholder block,
   *  never a broken image and never fabricated photography. */
  frames: PhotoAsset[];
  /** Background atmosphere plate. Null = fall back to a flat --surface tint,
   *  never stretch a frame photo to fill the plate role. */
  plate: PhotoAsset | null;
  /** Polaroid confirmation hero. Null = Polaroid develops to a flat tint
   *  with the handwritten line only, no image. */
  hero: PhotoAsset | null;
}

export type PhotoManifest = Record<CategoryKey, CategoryPhotos>;

// ---- Booking ----

export interface ProductFields {
  business: string;
  productCount: string;
  usage: "ecommerce listings" | "social" | "website" | "advertising" | "other";
}

export interface BrandFields {
  business: string;
  deliverables: "social content" | "campaign" | "headshots" | "other";
  shootLength: "1 hour" | "2 hours" | "half day";
}

export interface EventFields {
  eventType: string;
  duration: string;
  guestCount: string;
}

export interface PortraitFields {
  occasion: string;
  people: string;
}

export type CategoryFieldsByKey = {
  product: ProductFields;
  brand: BrandFields;
  event: EventFields;
  portrait: PortraitFields;
};

export type TimeSlot = "morning" | "evening";
export type Turnaround = "standard" | "rush";

export interface BookingPayload {
  category: CategoryKey;
  name: string;
  subject: string;
  email: string;
  phone: string | null;
  instagram: string | null;
  shootDate: string;
  timeSlot: TimeSlot | null;
  turnaround: Turnaround;
  location: string;
  notes: string | null;
  categoryFields: Record<string, unknown>;
  submittedAt: string;
  source: "picsbymatmat-booking";
}

// ---- Content (Milestone 2, contract frozen now so nothing reshapes later) ----

export interface Testimonial {
  id: string;
  quote: string;
  name: string;
  /** null = general, shown regardless of chosen category (fallback case) */
  category: CategoryKey | null;
  photo?: PhotoAsset;
}

export interface ResultStat {
  id: string;
  value: string;
  caption: string;
}

export interface SiteContent {
  testimonials: Testimonial[];
  results: ResultStat[];
  copy: Record<string, string>;
  portfolioLinks: { label: string; url: string }[];
  contact: { instagram: string; email: string };
}

// ---- Component props (Phase 1 contracts) ----

export interface FilmstripProps {
  category: CategoryMeta;
  frames: PhotoAsset[];
  onHoverStart: (key: CategoryKey) => void;
  onOpen: (key: CategoryKey) => void;
}

export interface CategoryViewProps {
  category: CategoryMeta;
  frames: PhotoAsset[];
  onReturn: () => void;
  /** Phase 2: nav must hide while the light table is open (§3, §14). */
  onLightTableChange?: (open: boolean) => void;
}

export interface CallSheetProps {
  /** Set from /book/:category. Null when arrived at /book directly, in
   *  which case shoot type is the first required field. */
  presetCategory: CategoryKey | null;
  onCategoryChange: (key: CategoryKey) => void;
  onSuccess: (payload: BookingPayload) => void;
  /** Milestone 2: omitted/undefined in Milestone 1 builds. Component must
   *  render correctly with this absent — no calendar section, not a broken one. */
  testimonials?: Testimonial[];
}

export interface PolaroidProps {
  category: CategoryMeta;
  hero: PhotoAsset | null;
  reducedMotion: boolean;
}

export interface SupportingProps {
  content: SiteContent;
}
