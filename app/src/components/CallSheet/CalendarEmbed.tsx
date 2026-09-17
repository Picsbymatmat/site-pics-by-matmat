import { useEffect, useRef } from "react";

// Cal.com popup embed (§9). Milestone 1: VITE_CALCOM_LINK is unset until
// Matt's account exists, so this renders an honest "not connected yet"
// note instead of a broken or fabricated calendar. Milestone 2 sets the
// env var and this starts rendering the real trigger with no code change.
//
// Popup, not inline: the calendar stays hidden behind a button — Cal.com's
// own click-to-open pattern (data-cal-link/data-cal-namespace on the
// element embed.js auto-wires) — rather than always-visible on the page.
// A completed booking fires "bookingSuccessfulV2" on the namespace, which
// is how the caller learns a real, available date was picked.

const CAL_LINK = import.meta.env.VITE_CALCOM_LINK as string | undefined;
const NAMESPACE = "booking";

declare global {
  interface Window {
    Cal?: {
      (...args: unknown[]): void;
      ns?: Record<string, (...args: unknown[]) => void>;
      loaded?: boolean;
      q?: unknown[];
    };
  }
}

// Cal.com's official embed snippet, verbatim in structure. The key detail
// a naive reimplementation misses: on the "init" call, this shim must
// synchronously create Cal.ns[namespace] as its own queueing function
// (mirroring Cal itself) — that's what lets an "on"/"ui" call made before
// embed.js has finished loading get queued correctly instead of silently
// dropped or handed to embed.js's queue processor in a shape it doesn't
// recognize (which throws once the real script loads).
function loadCalEmbedScript() {
  if (window.Cal) return;
  const cal = ((...args: unknown[]) => {
    const api = cal as unknown as { q: unknown[]; ns: Record<string, unknown>; loaded?: boolean };
    if (!api.loaded) {
      api.ns = {};
      api.q = api.q ?? [];
      const script = document.createElement("script");
      script.src = "https://app.cal.com/embed/embed.js";
      script.async = true;
      document.head.appendChild(script);
      api.loaded = true;
    }
    if (args[0] === "init") {
      const namespace = args[1];
      const makeApi = () => {
        const fn = (...innerArgs: unknown[]) => {
          const inner = fn as unknown as { q: unknown[] };
          inner.q = inner.q ?? [];
          inner.q.push(innerArgs);
        };
        return fn as unknown as ((...a: unknown[]) => void) & { q: unknown[] };
      };
      if (typeof namespace === "string") {
        api.ns[namespace] = api.ns[namespace] ?? makeApi();
        (api.ns[namespace] as (...a: unknown[]) => void)(...args);
        api.q.push(["initNamespace", namespace]);
      } else {
        api.q.push(args);
      }
      return;
    }
    api.q.push(args);
  }) as Window["Cal"];
  window.Cal = cal;
}

interface BookingSuccessDetail {
  data?: { startTime?: string };
}

interface CalendarEmbedProps {
  /** Fires once with the booked slot's ISO start time when a visitor
   *  completes a booking in the popup. */
  onBooked: (startTimeIso: string) => void;
  /** Friendly label for an already-picked date, or null before one's
   *  been picked — swaps the trigger's copy from "Pick a date" to
   *  "<date> — change date". */
  selectedLabel: string | null;
}

export default function CalendarEmbed({ onBooked, selectedLabel }: CalendarEmbedProps) {
  const mounted = useRef(false);
  const onBookedRef = useRef(onBooked);
  onBookedRef.current = onBooked;

  useEffect(() => {
    if (!CAL_LINK || mounted.current) return;
    mounted.current = true;
    loadCalEmbedScript();
    window.Cal?.("init", NAMESPACE, { origin: "https://app.cal.com" });
    window.Cal?.ns?.[NAMESPACE]?.("on", {
      action: "bookingSuccessfulV2",
      callback: (e: CustomEvent<BookingSuccessDetail>) => {
        const startTime = e.detail?.data?.startTime;
        if (startTime) onBookedRef.current(startTime);
      },
    });
  }, []);

  if (!CAL_LINK) {
    return (
      <p className="call-sheet__calendar-pending mono">
        Calendar connects here once Matt's Cal.com account is linked.
      </p>
    );
  }

  return (
    <button
      type="button"
      id="cs-shoot-date-trigger"
      className="call-sheet__calendar-trigger"
      data-cal-link={CAL_LINK}
      data-cal-namespace={NAMESPACE}
      data-cal-config='{"layout":"month_view"}'
    >
      {selectedLabel ? `${selectedLabel} — change date` : "Pick a date"}
    </button>
  );
}
