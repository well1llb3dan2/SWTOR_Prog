const MISSION_STEPS = [
  { title: "Current focus", detail: "Staying aligned with the current operation window." },
  { title: "Support status", detail: "Availability and timing remain under review." },
  { title: "Latest update", detail: "New information will appear here as it is confirmed." },
];

export function MissionTimeline() {
  return (
    <section className="panel rounded-md p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--color-muted)]">Mission flow</p>
          <h2 className="mt-1 text-lg uppercase">Current status</h2>
        </div>
        <span className="rounded border border-[var(--color-gold)]/40 bg-[var(--color-gold)]/10 px-3 py-1 text-xs uppercase tracking-[0.12em] text-[var(--color-gold)]">
          Command update
        </span>
      </div>

      <div className="mt-4 space-y-3">
        {MISSION_STEPS.map((step, index) => (
          <div key={step.title} className="flex gap-3 rounded border border-[var(--color-line)] bg-black/20 p-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--color-republic)]/40 bg-[var(--color-republic)]/10 text-sm uppercase text-[var(--color-republic)]">
              {index + 1}
            </div>
            <div>
              <p className="text-sm uppercase">{step.title}</p>
              <p className="mt-1 text-sm text-[var(--color-muted)]">{step.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
