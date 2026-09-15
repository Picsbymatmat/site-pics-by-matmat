import content from "./data/content.json";

// Phase 2 (orchestrator) wires the real composition: nav, landing fan,
// CategoryView, CallSheet routing, Polaroid. This stub only proves the
// Phase 0 contracts (styles, types, data) load correctly before Phase 1
// component agents are dispatched.
export default function App() {
  return (
    <main style={{ padding: "var(--space-8)" }}>
      <h1 style={{ fontSize: "var(--text-3xl)" }}>{content.copy["landing.heading"]}</h1>
      <p className="mono" style={{ color: "var(--muted)", marginTop: "var(--space-4)" }}>
        Phase 0 scaffold. Components land in Phase 1.
      </p>
    </main>
  );
}
