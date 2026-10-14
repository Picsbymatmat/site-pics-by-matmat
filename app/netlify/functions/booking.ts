// Booking function — §2, §9, §11. Written as a plain Netlify Functions v2
// handler (`export default async (req: Request) => Response`) rather than
// pulling in the `@netlify/functions` package: Netlify's build detects and
// bundles this shape with no extra dependency, and the request/response
// surface it needs here (JSON body in, JSON out) is exactly what the raw
// Fetch API types already give us. Not part of the Vite build or `tsc -b`
// (see tsconfig.app.json's `include`) — Netlify bundles/type-strips this
// file itself at deploy time, same as any other function.
//
// Flow (§9): validate the payload, then do two independent things:
//   1. Try to create a *pending* Cal.com booking (pending is a property of
//      the Cal.com event type itself — "requires confirmation", set in
//      Matt's dashboard, not something this function requests) against the
//      exact slot the visitor picked via slots.ts. This is the ONLY place
//      a real Cal.com booking gets created — picking a slot in the call
//      sheet never books anything by itself.
//      The call sheet's other answers (contact, shoot type, location,
//      delivery, per-category details, notes) ride along as responses to
//      custom booking questions on the event type (see CAL_FIELD_SLUGS),
//      which Cal.com prints as labeled rows in its own booking emails —
//      so Cal.com's booking-request email is the one Matt normally reads.
//   2. Only as a last resort — Cal.com couldn't take the booking at all,
//      or took it but rejected those responses (e.g. the questions aren't
//      set up on that event type) — POST the full submission to Netlify
//      Forms, whose notification email then carries the details instead.
// Returns 200 if either succeeds, non-2xx only if both fail. All secrets
// live only in Netlify's env vars (never VITE_-prefixed, never sent to the
// browser).

import { CALCOM_API_KEY, CALCOM_EVENT_TYPE_IDS, CATEGORY_KEYS, TIME_SLOTS, json } from "./lib/calcom";
import type { CategoryKey, TimeSlot } from "./lib/calcom";

interface BookingPayload {
  category: CategoryKey;
  name: string;
  subject: string;
  email: string;
  phone: string | null;
  instagram: string | null;
  shootDate: string | null;
  timeSlot: TimeSlot | null;
  // Exact ISO start time of the Cal.com slot the visitor picked via
  // GET /.netlify/functions/slots (see SlotPicker.tsx) — this, not
  // shootDate/timeSlot, is what actually gets booked below. shootDate and
  // timeSlot stay on the payload as the human-facing display fields (§8)
  // and for the Netlify Forms fallback, where there's no booking to derive
  // them back out of.
  slotStart: string | null;
  turnaround: "standard" | "rush";
  location: string;
  notes: string | null;
  categoryFields: Record<string, unknown>;
  submittedAt: string;
  source: "picsbymatmat-booking";
}

const TURNAROUNDS = ["standard", "rush"] as const;

// Display-only formatting for the Netlify Forms notification email (see
// postToNetlifyForms) — Netlify's built-in email notification has no
// template of its own, so readability comes entirely from what's actually
// submitted under each field name.
// Same labels the site itself shows (src/data/categories.ts).
const CATEGORY_LABELS: Record<CategoryKey, string> = {
  product: "Product",
  brand: "Brand",
  event: "Event",
  portrait: "Portrait",
};

const TIME_SLOT_LABELS: Record<TimeSlot, string> = { morning: "Morning", midday: "Midday", evening: "Evening" };

const TURNAROUND_LABELS: Record<(typeof TURNAROUNDS)[number], string> = {
  standard: "Standard, 2 to 3 weeks after the shoot",
  rush: "Rush, sooner than standard (rush fee applies)",
};

function formatShootDate(shootDate: string | null): string {
  if (!shootDate) return "";
  const d = new Date(`${shootDate}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return shootDate;
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
}

function fieldString(fields: Record<string, unknown>, key: string): string {
  const v = fields[key];
  return v === null || v === undefined ? "" : String(v);
}

/** The call sheet's answers as the human-readable lines both channels
 *  show: Cal.com's booking questions and the Netlify fallback email. */
interface BookingSummary {
  contact: string;
  shoot: string;
  when: string;
  location: string;
  delivery: string;
  details: string;
  notes: string;
}

function summarize(payload: BookingPayload): BookingSummary {
  const categoryLabel = CATEGORY_LABELS[payload.category];
  // Event and Portrait carry their shoot type in eventType/occasion (the
  // call sheet's shoot-type dropdowns); the other two only have a category.
  const shootType =
    fieldString(payload.categoryFields, "eventType") || fieldString(payload.categoryFields, "occasion");
  return {
    contact: formatContact(payload),
    shoot: shootType ? `${categoryLabel}: ${shootType}` : categoryLabel,
    when:
      formatShootDate(payload.shootDate) +
      (payload.timeSlot ? ` (${TIME_SLOT_LABELS[payload.timeSlot].toLowerCase()})` : ""),
    location: payload.location,
    delivery: TURNAROUND_LABELS[payload.turnaround],
    details: formatDetails(payload),
    notes: payload.notes?.trim() ?? "",
  };
}

// Slugs of the custom booking questions each of the four Cal.com event
// types must have for these rows to show in Cal.com's emails — created by
// scripts/setup-calcom-fields.mjs, which must stay in sync with this list.
// "when" isn't here: Cal.com's email already leads with the date and time.
const CAL_FIELD_SLUGS = {
  contact: "contact",
  shoot: "shoot",
  location: "shoot-location",
  delivery: "delivery",
  details: "details",
  notes: "shoot-notes",
} as const;

// Cal.com caps long-text answers at 1000 characters.
const CAL_ANSWER_MAX = 1000;

function calFieldResponses(summary: BookingSummary): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, slug] of Object.entries(CAL_FIELD_SLUGS)) {
    const value = summary[key as keyof typeof CAL_FIELD_SLUGS];
    // Unanswered rows are left out so Cal.com's email doesn't list them.
    if (value && value !== NO_DETAILS) out[slug] = value.slice(0, CAL_ANSWER_MAX);
  }
  return out;
}

/** "Phone: (415) 513-6566" or "Instagram: @handle" — the call sheet only
 *  collects one of the two, so the email shows one line, never a blank. */
function formatContact(payload: BookingPayload): string {
  if (payload.instagram) return `Instagram: @${payload.instagram.replace(/^@+/, "")}`;
  if (!payload.phone) return "Email only";
  const digits = payload.phone.replace(/\D/g, "");
  const us = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  return us.length === 10
    ? `Phone: (${us.slice(0, 3)}) ${us.slice(3, 6)}-${us.slice(6)}`
    : `Phone: ${payload.phone}`;
}

const NO_DETAILS = "None given";

// Label + categoryFields key for each per-category answer that goes on the
// one "Details" line. eventType/occasion aren't here: they're the
// shoot type, shown on the "Shoot" line instead.
const DETAIL_FIELDS: [label: string, key: string][] = [
  ["Business", "business"],
  ["Product count", "productCount"],
  ["Usage", "usage"],
  ["Deliverables", "deliverables"],
  ["Shoot length", "shootLength"],
  ["Duration", "duration"],
  ["Guest count", "guestCount"],
];

/** Every answered per-category question (plus the Portrait-only subject)
 *  on one line, unanswered ones left out entirely — never a row of blank
 *  fields for the three categories this booking isn't. */
function formatDetails(payload: BookingPayload): string {
  const parts = DETAIL_FIELDS.map(([label, key]) => [label, fieldString(payload.categoryFields, key).trim()])
    .filter(([, value]) => value)
    .map(([label, value]) => `${label}: ${value}`);
  if (payload.subject.trim()) parts.unshift(`Subject: ${payload.subject.trim()}`);
  return parts.length > 0 ? parts.join(" | ") : NO_DETAILS;
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function isNullOr<T>(v: unknown, check: (v: unknown) => v is T): v is T | null {
  return v === null || check(v);
}

/** Validates the §2 payload shape. Deliberately not exhaustive on
 *  categoryFields' inner shape — that varies per category and the Cal.com/
 *  Netlify Forms paths below only need it as an opaque bag to forward. */
function isValidPayload(body: unknown): body is BookingPayload {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;

  if (!CATEGORY_KEYS.includes(b.category as CategoryKey)) return false;
  if (!isNonEmptyString(b.name)) return false;
  // subject only renders/is required client-side for Portraits (§8) — the
  // other three categories submit it as "", which is valid here.
  if (typeof b.subject !== "string") return false;
  if (!isNonEmptyString(b.email)) return false;
  if (!isNonEmptyString(b.location)) return false;
  if (!TURNAROUNDS.includes(b.turnaround as (typeof TURNAROUNDS)[number])) return false;
  if (!isNonEmptyString(b.submittedAt)) return false;
  if (b.source !== "picsbymatmat-booking") return false;
  if (!isNullOr(b.phone, isNonEmptyString)) return false;
  if (!isNullOr(b.instagram, isNonEmptyString)) return false;
  // Exactly one of phone/instagram, per §2.
  if (!b.phone && !b.instagram) return false;
  if (b.shootDate !== null && !isNonEmptyString(b.shootDate)) return false;
  if (b.timeSlot !== null && !TIME_SLOTS.includes(b.timeSlot as TimeSlot)) return false;
  if (b.slotStart !== null && !isNonEmptyString(b.slotStart)) return false;
  if (!b.categoryFields || typeof b.categoryFields !== "object") return false;

  return true;
}

/** "full" = booked, with the call sheet's answers attached as booking
 *  question responses (so Cal.com's own emails show them). "bare" = booked,
 *  but Cal.com rejected those responses, so only name/email/time made it
 *  into its emails. "failed" = no booking was created. */
type CalResult = "full" | "bare" | "failed";

/** Attempts to create a pending Cal.com booking (v2 REST API,
 *  `cal-api-version: 2026-02-25` per current docs) against the visitor's
 *  exact chosen slot. Never throws — any missing config, missing slot,
 *  non-2xx response or network error comes back as "failed". */
async function createCalBooking(payload: BookingPayload, summary: BookingSummary): Promise<CalResult> {
  if (!CALCOM_API_KEY || !payload.slotStart) return "failed";
  const eventTypeId = CALCOM_EVENT_TYPE_IDS[payload.category];
  if (!eventTypeId) return "failed";

  const post = (withResponses: boolean) =>
    fetch("https://api.cal.com/v2/bookings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${CALCOM_API_KEY}`,
        "cal-api-version": "2026-02-25",
      },
      body: JSON.stringify({
        start: payload.slotStart,
        eventTypeId: Number(eventTypeId),
        attendee: {
          name: payload.name,
          email: payload.email,
          timeZone: "America/Los_Angeles",
        },
        ...(withResponses ? { bookingFieldsResponses: calFieldResponses(summary) } : {}),
        // Cal.com marks the booking pending automatically when the event
        // type itself has "requires confirmation" turned on (§9/§11) — not
        // a flag this request sets.
        // Raw answers, kept on the booking record itself (Cal.com stores
        // metadata but never shows it in emails).
        metadata: {
          subject: payload.subject,
          location: payload.location,
          timeSlot: payload.timeSlot ?? "",
          turnaround: payload.turnaround,
          notes: (payload.notes ?? "").slice(0, 500),
          phone: payload.phone ?? "",
          instagram: payload.instagram ?? "",
          ...Object.fromEntries(
            Object.entries(payload.categoryFields).map(([k, v]) => [k, String(v).slice(0, 500)]),
          ),
        },
      }),
    });

  try {
    const res = await post(true);
    if (res.ok) return "full";
    // A 400 can mean the responses themselves were refused (questions
    // missing from this event type) — a request Cal.com rejected created
    // no booking, so trying once more without them can't double-book. Any
    // other failure (slot taken, auth, outage) fails this second try too.
    if (res.status !== 400) return "failed";
    return (await post(false)).ok ? "bare" : "failed";
  } catch {
    return "failed";
  }
}

/** Posts the full submission to Netlify Forms so Matt is still emailed
 *  the complete call-sheet details when Cal.com couldn't carry them (see
 *  the flow note up top). Netlify only wires up form
 *  notifications for forms it found as static markup at build time — see
 *  the hidden `booking-fallback` form in index.html — so this POST must
 *  match that form's name and field set exactly. Netlify's email has no
 *  template of its own — it lists each submitted field as "Label: value"
 *  — so every field sent here is always filled in and already formatted
 *  for reading (see that file's own comment). */
async function postToNetlifyForms(
  payload: BookingPayload,
  summary: BookingSummary,
  calBooked: boolean,
  siteUrl: string,
): Promise<boolean> {
  try {
    const params = new URLSearchParams();
    params.set("form-name", "booking-fallback");
    // Netlify's reserved `subject` field becomes the notification email's
    // subject line (see index.html's comment). No "&" anywhere in it —
    // Netlify HTML-escapes the subject, so one arrives as a literal "&amp;".
    params.set("subject", `New booking: ${CATEGORY_LABELS[payload.category]}, ${payload.name}`);
    // This email only goes out when something went wrong on the Cal.com
    // side, so it leads with what Matt has to do about the calendar.
    params.set(
      "calendar",
      calBooked
        ? "Booked in Cal.com and waiting for you to confirm. Its email is missing the details below."
        : "NOT in Cal.com. The booking could not be added, so add it to your calendar by hand.",
    );
    params.set("name", payload.name);
    params.set("email", payload.email);
    params.set("contact", summary.contact);
    params.set("shoot", summary.shoot);
    params.set("when", summary.when);
    params.set("location", summary.location);
    params.set("delivery", summary.delivery);
    params.set("details", summary.details);
    params.set("notes", summary.notes || "None");

    const res = await fetch(siteUrl.replace(/\/+$/, "") + "/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export default async (req: Request): Promise<Response> => {
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  if (!isValidPayload(body)) {
    return json({ error: "Invalid booking payload" }, 400);
  }

  // Netlify sets URL to the site's primary production URL; DEPLOY_URL is
  // the deploy-specific fallback (branch/preview deploys, local `netlify
  // dev`). req.url's origin is a last-resort fallback so this never throws
  // for lack of a base to POST the Netlify Forms submission to.
  const siteUrl = process.env.URL || process.env.DEPLOY_URL || new URL(req.url).origin;

  const summary = summarize(body);
  const cal = await createCalBooking(body, summary);

  // Cal.com's own email carried everything — nothing more to send.
  if (cal === "full") {
    return json({ ok: true, calBooked: true, notified: false }, 200);
  }

  // Last resort (see the flow note up top): the details didn't reach
  // Matt through Cal.com, so Netlify Forms emails them instead.
  const formsOk = await postToNetlifyForms(body, summary, cal === "bare", siteUrl);

  if (cal === "bare" || formsOk) {
    return json({ ok: true, calBooked: cal === "bare", notified: formsOk }, 200);
  }

  return json({ error: "Booking could not be delivered" }, 502);
};
