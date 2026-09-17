import { useEffect, useRef } from "react";

// Cal.com inline embed (§9). Milestone 1: VITE_CALCOM_LINK is unset until
// Matt's account exists, so this renders an honest "not connected yet"
// note instead of a broken or fabricated calendar. Milestone 2 sets the
// env var and this starts rendering the real embed with no code change.

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
// (mirroring Cal itself) — that's what lets an "inline"/"ui" call made
// before embed.js has finished loading get queued correctly instead of
// silently dropped or handed to embed.js's queue processor in a shape it
// doesn't recognize (which throws once the real script loads).
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

export default function CalendarEmbed() {
  const containerId = "cal-inline-embed";
  const mounted = useRef(false);

  useEffect(() => {
    if (!CAL_LINK || mounted.current) return;
    mounted.current = true;
    loadCalEmbedScript();
    window.Cal?.("init", NAMESPACE, { origin: "https://app.cal.com" });
    window.Cal?.ns?.[NAMESPACE]?.("inline", {
      elementOrSelector: `#${containerId}`,
      calLink: CAL_LINK,
      config: { layout: "month_view" },
    });
  }, []);

  if (!CAL_LINK) {
    return (
      <p className="call-sheet__calendar-pending mono">
        Calendar connects here once Matt's Cal.com account is linked.
      </p>
    );
  }

  return <div id={containerId} className="call-sheet__calendar-embed" />;
}
