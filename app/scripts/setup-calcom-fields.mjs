// One-time Cal.com setup: adds the custom booking questions the booking
// function fills in (netlify/functions/booking.ts, CAL_FIELD_SLUGS — the
// slugs here must match it) to each of the four event types, so Cal.com's
// own booking emails list the call sheet's answers as labeled rows.
//
//   node --env-file=.env.local scripts/setup-calcom-fields.mjs          dry run
//   node --env-file=.env.local scripts/setup-calcom-fields.mjs --apply  write
//
// Safe to re-run: questions an event type already has are left alone, and
// its existing fields are sent back unchanged (Cal.com's PATCH replaces
// the whole list). Needs CALCOM_API_KEY and the four
// CALCOM_EVENT_TYPE_ID_* variables.

const FIELDS = [
  { slug: "contact", label: "Contact", type: "shortText" },
  { slug: "shoot", label: "Shoot", type: "shortText" },
  { slug: "shoot-location", label: "Shoot location", type: "shortText" },
  { slug: "delivery", label: "Delivery", type: "shortText" },
  { slug: "details", label: "Details", type: "longText" },
  { slug: "shoot-notes", label: "Notes", type: "longText" },
].map((f) => ({ ...f, field: "custom", required: false, hidden: false }));

const EVENT_TYPES = {
  product: process.env.CALCOM_EVENT_TYPE_ID_PRODUCT,
  brand: process.env.CALCOM_EVENT_TYPE_ID_BRAND,
  event: process.env.CALCOM_EVENT_TYPE_ID_EVENT,
  portrait: process.env.CALCOM_EVENT_TYPE_ID_PORTRAIT,
};

const apply = process.argv.includes("--apply");
const headers = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${process.env.CALCOM_API_KEY}`,
  "cal-api-version": "2026-06-12",
};

if (!process.env.CALCOM_API_KEY) {
  console.error("CALCOM_API_KEY is not set.");
  process.exit(1);
}

let failed = false;
for (const [category, id] of Object.entries(EVENT_TYPES)) {
  if (!id) {
    console.error(`${category}: no event type ID set, skipped`);
    failed = true;
    continue;
  }
  const url = `https://api.cal.com/v2/event-types/${id}`;
  const current = await fetch(url, { headers });
  if (!current.ok) {
    console.error(`${category}: could not read event type ${id} (HTTP ${current.status})`);
    failed = true;
    continue;
  }
  const body = await current.json();
  const existing = (body.data?.eventType ?? body.data).bookingFields ?? [];
  const have = new Set(existing.map((f) => f.slug));
  const missing = FIELDS.filter((f) => !have.has(f.slug));

  if (missing.length === 0) {
    console.log(`${category}: already has all ${FIELDS.length} questions`);
    continue;
  }
  const names = missing.map((f) => f.label).join(", ");
  if (!apply) {
    console.log(`${category}: would add ${names}`);
    continue;
  }
  const res = await fetch(url, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ bookingFields: [...existing, ...missing] }),
  });
  if (res.ok) {
    console.log(`${category}: added ${names}`);
  } else {
    console.error(`${category}: update failed (HTTP ${res.status}) ${(await res.text()).slice(0, 300)}`);
    failed = true;
  }
}
if (!apply) console.log("Dry run only. Re-run with --apply to make the changes.");
process.exit(failed ? 1 : 0);
