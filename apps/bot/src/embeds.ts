import type { Announcement } from "./announce.js";

export interface EmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

export interface Embed {
  title: string;
  url?: string;
  description?: string;
  color: number;
  fields: EmbedField[];
  footer?: { text: string };
  timestamp?: string;
}

const COLOURS = {
  firstKill: 0xd4af37,
  kill: 0x4ade80,
  closeWipe: 0xf87171,
} as const;

function duration(ms: number): string {
  const total = Math.floor(ms / 1000);
  return `${Math.floor(total / 60)}:${(total % 60).toString().padStart(2, "0")}`;
}

function compact(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}m`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return Math.round(value).toString();
}

function composition(announcement: Announcement): string {
  const counts = { tank: 0, healer: 0, dps: 0 };
  const members = announcement.sourcePull?.roster ?? announcement.fight.players;
  for (const member of members) {
    if (member.role !== null) counts[member.role] += 1;
  }
  return `${counts.tank} tank · ${counts.healer} heal · ${counts.dps} dps`;
}

function topDamage(announcement: Announcement, limit = 3): string {
  const rows = (announcement.sourcePull?.actors ?? announcement.fight.players)
    .filter((actor) => actor.damage > 0)
    .sort((a, b) => b.dps - a.dps)
    .slice(0, limit);

  if (rows.length === 0) return "—";
  return rows.map((a, i) => `${i + 1}. ${a.name} — ${compact(a.dps)} dps`).join("\n");
}

export interface EmbedContext {
  webUrl: string;
}

/** Builds the Discord payload. Pure, so the wording is unit tested. */
export function buildAnnouncementEmbed(announcement: Announcement, context: EmbedContext): Embed {
  const { fight, kind } = announcement;
  const encounter = fight.encounter;
  const reportUrl = `${context.webUrl}/reports/${announcement.reportCode}/fights/${announcement.fightId}`;

  const descriptor = [fight.difficulty, fight.groupSize === null ? null : `${fight.groupSize}-player`]
    .filter((part) => part !== null)
    .join(" · ");

  const title =
    kind === "firstKill"
      ? `First kill: ${encounter.encounterName}`
      : kind === "kill"
        ? `${encounter.encounterName} defeated`
        : `So close: ${encounter.encounterName}`;

  const fields: EmbedField[] = [
    { name: "Operation", value: encounter.operationName, inline: true },
    { name: "Mode", value: descriptor.length > 0 ? descriptor : "Unknown", inline: true },
    { name: "Duration", value: duration(fight.durationMs), inline: true },
  ];

  if (kind === "closeWipe") {
    const boss = fight.bossEntities[0];
    const remaining = boss?.maxHp && boss.finalHp !== null ? (boss.finalHp / boss.maxHp) * 100 : null;
    fields.push({
      name: "Boss remaining",
      value: remaining === null ? "—" : `${remaining.toFixed(1)}%`,
      inline: true,
    });
    if (announcement.previousBestHpPercent !== null) {
      fields.push({
        name: "Previous best",
        value: `${announcement.previousBestHpPercent.toFixed(1)}%`,
        inline: true,
      });
    }
  }

  fields.push(
    { name: "Attempt", value: announcement.attempts.toString(), inline: true },
    { name: "Deaths", value: fight.deaths.length.toString(), inline: true },
    { name: "Composition", value: composition(announcement), inline: true },
    { name: "Top damage", value: topDamage(announcement), inline: false },
  );

  const description =
    kind === "firstKill"
      ? `Down for the first time after ${announcement.attempts} attempt${
          announcement.attempts === 1 ? "" : "s"
        }.`
      : kind === "closeWipe"
        ? "A new best attempt — the next one is the one."
        : undefined;

  return {
    title,
    url: reportUrl,
    ...(description === undefined ? {} : { description }),
    color: COLOURS[kind],
    fields,
    footer: { text: `Infamous · fight ${fight.index}` },
    timestamp: new Date(fight.endedAt).toISOString(),
  };
}
