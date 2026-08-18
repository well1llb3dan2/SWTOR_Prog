# SWTOR Operations & Live Analytics Platform

A real-time combat analytics, raid progression, and group management platform for *Star Wars: The Old Republic*. A desktop client tails the game's combat log and streams it to a Node.js realtime API, which computes live metrics, persists reports to MongoDB, serves a Next.js web portal, and drives a Discord bot for signups and progression feeds.

Each milestone below is a high-level overview. Implementation details are resolved as each milestone is built.

---

## Log Format

SWTOR 7.0 combat logs use the shape:

`[HH:MM:SS.mmm] [source] [target] [ability] [category {id}: effect {id}] (value) <threat>`

Characteristics that drive the parser design:

- Lines carry a time but no date. The date comes from the filename, `combat_YYYY-MM-DD_HH_MM_SS_uuuuuu.txt`, and a running log crossing midnight must roll the date forward.
- Players appear as `@Name#PlayerId|(x,y,z,facing)|(hp/maxHp)`; NPCs as `Name {npcId}:instanceId|(pos)|(hp/max)`. A target of `[=]` means self; `[]` means the slot is empty.
- Effect names can themselves contain parentheses (`Burning (Overload Saber) {…}`), and position tuples contain commas and negative numbers. Slot splitting must be bracket-aware rather than pattern-based.
- Categories observed: `Event`, `ApplyEffect`, `RemoveEffect`, `ModifyCharges`, `Spend`, `Restore`, `AreaEntered`, `DisciplineChanged`.
- Damage and healing values encode critical hits, a secondary magnitude, damage type, and avoidance results in a single parenthesised group.
- `AreaEntered` carries zone, group size, and difficulty — e.g. `Darvannis {137438993037} 8 Player Veteran {836045448953652}`. Solo and open-world entries omit the size and difficulty segment.
- A burst of `DisciplineChanged` lines fires at pull start, one per raid member with their class and spec. This is the authoritative source for raid composition and role assignment.
- Files are UTF-8 and character names routinely contain non-ASCII glyphs.

**Test corpus** (`samples/combat-logs/`)

- `combat_2026-08-15_20_21_10_493955.txt` — solo Sentinel/Watchman against an Operations Training Dummy. A clean, single-target baseline for validating damage math.
- `combat_2026-08-15_22_48_11_971003.txt` — 8-player Veteran Scum and Villainy (Darvannis) with Dash'Roode at 21.8M HP, adds at 351k, and multiple player deaths. The primary integration fixture.
- `combat_2026-08-13_00_27_55_882410.txt` — additional sample.

---

## Stack

| Layer | Technology |
|---|---|
| Monorepo | pnpm workspaces + Turborepo |
| Desktop client | Electron + TypeScript |
| Backend | Fastify + Socket.IO |
| Database | MongoDB Atlas |
| Web portal | Next.js 15 App Router + Tailwind |
| Discord bot | Discord.js v14 |
| Queue | Redis + BullMQ (introduced when ingest volume requires it) |

The desktop client is TypeScript so the parser package runs unmodified in the Electron main process and shares types with the portal and API. Node opens files with shared read access on Windows by default, so tailing an active log requires no special file-handle work.

---

## Repository Layout

- `samples/combat-logs/` — committed log fixtures
- `packages/shared` — types, zod wire schemas, SWTOR ID constants, discipline→role table
- `packages/parser` — log tokenizer, pure functions, zero I/O
- `packages/analytics` — fight splitting and metric aggregation, pure functions
- `packages/db` — Mongo models, indexes, bucket read/write helpers
- `packages/game-data` — boss, zone, difficulty and ability master tables
- `apps/api` — Fastify + Socket.IO server
- `apps/desktop` — Electron log streamer
- `apps/web` — Next.js portal
- `apps/bot` — Discord bot
- Root — `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json`, ESLint, Prettier, Vitest

---

## Milestones

### M0 — Foundation
Monorepo scaffold, Turborepo task pipelines, strict shared TypeScript config with `@swtor/*` path aliases, Vitest, linting, and CI. Blocks everything downstream.

### M1 — Shared Contracts
The vocabulary the whole system speaks: a discriminated-union `CombatEvent` type, `Actor`, `Zone`, `Difficulty` and `GroupSize` models, SWTOR effect and event ID constants, zod schemas for every WebSocket and REST payload, and a discipline→role table covering all 24 disciplines. Blocks M2 through M10.

### M2 — Parser
Converts raw log text into typed events. A bracket-aware scanner walks the seven positional slots, per-slot parsers handle actors, abilities, effects, values and threat, and a stateful wrapper supplies date context, midnight rollover and self-target resolution. Unrecognised lines degrade to an `UnknownEvent` carrying the raw text rather than throwing. Built test-first against golden snapshots of the sample corpus. This is the highest-risk component in the project — everything downstream inherits its correctness.

### M3 — Analytics Engine
Converts event streams into fights and numbers. Pull detection from combat-enter and combat-exit events plus an idle timeout, zone and difficulty tracking, roster extraction from the discipline burst, boss identification, kill and wipe classification, and a 10-second bucket ring producing DPS, effective HPS, DTPS, overheal percentage and ability uptime. The bucket ring is shaped so its output doubles as the stored event documents in M4. Pure functions, so identical code runs live on the server and offline in tests.

### M4 — Persistence
MongoDB Atlas with a hybrid schema: `Report` for fight metadata and roster, `FightEventBucket` for 10-second event chunks keyed by report, fight and bucket index, and `OperationEvent` for the raid calendar. Covers index design, retention policy for raw events, and an offline importer that turns a log file into a stored report without involving the desktop client.

### M5 — Backend API
Fastify HTTP alongside Socket.IO. An `/ingest` namespace authenticates desktop clients, a `/live` namespace rooms browsers by session. A session manager holds one analytics engine per connected client and broadcasts meter snapshots at 1 Hz. Every inbound batch is schema-validated and rate-limited. Fight completion writes reports through to Mongo. REST endpoints cover report listing, report detail and fight breakdowns.

### M6 — Desktop Client
An Electron app that tails the SWTOR combat log directory. Incremental reads from a tracked byte offset with polling, partial-line buffering, and batching on a one-second tick or fifty events. Authenticated Socket.IO connection with exponential-backoff reconnect and a bounded offline queue. A replay mode feeds a sample log at variable speed and serves as the primary development and test harness for the whole pipeline. The UI stays minimal: directory picker, connection status, event rate, current zone, and a link to the live report.

### M7 — Web Portal, Live
The payoff screen. A live session route subscribes to the realtime namespace and renders sortable DPS, HPS and DTPS meters, role-coloured player rows, a fight timer, boss health bar, and pull history for the session. Rendering is snapshot-driven at 1 Hz rather than per-event.

### M8 — Web Portal, Historical Reports
Post-mortem analysis. Report summaries with raid composition, fight list, durations and phase breakdown. Sortable combat tables for casts, uptime, buffs, debuffs and threat. A death log audit presenting a millisecond timeline of incoming damage, healing received, and defensive cooldown availability in the seconds preceding each death. Reports are shareable by URL.

### M9 — Accounts & Linking
Discord OAuth on the portal, character profiles owned by a user, and a `/link` command binding a Discord identity to a portal profile. Desktop clients receive per-user ingest tokens. Guild membership and role gating, with moderation views restricted to moderators.

### M10 — Discord Bot
Interactive signup embeds with tank, healer, DPS and bench buttons plus a character select menu, writing directly to the shared operation model and re-rendering the embed in place. Two-way state synchronisation with the portal via stored channel and message identifiers. Automated progression feeds post rich kill summaries linking to the full web report.

### M11 — Calendar & Roster Hub
Operation scheduling on the portal with live slot tracking by role, recurring events, Eastern-time scheduling, a roster builder, and attendance history. Shares the operation model with M10 so Discord and the web portal remain in lockstep.

### M12 — Hardening & Deployment
Render hosting for the API and bot, hosted builds for the portal, and signed auto-updating desktop releases. Redis and BullMQ are introduced here if ingest volume warrants a durable buffer. Observability, rate-limit tuning, ingest backpressure, and a load test replaying several concurrent raids.

---

## Dependency Order

- M0 → M1 → M2 → M3
- M3 → M4 and M5
- M5 → M6 and M7, which run in parallel
- M4 + M5 → M8
- M1 → M9 → M10 → M11
- All → M12

M6/M7 and M9/M10 are the two natural parallel tracks once the analytics engine is stable.

---

## Decisions To Make

1. **Secondary magnitude in damage values.** Damage entries carry a second number alongside the applied value. It reads plausibly as an absorbed or shielded portion, a pre-mitigation expected value, or the post-mitigation applied value. This determines whether every metric in the platform is accurate. Resolve empirically during M2 by summing the Training Dummy pull under each interpretation and reconciling against the dummy's health delta, ideally cross-checked against an established parser's figure for the same pull.

2. **Fight boundary rule.** Resolved during M3. The game only logs `EnterCombat`/`ExitCombat` for the player whose client wrote the file, so no rule based on the group's combat state is implementable. Boundaries are driven by combat activity with an 8s idle timeout; the local player's exit is a hint that shortens the timeout to 2.5s and is cancelled by any further raid activity.

3. **Boss identification.** A highest-max-health NPC heuristic requires no data and holds on the sample corpus. A curated boss ID table is precise but is substantial manual data entry across every operation and difficulty. Recommendation: heuristic through M7, curated table built incrementally once M8 requires exact encounter names.

4. **Event retention.** Raw event buckets dominate storage. Options are indefinite retention, time-based expiry with computed summaries preserved, or per-guild tiering. Settle before M4 index design is finalised.

5. **Tenancy.** Whether the data model supports multiple guilds from the outset materially shapes M4 and M9, and retrofitting it later requires migrating the largest collection in the system.
