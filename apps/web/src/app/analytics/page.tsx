import Link from "next/link";

const TREND_DATA = [
  { label: "Titan 6", clears: 4, wipes: 2, best: "4.2%", note: "Strong execution on the late-shift burst phase." },
  { label: "Operations Chief", clears: 3, wipes: 3, best: "7.8%", note: "Steady progression with one key mechanic still inconsistent." },
  { label: "Olok the Shadow", clears: 2, wipes: 1, best: "11.0%", note: "Holding tempo but still vulnerable to early pulls." },
];

const INSIGHT_CARDS = [
  { title: "Command tempo", value: "+18%", detail: "Faster first-pull coordination this week." },
  { title: "Recovery rate", value: "82%", detail: "Wipes are converting into cleaner follow-up attempts." },
  { title: "Raid focus", value: "Burst windows", detail: "The next gains are expected in execution clarity." },
];

export default function AnalyticsPage() {
  return (
    <main className="space-y-6">
      <header>
        <Link href="/" className="text-xs uppercase tracking-[0.3em] text-[var(--color-gold)] hover:underline">
          ← Home
        </Link>
        <h1 className="mt-1 text-2xl uppercase">Analytics</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Encounter trend views for wipe progression and boss execution quality.
        </p>
      </header>

      <section className="panel rounded-md p-5">
        <div className="grid gap-3 md:grid-cols-3">
          {INSIGHT_CARDS.map((card) => (
            <div key={card.title} className="rounded border border-[var(--color-line)] p-4">
              <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--color-muted)]">{card.title}</p>
              <p className="mt-2 text-xl uppercase">{card.value}</p>
              <p className="mt-1 text-sm text-[var(--color-muted)]">{card.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="panel rounded-md p-5">
        <h2 className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">Progression trend</h2>
        <ul className="mt-4 space-y-3">
          {TREND_DATA.map((entry) => (
            <li key={entry.label} className="rounded border border-[var(--color-line)] px-3 py-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm uppercase">{entry.label}</span>
                <span className="text-xs uppercase tracking-[0.12em] text-[var(--color-republic)]">Best {entry.best}</span>
              </div>
              <p className="mt-1 text-xs text-[var(--color-muted)]">
                {entry.clears} clears · {entry.wipes} wipes
              </p>
              <p className="mt-1 text-sm">{entry.note}</p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
