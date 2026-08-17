import Link from "next/link";

const DECK_ITEMS = [
  {
    title: "Live feed",
    value: "Active",
    detail: "Monitor the current raid session and follow the live boss state.",
    href: "/live",
  },
  {
    title: "Operations",
    value: "NiM prep",
    detail: "Keep the next mission brief, roster, and readiness notes in view.",
    href: "/operations",
  },
  {
    title: "Progression",
    value: "Burst windows",
    detail: "Track the encounters that are trending upward and where the next gains should land.",
    href: "/analytics",
  },
];

export function CommandDeck() {
  return (
    <section className="panel rounded-md p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--color-muted)]">Command deck</p>
          <h2 className="mt-1 text-lg uppercase">Mission control</h2>
        </div>
        <span className="rounded border border-[var(--color-republic)]/40 bg-[var(--color-republic)]/10 px-3 py-1 text-xs uppercase tracking-[0.12em] text-[var(--color-republic)]">
          Infamous readiness
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {DECK_ITEMS.map((item) => (
          <Link
            key={item.title}
            href={item.href}
            className="rounded border border-[var(--color-line)] bg-black/20 p-4 transition hover:border-[var(--color-republic)]"
          >
            <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--color-muted)]">{item.title}</p>
            <p className="mt-2 text-sm uppercase">{item.value}</p>
            <p className="mt-2 text-sm text-[var(--color-muted)]">{item.detail}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
