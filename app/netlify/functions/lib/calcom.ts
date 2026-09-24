// Shared Cal.com config/constants for the booking functions (§9, §11).
// Netlify's functions bundler only treats files directly inside
// `netlify/functions/` as routable endpoints — nested folders like this
// `lib/` one are import-only and never exposed as their own function, which
// is what lets booking.ts and slots.ts share this without Netlify trying
// (and failing, since it exports no handler) to route to it directly.

export type CategoryKey = "product" | "brand" | "event" | "portrait";
export type TimeSlot = "morning" | "midday" | "evening";

export const CATEGORY_KEYS: readonly CategoryKey[] = ["product", "brand", "event", "portrait"];
export const TIME_SLOTS: readonly TimeSlot[] = ["morning", "midday", "evening"];

// Matt is Bay Area-based (§1); every slot/booking is quoted and created in
// his timezone regardless of the visitor's own, since the shoot itself
// happens where he is.
export const ATTENDEE_TIMEZONE = "America/Los_Angeles";

export const CALCOM_API_KEY = process.env.CALCOM_API_KEY;

// One Cal.com event type per category, so pricing/duration/questions can
// differ per shoot type (§9's "pricing and duration vary enough across the
// four categories"). Numeric event-type IDs, which is what the v2 API
// takes — not the calLink slug form used anywhere client-side.
export const CALCOM_EVENT_TYPE_IDS: Record<CategoryKey, string | undefined> = {
  product: process.env.CALCOM_EVENT_TYPE_ID_PRODUCT,
  brand: process.env.CALCOM_EVENT_TYPE_ID_BRAND,
  event: process.env.CALCOM_EVENT_TYPE_ID_EVENT,
  portrait: process.env.CALCOM_EVENT_TYPE_ID_PORTRAIT,
};

export function isCategoryKey(v: unknown): v is CategoryKey {
  return typeof v === "string" && (CATEGORY_KEYS as readonly string[]).includes(v);
}

export function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
