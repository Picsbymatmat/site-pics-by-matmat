import { useEffect, useState } from "react";
import type { CategoryKey, TimeSlot } from "../../types";

// Inline date + named-slot picker (§8, §9) — replaces the earlier Cal.com
// popup embed. That popup's own "book" button created a real Cal.com
// booking the instant a visitor completed it, which put booking-creation
// in two places at once (the popup, and booking.ts on form submit) and
// risked a duplicate booking per submission. This component only ever
// *reads* availability, via GET /.netlify/functions/slots (a thin proxy
// that keeps CALCOM_API_KEY server-side) — nothing is booked until the
// full call sheet is submitted and booking.ts creates the one real
// booking, against the exact slot picked here.

interface SlotOption {
  timeSlot: TimeSlot;
  /** Exact ISO start time Cal.com offered for this slot — passed straight
   *  through to booking.ts unchanged, so the visitor always books the real
   *  slot they saw, never a guessed hour. */
  start: string;
}

const SLOT_LABEL: Record<TimeSlot, string> = { morning: "Morning", midday: "Midday", evening: "Evening" };
const SLOT_ORDER: TimeSlot[] = ["morning", "midday", "evening"];

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export interface SlotPickerSelection {
  date: string;
  timeSlot: TimeSlot;
  start: string;
}

interface SlotPickerProps {
  /** Slots are per Cal.com event type, one per category — null (no shoot
   *  type chosen yet) means there's nothing to look up availability for. */
  category: CategoryKey | null;
  selected: SlotPickerSelection | null;
  onSelect: (selection: SlotPickerSelection) => void;
}

type LoadState = "idle" | "loading" | "error";

export default function SlotPicker({ category, selected, onSelect }: SlotPickerProps) {
  const [date, setDate] = useState(selected?.date ?? "");
  const [slots, setSlots] = useState<SlotOption[]>([]);
  const [state, setState] = useState<LoadState>("idle");

  useEffect(() => {
    if (!category || !date) {
      setSlots([]);
      setState("idle");
      return;
    }
    let cancelled = false;
    setState("loading");
    fetch(`/.netlify/functions/slots?category=${category}&date=${date}`)
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status));
        return res.json() as Promise<{ slots: SlotOption[] }>;
      })
      .then((data) => {
        if (cancelled) return;
        setSlots(data.slots ?? []);
        setState("idle");
      })
      .catch(() => {
        if (cancelled) return;
        setSlots([]);
        setState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [category, date]);

  if (!category) {
    return <p className="call-sheet__calendar-pending mono">Choose a shoot type to see availability.</p>;
  }

  return (
    <div className="call-sheet__slot-picker">
      <input
        type="date"
        className="call-sheet__date-input"
        min={todayIso()}
        value={date}
        aria-label="Shoot date"
        onChange={(e) => setDate(e.target.value)}
      />
      {date ? (
        <div className="call-sheet__slot-row" role="radiogroup" aria-label="Time of day">
          {SLOT_ORDER.map((slot) => {
            const option = slots.find((s) => s.timeSlot === slot);
            const isActive = selected?.date === date && selected.timeSlot === slot;
            return (
              <button
                type="button"
                key={slot}
                role="radio"
                aria-checked={isActive}
                className={`call-sheet__slot-btn${isActive ? " call-sheet__slot-btn--active" : ""}`}
                disabled={!option || state === "loading"}
                onClick={() => option && onSelect({ date, timeSlot: slot, start: option.start })}
              >
                {SLOT_LABEL[slot]}
              </button>
            );
          })}
        </div>
      ) : null}
      {state === "loading" ? <p className="call-sheet__slots-status mono">Checking availability…</p> : null}
      {state === "error" ? (
        <p className="call-sheet__slots-status mono">Couldn't load availability — try again, or a different date.</p>
      ) : null}
      {state === "idle" && date && slots.length === 0 ? (
        <p className="call-sheet__slots-status mono">Nothing open that day — try another date.</p>
      ) : null}
    </div>
  );
}
