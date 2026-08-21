# BARAS Encounter Parity Implementation

## Scope

SWTOR_Prog remains the authoritative TypeScript parser and analytics service. BARAS is the pinned source for encounter definitions and verified game data. Merlin receives versioned derived summaries and does not execute the BARAS DSL.

The encounter importer is pinned to BARAS commit `69980771505579e894ef13cb3f80b12d0f5ced7a`.

## Phase 1: Action Semantics

- `casts` counts player `AbilityActivate` events.
- `hits` counts landed damage events with a positive raw amount.
- `misses` counts non-landed damage events separately.
- Crits, unique targets, damage, and cast timing remain independent values.
- Opening activations can start a pull, so the first action is not discarded before damage.
- A zero-index metric bucket is created at pull start even when damage begins later.

BARAS does not expose a separate per-ability tick metric. Periodic and channeled damage events are represented as hits. SWTOR_Prog does not invent a tick heuristic.

## Phase 2: Typed Triggers

The ID-first trigger model supports:

- combat start/end
- ability casts
- effect apply/remove and charge changes
- damage, healing, mitigation, and threat events
- boss HP thresholds
- NPC appearance and entity death
- target changes and current-target resolution
- phase, counter, and timer events
- time thresholds and `any_of` composites
- source/target entity and position constraints

Selectors with IDs use the ID authoritatively. Names are fallback selectors only when no ID exists in the source definition.

## Phase 3: Unified Encounter Runtime

`EncounterRuntime` owns encounter-scoped state:

- current and previous phase IDs
- repeatable phase segments
- counters and tracked effect stacks
- timer start/cancel/expiration feedback
- active effects and charge changes
- shields and absorbed damage
- current targets and entity positions
- challenge values
- victory/reset terminal state

Events observed before encounter resolution are replayed once after an authoritative NPC-ID match is available.

## Phase 4: Generated Encounter Definitions

`tools/import-baras-encounters.mjs` parses BARAS TOML with `smol-toml` and generates `packages/game-data/src/generated/baras-encounters.ts`.

Current generated coverage:

- 54 encounter definition files
- 239 encounters
- operations, flashpoints, and other/lair content
- phases, counters, timers, shields, challenges, and victory triggers

The importer fails on unknown trigger, condition, or entity-filter kinds so upstream DSL changes cannot silently degrade behavior.

Regenerate with:

```powershell
corepack pnpm install
node tools/import-baras-encounters.mjs
```

Set `BARAS_REF` to test a different BARAS commit before deliberately updating the default pin.

## Phase 5: Mechanics And Challenges

- Explicit phase end triggers feed phase-entered/ended events back into the runtime.
- Timer lifecycle events can drive counters, phases, and chained timers.
- Difficulty, group-size, phase, and declarative conditions gate timers and phases.
- Shield definitions select difficulty/group HP and retain remaining absorption.
- Challenge metrics support damage, healing, effective healing, received metrics, ability/effect counts, peak effect-stack windows, absorbed damage, and interrupts.
- Challenge conditions support phase, source, target, ability/effect ID, counter, and boss-HP scopes.
- Repeated phase and scoped-condition durations are used for per-second challenge values.

## Phase 6: Full Analytics

Ability summaries retain:

- full-group totals
- per-player totals and cast intervals
- per-target entity totals
- per-phase-segment totals

Player metrics include actions, APM, on/off-GCD actions, interrupts, outgoing damage/heal crit rates, incoming attacks, defenses, shield rolls, absorption, damage/healing/threat totals, and rates. Repeated phases use separate metric segments rather than merging by phase order.

## Phase 7: Persistence And UI

The SWTOR wire contract and Merlin ingest schema carry additive, backward-compatible fields for:

- ability breakdowns
- challenge summaries
- timer lifecycle events
- effect windows
- shield windows
- action/APM and defensive metrics

Merlin preserves old reports with optional schema fields and renders misses, targets, crits, and encounter challenge leaders.

## Phase 8: Acceptance Gates

Required checks for future changes:

```powershell
corepack pnpm test
npm exec -- tsc --noEmit -p packages/game-data/tsconfig.json
npm exec -- tsc --noEmit -p packages/analytics/tsconfig.json
npm exec -- vitest run packages/analytics/test/corpus.test.ts
node tools/import-baras-encounters.mjs
```

Merlin must pass its full Vitest suite, TypeScript check, and production build. Desktop changes must produce the Windows ZIP, installer, and portable package.