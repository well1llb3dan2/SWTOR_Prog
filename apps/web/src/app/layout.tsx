import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Infamous — Combat Analytics",
  description: "Live combat meters and raid progression for Star Wars: The Old Republic",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Loaded via link rather than next/font so a build never needs network access. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=Noto+Sans:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="blueprint">
        <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8">
          <header className="mb-6 rounded-md border border-[var(--color-line)] bg-black/25 px-5 py-4 backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--color-gold)]">Republic command</p>
                <h1 className="mt-1 text-xl uppercase">Infamous operations network</h1>
              </div>
              <div className="flex items-center gap-2 rounded border border-[var(--color-republic)]/40 bg-[var(--color-republic)]/10 px-3 py-2 text-xs uppercase tracking-[0.14em] text-[var(--color-republic)]">
                <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-republic)]" />
                Live telemetry online
              </div>
            </div>
          </header>
          <div className="flex-1">{children}</div>
        </div>
      </body>
    </html>
  );
}
