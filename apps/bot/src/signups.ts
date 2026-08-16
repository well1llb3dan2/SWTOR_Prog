import { describeOpenSlots, type RosterSummary, type SignupStatus } from "@swtor/shared";
import type { Embed, EmbedField } from "./embeds.js";

export interface OperationView {
  code: string;
  title: string;
  description: string | null;
  scheduledFor: string;
  difficulty: string | null;
  groupSize: number | null;
  cancelledAt: string | null;
  roster: RosterSummary;
  status: string;
}

export const SIGNUP_STATUSES: SignupStatus[] = ["tank", "healer", "dps", "bench", "declined"];

const LABELS: Record<SignupStatus, string> = {
  tank: "Tank",
  healer: "Healer",
  dps: "DPS",
  bench: "Bench",
  declined: "Can't make it",
};

/** `signup:<code>:<status>` keeps the button self-describing across restarts. */
export function signupCustomId(code: string, status: SignupStatus): string {
  return `signup:${code}:${status}`;
}

export function parseSignupCustomId(
  customId: string,
): { code: string; status: SignupStatus } | null {
  const [prefix, code, status] = customId.split(":");
  if (prefix !== "signup" || code === undefined || status === undefined) return null;
  if (!SIGNUP_STATUSES.includes(status as SignupStatus)) return null;
  return { code, status: status as SignupStatus };
}

function names(signups: { displayName: string; characterName: string | null }[]): string {
  if (signups.length === 0) return "—";
  return signups
    .map((s) =>
      s.characterName === null ? s.displayName : `${s.displayName} (${s.characterName})`,
    )
    .join("\n");
}

/**
 * Renders the signup post.
 *
 * Discord timestamps are used rather than a formatted string so every raider
 * sees the time in their own zone, which removes the usual "is that server
 * time?" confusion entirely.
 */
export function buildSignupEmbed(operation: OperationView): Embed {
  const { roster } = operation;
  const unix = Math.floor(new Date(operation.scheduledFor).getTime() / 1000);

  const descriptor = [
    operation.difficulty,
    operation.groupSize === null ? null : `${operation.groupSize}-player`,
  ]
    .filter((part) => part !== null)
    .join(" · ");

  const fields: EmbedField[] = [
    {
      name: `Tanks ${roster.tanks.confirmed.length}/${roster.tanks.limit}`,
      value: names(roster.tanks.confirmed),
      inline: true,
    },
    {
      name: `Healers ${roster.healers.confirmed.length}/${roster.healers.limit}`,
      value: names(roster.healers.confirmed),
      inline: true,
    },
    {
      name: `DPS ${roster.dps.confirmed.length}/${roster.dps.limit}`,
      value: names(roster.dps.confirmed),
      inline: true,
    },
  ];

  const waitlisted = [
    ...roster.tanks.waitlisted,
    ...roster.healers.waitlisted,
    ...roster.dps.waitlisted,
  ];
  if (waitlisted.length > 0) {
    fields.push({ name: "Waitlist", value: names(waitlisted), inline: false });
  }
  if (roster.bench.length > 0) {
    fields.push({ name: "Bench", value: names(roster.bench), inline: true });
  }
  if (roster.declined.length > 0) {
    fields.push({ name: "Unavailable", value: names(roster.declined), inline: true });
  }

  const cancelled = operation.cancelledAt !== null;
  const description = [
    cancelled ? "**Cancelled**" : `<t:${unix}:F> · <t:${unix}:R>`,
    descriptor.length > 0 ? descriptor : null,
    operation.description,
  ]
    .filter((part) => part !== null && part.length > 0)
    .join("\n");

  return {
    title: operation.title,
    description,
    color: cancelled ? 0x7b968a : roster.isFull ? 0x4ade80 : 0xd4af37,
    fields,
    footer: { text: cancelled ? "Cancelled" : describeOpenSlots(roster) },
  };
}

export interface ButtonSpec {
  type: 2;
  style: 1 | 2 | 3 | 4;
  label: string;
  custom_id: string;
  disabled?: boolean;
}

/** Action rows for the signup post; disabled once the event is cancelled. */
export function buildSignupComponents(operation: OperationView) {
  const disabled = operation.cancelledAt !== null;
  const styles: Record<SignupStatus, 1 | 2 | 3 | 4> = {
    tank: 1,
    healer: 3,
    dps: 4,
    bench: 2,
    declined: 2,
  };

  const buttons: ButtonSpec[] = SIGNUP_STATUSES.map((status) => ({
    type: 2,
    style: styles[status],
    label: LABELS[status],
    custom_id: signupCustomId(operation.code, status),
    ...(disabled ? { disabled: true } : {}),
  }));

  // Discord allows at most five buttons per row.
  return [
    { type: 1 as const, components: buttons.slice(0, 3) },
    { type: 1 as const, components: buttons.slice(3) },
  ];
}
