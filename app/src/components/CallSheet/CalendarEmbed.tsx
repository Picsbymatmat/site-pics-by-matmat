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

// Cal.com's official embed snippet, verbatim in structure (minified loader
// that defines window.Cal as a queueing shim until embed.js loads), scoped
// to run once regardless of how many CalendarEmbed instances mount.
function loadCalEmbedScript() {
  if (window.Cal) return;
  const Cal = ((...args: unknown[]) => {
    const cal = Cal as unknown as { q: unknown[] };
    cal.q = cal.q ?? [];
    cal.q.push(args);
  }) as Window["Cal"];
  window.Cal = Cal;
  const script = document.createElement("script");
  script.src = "https://app.cal.com/embed/embed.js";
  script.async = true;
  document.head.appendChild(script);
}

export default function CalendarEmbed() {
  const containerId = "cal-inline-embed";
  const mounted = useRef(false);

  useEffect(() => {
    if (!CAL_LINK || mounted.current) return;
    mounted.current = true;
    loadCalEmbedScript();
    window.Cal?.("init", NAMESPACE, { origin: "https://cal.com" });
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
