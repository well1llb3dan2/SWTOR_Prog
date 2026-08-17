import Link from "next/link";

const ACHIEVEMENTS = [
  {
    id: "PROG_FIRST_CLEAR",
    name: "Hand of the Emperor",
    category: "Progression",
    description: "First guild clear of a major operation milestone.",
    earned: true,
  },
  {
    id: "DPS_TOP_PERCENTILE",
    name: "Unlimited Power",
    category: "Role DPS",
    description: "Top percentile damage on a boss encounter.",
    earned: false,
  },
  {
    id: "HEAL_CLEANSE_MASTER",
    name: "Cleanse Maestro",
    category: "Role Heal",
    description: "High cleanse throughput with low reaction time.",
    earned: true,
  },
  {
    id: "MEME_FLOOR_TANK",
    name: "Floor Inspector",
    category: "Meme",
    description: "A heroic amount of encounter downtime for the team.",
    earned: false,
  },
];

export default function AchievementsPage() {
  return (
    <main className="space-y-6">
      <header>
        <Link href="/" className="text-xs uppercase tracking-[0.3em] text-[var(--color-gold)] hover:underline">
          ← Home
        </Link>
        <h1 className="mt-1 text-2xl uppercase">Achievements</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          A lightweight badge surface that reflects the progression and meme goals from the plan.
        </p>
      </header>

      <section className="panel rounded-md p-5">
        <div className="grid gap-3 rounded border border-[var(--color-line)] bg-black/20 p-4 md:grid-cols-[1fr_0.6fr]">
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--color-muted)]">Badge overview</p>
            <p className="mt-2 text-lg uppercase">Progression rewards are now part of the mission brief</p>
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              The badge surface highlights what your roster has already earned and what the next milestone should target.
            </p>
          </div>
          <div className="rounded border border-[var(--color-line)] p-4">
            <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--color-muted)]">Current state</p>
            <p className="mt-2 text-2xl uppercase">2 earned</p>
            <p className="mt-2 text-sm text-[var(--color-muted)]">Two badges are already in the ledger; two more are still within reach.</p>
          </div>
        </div>

        <ul className="mt-4 space-y-3">
          {ACHIEVEMENTS.map((achievement) => (
            <li key={achievement.id} className="rounded border border-[var(--color-line)] px-3 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm uppercase">{achievement.name}</p>
                  <p className="mt-1 text-xs text-[var(--color-muted)]">{achievement.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded border border-[var(--color-gold)]/40 px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-[var(--color-gold)]">
                    {achievement.category}
                  </span>
                  <span
                    className={`rounded px-2 py-1 text-[10px] uppercase tracking-[0.14em] ${
                      achievement.earned
                        ? "border border-[var(--color-republic)]/40 bg-[var(--color-republic)]/10 text-[var(--color-republic)]"
                        : "border border-[var(--color-line)] text-[var(--color-muted)]"
                    }`}
                  >
                    {achievement.earned ? "Earned" : "Next up"}
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
