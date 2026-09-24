// Slot availability — §8, §9. Proxies Cal.com's v2 "get available slots"
// endpoint so the browser can show real, bookable times without the
// server-side CALCOM_API_KEY ever reaching the client. This is the other
// half of the booking flow alongside booking.ts: this function only reads
// availability (nothing is booked here); booking.ts is the sole place a
// real Cal.com booking gets created, on full call-sheet submission.
//
// GET /.netlify/functions/slots?category=<key>&date=YYYY-MM-DD
//
// Response: { slots: [{ timeSlot: "morning"|"midday"|"evening", start: iso }] }
// — one representative slot per named bucket (§8: "label them by name in
// the picker rather than by raw time"), not every raw time Cal.com offers.
// A bucket with nothing available that day is simply absent from the list.

import { ATTENDEE_TIMEZONE, CALCOM_API_KEY, CALCOM_EVENT_TYPE_IDS, isCategoryKey, json } from "./lib/calcom";
import type { TimeSlot } from "./lib/calcom";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Cal.com's v2 slots response, verified against the current docs
// (cal.com/docs/api-reference/v2/slots): with `format` left at its
// default ("time"), `data` is keyed by date, each entry an array of
// `{ start: iso }` objects — the `start` string already carries the
// offset for whatever `timeZone` was requested, so its hour can be read
// straight off the string rather than re-interpreted through a Date
// object (which would use *this function's* local time, not the
// requested one).
interface CalcomSlotsResponse {
  status?: string;
  data?: Record<string, { start: string }[]>;
}

function bucketFromIso(iso: string): TimeSlot | null {
  const match = /T(\d{2}):/.exec(iso);
  if (!match) return null;
  const hour = Number(match[1]);
  if (hour < 12) return "morning";
  if (hour < 16) return "midday";
  return "evening";
}

function nextDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

export default async (req: Request): Promise<Response> => {
  if (req.method !== "GET") {
    return json({ error: "Method not allowed" }, 405);
  }

  const url = new URL(req.url);
  const category = url.searchParams.get("category");
  const date = url.searchParams.get("date");

  if (!isCategoryKey(category)) {
    return json({ error: "Missing or invalid category" }, 400);
  }
  if (!date || !DATE_RE.test(date)) {
    return json({ error: "Missing or invalid date (expected YYYY-MM-DD)" }, 400);
  }

  if (!CALCOM_API_KEY) {
    return json({ error: "Calendar not connected yet" }, 503);
  }
  const eventTypeId = CALCOM_EVENT_TYPE_IDS[category];
  if (!eventTypeId) {
    return json({ error: "Calendar not connected yet" }, 503);
  }

  try {
    const params = new URLSearchParams({
      eventTypeId,
      start: date,
      end: nextDate(date),
      timeZone: ATTENDEE_TIMEZONE,
    });
    const res = await fetch(`https://api.cal.com/v2/slots?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${CALCOM_API_KEY}`,
        "cal-api-version": "2024-09-04",
      },
    });
    if (!res.ok) {
      return json({ error: "Could not load availability" }, 502);
    }
    const body = (await res.json()) as CalcomSlotsResponse;
    const dayline = body.data?.[date] ?? [];

    const byBucket = new Map<TimeSlot, string>();
    for (const slot of dayline) {
      const bucket = bucketFromIso(slot.start);
      if (bucket && !byBucket.has(bucket)) byBucket.set(bucket, slot.start);
    }

    const slots = Array.from(byBucket.entries()).map(([timeSlot, start]) => ({ timeSlot, start }));
    return json({ slots }, 200);
  } catch {
    return json({ error: "Could not load availability" }, 502);
  }
};
