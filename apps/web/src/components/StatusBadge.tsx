import type { LiveStatus } from "@/lib/useLiveSession";

const LABELS: Record<LiveStatus, string> = {
  connecting: "Connecting",
  live: "In combat",
  waiting: "Out of combat",
  disconnected: "Disconnected",
  error: "Error",
};

const COLOURS: Record<LiveStatus, string> = {
  connecting: "#d4af37",
  live: "#4ade80",
  waiting: "#7b968a",
  disconnected: "#f87171",
  error: "#f87171",
};

export function StatusBadge({ status }: { status: LiveStatus }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.15em] text-[var(--color-muted)]">
      <span
        className="h-2 w-2 rounded-full"
        style={{
          background: COLOURS[status],
          boxShadow: status === "live" ? `0 0 8px ${COLOURS[status]}` : "none",
        }}
        aria-hidden
      />
      {LABELS[status]}
    </span>
  );
}
