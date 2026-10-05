// Frozen Phase 0 contracts. Any change to a shared type here needs the
// orchestrator, not a component agent, to make it.

export type CategoryKey = "product" | "brand" | "event" | "portrait";

export interface CategoryMeta {
  key: CategoryKey;
  /** Display label, sentence case, e.g. "Professional & product" */
  label: string;
  /** URL segment: product, brand, event, portrait */
  slug: string;
  /** CategoryView's rail row titles, in row order: shootTypes[0] labels the
   *  {key}/row1/ folder, [1] row2/, [2] row3/. */
  shootTypes: [string, string, string];
}

export interface PhotoAsset {
  src: string;
  alt: string;
  w: number;
  h: number;
}

export interface CategoryPhotos {
  /** Landing filmstrip's 3 preview slots: the first photo of each of the
   *  Cloudinary folders {key}/row1/, row2/ and row3/, in that order — the
   *  same photo also leads its rail row. A null slot renders as a neutral
   *  placeholder block (Filmstrip), never a broken image and never
   *  fabricated photography. */
  film: [PhotoAsset | null, PhotoAsset | null, PhotoAsset | null];
  /** CategoryView's 3 rail rows: the Cloudinary folders {key}/row1/,
   *  row2/ and row3/. An empty row renders with no frames rather than
   *  borrowing from another row. */
  rows: [PhotoAsset[], PhotoAsset[], PhotoAsset[]];
  /** Background atmosphere plate: the first photo in the Cloudinary folder
   *  {key}/background/. Null = fall back to a flat --surface tint, never
   *  stretch a frame photo into it. */
  background: PhotoAsset | null;
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
  deliverables: "social content" | "campaign" | "other";
  shootLength: "1 hour" | "2 hours" | "half day";
}

export interface EventFields {
  eventType: string;
  duration: string;
  guestCount: string;
}

export interface PortraitFields {
  occasion: string;
}

export type CategoryFieldsByKey = {
  product: ProductFields;
  brand: BrandFields;
  event: EventFields;
  portrait: PortraitFields;
};

export type Turnaround = "standard" | "rush";

export type TimeSlot = "morning" | "midday" | "evening";

export interface BookingPayload {
  category: CategoryKey;
  name: string;
  subject: string;
  email: string;
  phone: string | null;
  instagram: string | null;
  shootDate: string;
  /** Named slot the visitor picked from real Cal.com availability (§8,
   *  §9) — Cal.com owns the real hours behind each name, configured
   *  seasonally in its own dashboard, not here. Null until a date/slot
   *  has been picked. */
  timeSlot: TimeSlot | null;
  /** Exact ISO start time of that same slot, as Cal.com's availability API
   *  returned it — what the booking function actually books against.
   *  shootDate/timeSlot are the human-facing display fields; this is the
   *  machine one. Null until a slot has been picked. */
  slotStart: string | null;
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
  /** Exactly 3 slots (the first photo of each row folder) — a null entry renders
   *  as a placeholder block, not a repeated/borrowed frame. */
  frames: (PhotoAsset | null)[];
  onHoverStart: (key: CategoryKey) => void;
  onOpen: (key: CategoryKey) => void;
}

export interface CategoryViewProps {
  category: CategoryMeta;
  /** One pool per rail row — the {key}/row1/, row2/, row3/ folders. */
  rows: [PhotoAsset[], PhotoAsset[], PhotoAsset[]];
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
