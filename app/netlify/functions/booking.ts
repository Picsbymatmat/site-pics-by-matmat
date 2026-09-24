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
//   2. Always — not only when (1) fails — also POST the full submission to
//      Netlify Forms. Cal.com's own booking-created emails only cover what
//      Cal.com itself asks for (name/email/time); everything else the call
//      sheet collects (subject, location, phone/instagram, notes, the
//      category-specific fields) was going into the booking's `metadata`,
//      which Cal.com stores but does not surface in its notification
//      emails — so treating Netlify Forms as a fallback-only path meant
//      that whenever Cal.com succeeded, all of that extra detail silently
//      never reached anyone. Netlify Forms is now the one channel that
//      always carries the full submission, regardless of whether Cal.com
//      succeeds.
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
  if (!isNonEmptyString(b.subject)) return false;
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

/** Attempts to create a pending Cal.com booking (v2 REST API,
 *  `cal-api-version: 2026-02-25` per current docs) against the visitor's
 *  exact chosen slot. Returns false — never throws — on any missing
 *  config, missing slot, non-2xx response, or network error, so the
 *  caller can run this alongside postToNetlifyForms without a try/catch of
 *  its own at the call site. */
async function createCalBooking(payload: BookingPayload): Promise<boolean> {
  if (!CALCOM_API_KEY || !payload.slotStart) return false;
  const eventTypeId = CALCOM_EVENT_TYPE_IDS[payload.category];
  if (!eventTypeId) return false;

  try {
    const res = await fetch("https://api.cal.com/v2/bookings", {
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
        // Cal.com marks the booking pending automatically when the event
        // type itself has "requires confirmation" turned on (§9/§11) — not
        // a flag this request sets.
        metadata: {
          subject: payload.subject,
          location: payload.location,
          timeSlot: payload.timeSlot ?? "",
          turnaround: payload.turnaround,
          notes: payload.notes ?? "",
          phone: payload.phone ?? "",
          instagram: payload.instagram ?? "",
          ...Object.fromEntries(
            Object.entries(payload.categoryFields).map(([k, v]) => [k, String(v)]),
          ),
        },
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Posts the full submission to Netlify Forms so Matt is always emailed
 *  the complete call-sheet details, whether or not Cal.com could take the
 *  booking (see the flow note up top). Netlify only wires up form
 *  notifications for forms it found as static markup at build time — see
 *  the hidden `booking-fallback` form in index.html — so this POST must
 *  match that form's name and field set exactly. */
async function postToNetlifyForms(payload: BookingPayload, siteUrl: string): Promise<boolean> {
  try {
    const params = new URLSearchParams();
    params.set("form-name", "booking-fallback");
    params.set("category", payload.category);
    params.set("name", payload.name);
    params.set("subject", payload.subject);
    params.set("email", payload.email);
    params.set("phone", payload.phone ?? "");
    params.set("instagram", payload.instagram ?? "");
    params.set("shootDate", payload.shootDate ?? "");
    params.set("timeSlot", payload.timeSlot ?? "");
    params.set("turnaround", payload.turnaround);
    params.set("location", payload.location);
    params.set("notes", payload.notes ?? "");
    params.set("categoryFields", JSON.stringify(payload.categoryFields));
    params.set("submittedAt", payload.submittedAt);

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

  // Both run unconditionally and independently (see the flow note up top)
  // — Cal.com creates/holds the actual slot, Netlify Forms is what
  // reliably carries every field the visitor typed to Matt's inbox.
  const [calOk, formsOk] = await Promise.all([createCalBooking(body), postToNetlifyForms(body, siteUrl)]);

  if (calOk || formsOk) {
    return json({ ok: true, calBooked: calOk, notified: formsOk }, 200);
  }

  return json({ error: "Booking could not be delivered" }, 502);
};
