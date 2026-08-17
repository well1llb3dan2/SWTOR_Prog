"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "@/lib/apiBase";

interface AccountUser {
  discordId: string;
  isModerator: boolean;
  characters: Array<{
    playerId: string;
    name: string;
    role: "tank" | "healer" | "dps" | null;
    discipline: string | null;
  }>;
  signupPreferences?: {
    preferredRole: "tank" | "healer" | "dps" | "bench" | "declined" | null;
  } | null;
}

const API_URL = API_BASE_URL;

type SignupStatus = "tank" | "healer" | "dps" | "bench" | "declined";

interface Signup {
  discordUserId: string;
  displayName: string;
  characterName: string | null;
  status: SignupStatus;
}

interface RosterGroup {
  confirmed: Signup[];
  waitlisted: Signup[];
  limit: number;
}

interface OperationEvent {
  code: string;
  title: string;
  description: string | null;
  scheduledFor: string;
  difficulty: string | null;
  groupSize: number | null;
  cancelledAt: string | null;
  operationId: string | null;
  encounterId: string | null;
  status: string;
  signups: Signup[];
  roster: {
    tanks: RosterGroup;
    healers: RosterGroup;
    dps: RosterGroup;
    bench: Signup[];
    declined: Signup[];
    isFull: boolean;
  };
}

interface CatalogOperation {
  id: string;
  name: string;
  location: string;
  difficulties: string[];
  groupSizes: number[];
  zoneNames: string[];
}

interface CatalogEncounter {
  id: string;
  name: string;
  operationId: string;
  bossNames: string[];
}

interface CatalogData {
  operations: CatalogOperation[];
  encounters: CatalogEncounter[];
}

const send = (path: string, init: RequestInit = {}) =>
  fetch(`${API_URL}${path}`, {
    credentials: "include",
    headers: { "content-type": "application/json" },
    ...init,
  });

const CHOICES: { status: SignupStatus; label: string }[] = [
  { status: "tank", label: "Tank" },
  { status: "healer", label: "Healer" },
  { status: "dps", label: "DPS" },
  { status: "bench", label: "Bench" },
  { status: "declined", label: "Can't make it" },
];

function RolePill({ title, group }: { title: string; group: RosterGroup }) {
  return (
    <div className="rounded border border-[var(--color-line)] bg-black/20 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--color-muted)]">{title}</p>
        <span className="text-xs text-[var(--color-gold)]">{group.confirmed.length}/{group.limit}</span>
      </div>
      <ul className="mt-2 space-y-1.5 text-sm">
        {group.confirmed.map((signup) => (
          <li key={signup.discordUserId} className="truncate">
            {signup.characterName ?? signup.displayName}
          </li>
        ))}
        {group.waitlisted.map((signup) => (
          <li key={signup.discordUserId} className="truncate text-[var(--color-muted)]">
            {signup.characterName ?? signup.displayName} (waitlist)
          </li>
        ))}
        {group.confirmed.length === 0 && group.waitlisted.length === 0 ? (
          <li className="text-[var(--color-muted)]">Open</li>
        ) : null}
      </ul>
    </div>
  );
}

function labelFromStatus(status: SignupStatus) {
  return CHOICES.find((choice) => choice.status === status)?.label ?? status;
}

export default function OperationsPage() {
  const [events, setEvents] = useState<OperationEvent[]>([]);
  const [me, setMe] = useState<AccountUser | null>(null);
  const [catalog, setCatalog] = useState<CatalogData>({ operations: [], encounters: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCharacter, setSelectedCharacter] = useState<string>("");
  const [draft, setDraft] = useState({
    title: "",
    description: "",
    scheduledFor: "",
    difficulty: "Veteran" as "Story" | "Veteran" | "Master" | "",
    groupSize: "8" as "4" | "8" | "16",
    operationId: "",
    encounterId: "",
    tanks: "2",
    healers: "2",
    dps: "4",
  });

  const refresh = useCallback(async () => {
    try {
      const [operations, session, encounters] = await Promise.all([
        send("/api/operations"),
        send("/api/me"),
        send("/api/encounters"),
      ]);
      if (!operations.ok) throw new Error(`API returned ${operations.status}`);
      const account = ((await session.json()) as { user: AccountUser | null }).user;
      const registry = encounters.ok ? ((await encounters.json()) as CatalogData) : { operations: [], encounters: [] };
      setEvents((await operations.json()) as OperationEvent[]);
      setMe(account);
      setCatalog(registry);

      if (account?.characters && account.characters.length > 0) {
        const preferred = account.characters.find((character) => character.playerId === selectedCharacter) ?? account.characters[0] ?? null;
        setSelectedCharacter(preferred?.playerId ?? "");
      } else {
        setSelectedCharacter("");
      }
      setError(null);
    } catch {
      setError("Could not reach the API");
    } finally {
      setLoading(false);
    }
  }, [selectedCharacter]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const selectedOperation = useMemo(() => {
    if (!draft.operationId) return null;
    return catalog.operations.find((operation) => operation.id === draft.operationId) ?? null;
  }, [catalog.operations, draft.operationId]);

  const selectedEncounter = useMemo(() => {
    if (!draft.encounterId) return null;
    return catalog.encounters.find((encounter) => encounter.id === draft.encounterId) ?? null;
  }, [catalog.encounters, draft.encounterId]);

  const operationEncounters = useMemo(() => {
    if (!draft.operationId) return [];
    return catalog.encounters.filter((encounter) => encounter.operationId === draft.operationId);
  }, [catalog.encounters, draft.operationId]);

  const selectedCharacterData = useMemo(() => {
    if (!me?.characters || me.characters.length === 0) return null;
    return me.characters.find((character) => character.playerId === selectedCharacter) ?? me.characters[0] ?? null;
  }, [me?.characters, selectedCharacter]);

  async function signup(code: string, status: SignupStatus) {
    const response = await send(`/api/operations/${code}/signup`, {
      method: "POST",
      body: JSON.stringify({
        status,
        characterName: selectedCharacterData?.name ?? null,
      }),
    });
    if (!response.ok) {
      setError(((await response.json()) as { error: string }).error);
    }
    await refresh();
  }

  async function createOperation(event: React.FormEvent) {
    event.preventDefault();
    if (me?.isModerator !== true) {
      setError("Officer access is required to schedule operations.");
      return;
    }

    const payload: Record<string, unknown> = {
      description: draft.description.trim() || null,
      scheduledFor: new Date(draft.scheduledFor).toISOString(),
      difficulty: draft.difficulty || null,
      groupSize: Number(draft.groupSize),
      limits: {
        tanks: Number(draft.tanks),
        healers: Number(draft.healers),
        dps: Number(draft.dps),
      },
    };

    if (draft.title.trim()) payload.title = draft.title.trim();
    if (draft.operationId) payload.operationId = draft.operationId;
    if (draft.encounterId) payload.encounterId = draft.encounterId;

    const response = await send("/api/operations", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      setError(((await response.json()) as { error: string }).error);
      return;
    }

    setDraft({
      title: "",
      description: "",
      scheduledFor: "",
      difficulty: "Veteran",
      groupSize: "8",
      operationId: "",
      encounterId: "",
      tanks: "2",
      healers: "2",
      dps: "4",
    });
    await refresh();
  }

  async function cancelOperation(code: string) {
    if (me?.isModerator !== true) return;
    const response = await send(`/api/operations/${code}`, { method: "DELETE" });
    if (!response.ok) {
      setError(((await response.json()) as { error: string }).error);
      return;
    }
    await refresh();
  }

  const suggestedStatus = selectedCharacterData?.role ?? me?.signupPreferences?.preferredRole ?? null;

  return (
    <main className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/" className="text-xs uppercase tracking-[0.3em] text-[var(--color-gold)] hover:underline">
            Infamous
          </Link>
          <h1 className="mt-1 text-2xl uppercase">Operations</h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            The operations view now blends roster awareness with operation catalog data, encounter intel, and character-based role hints.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/operations/builder" className="rounded border border-[var(--color-republic)] px-3 py-2 text-xs uppercase tracking-[0.12em] text-[var(--color-republic)]">
            Open builder
          </Link>
          <Link href="/calendar" className="rounded border border-[var(--color-line)] px-3 py-2 text-xs uppercase tracking-[0.12em] text-[var(--color-muted)]">
            Calendar
          </Link>
        </div>
      </header>

      {error !== null ? <p className="panel rounded-md px-4 py-3 text-sm text-red-300">{error}</p> : null}

      {me?.isModerator ? (
        <section className="panel rounded-md p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--color-gold)]">Officer command desk</p>
              <h2 className="mt-1 text-lg uppercase">Schedule the next operation</h2>
              <p className="mt-2 text-sm text-[var(--color-muted)]">Create a new event from the shared SWTOR operation catalog, pull in the encounter bosses, and set the role limits.</p>
            </div>
          </div>

          <form onSubmit={(event) => void createOperation(event)} className="mt-4 grid gap-3 lg:grid-cols-2">
            <select
              value={draft.operationId}
              onChange={(event) => {
                const nextOperationId = event.target.value;
                const operation = catalog.operations.find((candidate) => candidate.id === nextOperationId) ?? null;
                const nextDifficulty = (operation?.difficulties[0] as "Story" | "Veteran" | "Master" | "") ?? "";
                const nextGroupSize = (operation?.groupSizes[0]?.toString() as "4" | "8" | "16" | undefined) ?? "8";
                setDraft((current) => ({
                  ...current,
                  operationId: nextOperationId,
                  encounterId: "",
                  difficulty: current.difficulty && operation?.difficulties.includes(current.difficulty) ? current.difficulty : nextDifficulty,
                  groupSize: current.groupSize && operation?.groupSizes.includes(Number(current.groupSize)) ? current.groupSize : nextGroupSize,
                  title: current.title.trim().length > 0 ? current.title : operation?.name ?? current.title,
                }));
              }}
              className="rounded border border-[var(--color-line)] bg-black/30 px-3 py-2 text-sm"
            >
              <option value="">Select an operation</option>
              {catalog.operations.map((operation) => (
                <option key={operation.id} value={operation.id}>
                  {operation.name}
                </option>
              ))}
            </select>
            <input
              required
              type="datetime-local"
              value={draft.scheduledFor}
              onChange={(event) => setDraft((current) => ({ ...current, scheduledFor: event.target.value }))}
              className="rounded border border-[var(--color-line)] bg-black/30 px-3 py-2 text-sm"
            />
            <input
              value={draft.title}
              onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
              placeholder="Optional title override"
              className="rounded border border-[var(--color-line)] bg-black/30 px-3 py-2 text-sm"
            />
            <select
              value={draft.encounterId}
              onChange={(event) => {
                const nextEncounterId = event.target.value;
                const encounter = catalog.encounters.find((candidate) => candidate.id === nextEncounterId) ?? null;
                setDraft((current) => ({
                  ...current,
                  encounterId: nextEncounterId,
                  title: current.title.trim().length > 0 && current.title !== selectedOperation?.name
                    ? current.title
                    : `${selectedOperation?.name ?? current.title}${encounter ? ` · ${encounter.name}` : ""}`,
                }));
              }}
              className="rounded border border-[var(--color-line)] bg-black/30 px-3 py-2 text-sm"
              disabled={!draft.operationId}
            >
              <option value="">Select an encounter</option>
              {operationEncounters.map((encounter) => (
                <option key={encounter.id} value={encounter.id}>
                  {encounter.name}
                </option>
              ))}
            </select>
            <textarea
              value={draft.description}
              onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
              placeholder="Mission notes"
              className="rounded border border-[var(--color-line)] bg-black/30 px-3 py-2 text-sm lg:col-span-2"
              rows={3}
            />
            <select
              value={draft.difficulty}
              onChange={(event) => setDraft((current) => ({ ...current, difficulty: event.target.value as "Story" | "Veteran" | "Master" | "" }))}
              className="rounded border border-[var(--color-line)] bg-black/30 px-3 py-2 text-sm"
            >
              <option value="">Difficulty</option>
              {(selectedOperation?.difficulties ?? ["Story", "Veteran", "Master"]).map((difficulty) => (
                <option key={difficulty} value={difficulty}>
                  {difficulty}
                </option>
              ))}
            </select>
            <select
              value={draft.groupSize}
              onChange={(event) => setDraft((current) => ({ ...current, groupSize: event.target.value as "4" | "8" | "16" }))}
              className="rounded border border-[var(--color-line)] bg-black/30 px-3 py-2 text-sm"
            >
              {(selectedOperation?.groupSizes ?? [4, 8, 16]).map((size) => (
                <option key={size} value={size}>
                  {size}-player
                </option>
              ))}
            </select>
            <input
              required
              min="0"
              value={draft.tanks}
              onChange={(event) => setDraft((current) => ({ ...current, tanks: event.target.value }))}
              className="rounded border border-[var(--color-line)] bg-black/30 px-3 py-2 text-sm"
              placeholder="Tanks"
            />
            <input
              required
              min="0"
              value={draft.healers}
              onChange={(event) => setDraft((current) => ({ ...current, healers: event.target.value }))}
              className="rounded border border-[var(--color-line)] bg-black/30 px-3 py-2 text-sm"
              placeholder="Healers"
            />
            <input
              required
              min="0"
              value={draft.dps}
              onChange={(event) => setDraft((current) => ({ ...current, dps: event.target.value }))}
              className="rounded border border-[var(--color-line)] bg-black/30 px-3 py-2 text-sm"
              placeholder="DPS"
            />
            <div className="lg:col-span-2 rounded border border-[var(--color-line)] bg-black/20 p-3 text-sm text-[var(--color-muted)]">
              {selectedOperation ? (
                <p>
                  {selectedOperation.name} · {selectedOperation.location} · supports {selectedOperation.difficulties.join(", ")} · {selectedOperation.groupSizes.join("/" )}-player runs
                </p>
              ) : (
                <p>Select an operation to pull in the canonical SWTOR metadata, such as the dungeon name, supported difficulties, group size, and encounter list.</p>
              )}
              {selectedEncounter ? (
                <p className="mt-2 text-xs uppercase tracking-[0.12em] text-[var(--color-gold)]">
                  Encounter: {selectedEncounter.name} · Bosses: {selectedEncounter.bossNames.join(", ")}
                </p>
              ) : null}
            </div>
            <div className="lg:col-span-2 flex justify-end">
              <button type="submit" className="rounded border border-[var(--color-republic)] bg-[var(--color-republic)]/15 px-4 py-2 text-xs uppercase tracking-[0.12em] text-[var(--color-republic)]">
                Create operation
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="panel rounded-md p-5">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded border border-[var(--color-line)] bg-black/20 p-4">
            <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--color-muted)]">Mission brief</p>
            <p className="mt-2 text-lg uppercase">Coordinate the next push</p>
            <p className="mt-2 text-sm text-[var(--color-muted)]">Use the roster builder to plan your opening comp and keep bench swaps in view.</p>
          </div>
          <div className="rounded border border-[var(--color-line)] bg-black/20 p-4">
            <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--color-muted)]">Roster status</p>
            <p className="mt-2 text-2xl uppercase">{events.length}</p>
            <p className="mt-2 text-sm text-[var(--color-muted)]">Upcoming operations in the portal.</p>
          </div>
          <div className="rounded border border-[var(--color-line)] bg-black/20 p-4">
            <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--color-muted)]">Member response</p>
            <p className="mt-2 text-2xl uppercase">Live</p>
            <p className="mt-2 text-sm text-[var(--color-muted)]">Members can respond directly from the portal or Discord.</p>
          </div>
        </div>
      </section>

      {loading ? (
        <p className="panel rounded-md px-6 py-16 text-center text-sm">Loading…</p>
      ) : events.length === 0 ? (
        <p className="panel rounded-md px-6 py-16 text-center text-sm text-[var(--color-muted)]">
          No operations are scheduled yet.
        </p>
      ) : (
        <ul className="space-y-4">
          {events.map((event) => {
            const mine = event.signups.find((signup) => signup.discordUserId === me?.discordId);
            const eventOperation = catalog.operations.find((operation) => operation.id === event.operationId) ?? null;
            const eventEncounter = catalog.encounters.find((encounter) => encounter.id === event.encounterId) ?? null;
            return (
              <li key={event.code} className="panel rounded-md p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <div>
                    <h2 className="text-lg uppercase">{event.title}</h2>
                    <p className="mt-1 text-sm text-[var(--color-muted)]">
                      {new Date(event.scheduledFor).toLocaleString("en-GB", { timeZone: "America/New_York", dateStyle: "full", timeStyle: "short" })}
                      {event.difficulty === null ? "" : ` · ${event.difficulty}`}
                      {event.groupSize === null ? "" : ` · ${event.groupSize}-player`}
                    </p>
                    {eventOperation ? (
                      <p className="mt-2 text-xs uppercase tracking-[0.12em] text-[var(--color-gold)]">
                        {eventOperation.name} · {eventEncounter?.name ?? "Encounter pending"}
                      </p>
                    ) : null}
                    {eventEncounter ? (
                      <p className="mt-1 text-xs text-[var(--color-muted)]">Bosses: {eventEncounter.bossNames.join(", ")}</p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded border border-[var(--color-gold)]/40 px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-[var(--color-gold)]">
                      {event.status}
                    </span>
                    {me?.isModerator ? (
                      <button
                        onClick={() => void cancelOperation(event.code)}
                        className="rounded border border-red-400/40 px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-red-300"
                      >
                        Cancel
                      </button>
                    ) : null}
                  </div>
                </div>

                {event.description !== null ? <p className="mt-3 text-sm">{event.description}</p> : null}

                <div className="mt-4 grid gap-3 lg:grid-cols-3">
                  <RolePill title="Tanks" group={event.roster.tanks} />
                  <RolePill title="Healers" group={event.roster.healers} />
                  <RolePill title="DPS" group={event.roster.dps} />
                </div>

                {event.roster.bench.length > 0 || event.roster.declined.length > 0 ? (
                  <p className="mt-3 text-xs text-[var(--color-muted)]">
                    {event.roster.bench.length > 0 ? `Bench: ${event.roster.bench.map((signup) => signup.displayName).join(", ")}` : ""}
                    {event.roster.bench.length > 0 && event.roster.declined.length > 0 ? " · " : ""}
                    {event.roster.declined.length > 0 ? `Out: ${event.roster.declined.map((signup) => signup.displayName).join(", ")}` : ""}
                  </p>
                ) : null}

                {me !== null ? (
                  <div className="mt-4 space-y-3">
                    {me.characters.length > 0 ? (
                      <div className="rounded border border-[var(--color-line)] bg-black/20 p-3">
                        <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--color-muted)]">Character for signup</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {me.characters.map((character) => (
                            <button
                              key={character.playerId}
                              type="button"
                              onClick={() => setSelectedCharacter(character.playerId)}
                              className={`rounded border px-2.5 py-1.5 text-xs uppercase tracking-[0.1em] ${
                                selectedCharacter === character.playerId
                                  ? "border-[var(--color-republic)] bg-[var(--color-republic)]/15 text-[var(--color-republic)]"
                                  : "border-[var(--color-line)] text-[var(--color-muted)]"
                              }`}
                            >
                              {character.name}
                              {character.role ? ` · ${character.role}` : ""}
                            </button>
                          ))}
                        </div>
                        {selectedCharacterData ? (
                          <p className="mt-2 text-xs text-[var(--color-muted)]">
                            {selectedCharacterData.discipline ?? "Discipline pending"}
                            {selectedCharacterData.role ? ` · ${selectedCharacterData.role.toUpperCase()}` : ""}
                          </p>
                        ) : null}
                      </div>
                    ) : null}

                    {suggestedStatus ? (
                      <p className="text-xs text-[var(--color-gold)]">
                        Suggested fit: {labelFromStatus(suggestedStatus)}
                        {selectedCharacterData?.discipline ? ` · ${selectedCharacterData.discipline}` : ""}
                      </p>
                    ) : null}

                    <div className="flex flex-wrap gap-2">
                      {CHOICES.map((choice) => (
                        <button
                          key={choice.status}
                          onClick={() => void signup(event.code, choice.status)}
                          className={`rounded border px-3 py-1.5 text-xs uppercase tracking-[0.1em] transition ${
                            mine?.status === choice.status
                              ? "border-[var(--color-republic)] bg-[var(--color-republic)]/15 text-[var(--color-republic)]"
                              : "border-[var(--color-line)] text-[var(--color-muted)] hover:text-[var(--color-ink)]"
                          }`}
                        >
                          {choice.label}
                          {suggestedStatus === choice.status ? " • suggested" : ""}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
