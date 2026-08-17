"use client";

import Link from "next/link";
import { useState } from "react";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/live", label: "Live" },
  { href: "/operations", label: "Operations" },
  { href: "/progression", label: "Progression" },
  { href: "/achievements", label: "Achievements" },
  { href: "/analytics", label: "Analytics" },
  { href: "/calendar", label: "Calendar" },
  { href: "/reports", label: "Reports" },
  { href: "/me", label: "Profile" },
];

export function SiteHeader() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="mb-6 rounded-md border border-[var(--color-line)] bg-black/25 px-5 py-4 backdrop-blur">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--color-gold)]">Republic command</p>
          <h1 className="mt-1 text-xl uppercase">Infamous operations network</h1>
        </div>

        <div className="flex items-center gap-2">
          <nav className="hidden md:flex flex-wrap items-center gap-2 rounded border border-[var(--color-line)] bg-black/20 px-2 py-2">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded px-2.5 py-1.5 text-[11px] uppercase tracking-[0.14em] text-[var(--color-muted)] transition hover:bg-[var(--color-republic)]/10 hover:text-[var(--color-republic)]"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <button
            type="button"
            onClick={() => setIsOpen((value) => !value)}
            className="inline-flex items-center gap-2 rounded border border-[var(--color-republic)]/40 bg-[var(--color-republic)]/10 px-3 py-2 text-xs uppercase tracking-[0.14em] text-[var(--color-republic)] md:hidden"
            aria-expanded={isOpen}
            aria-label="Toggle portal navigation"
          >
            <span className="text-sm">☰</span>
            Menu
          </button>

          <div className="hidden items-center gap-2 rounded border border-[var(--color-republic)]/40 bg-[var(--color-republic)]/10 px-3 py-2 text-xs uppercase tracking-[0.14em] text-[var(--color-republic)] md:flex">
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-republic)]" />
            Live telemetry online
          </div>
        </div>
      </div>

      {isOpen ? (
        <nav className="mt-3 rounded border border-[var(--color-line)] bg-black/20 p-3 md:hidden" aria-label="Mobile portal navigation">
          <ul className="grid gap-2 sm:grid-cols-2">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className="block rounded border border-[var(--color-line)] px-3 py-2 text-sm uppercase tracking-[0.12em] text-[var(--color-muted)] transition hover:border-[var(--color-republic)]/40 hover:text-[var(--color-republic)]"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
