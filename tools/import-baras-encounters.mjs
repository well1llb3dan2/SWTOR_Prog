/* global URL, process, fetch, console */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "smol-toml";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const barasRef = process.env.BARAS_REF ?? "69980771505579e894ef13cb3f80b12d0f5ced7a";
const headers = { "User-Agent": "SWTOR_Prog-BARAS-encounter-import" };
const unknownTriggerTypes = new Set();
const unknownConditionTypes = new Set();
const unknownEntityFilters = new Set();

const array = (value) => Array.isArray(value) ? value : value === undefined || value === null ? [] : [value];
const id = (value) => String(value);
const difficulty = (value) => ({ story: "Story", veteran: "Veteran", master: "Master" })[String(value).toLowerCase()];
const difficulties = (value) => array(value).map(difficulty).filter(Boolean);

function selectors(value, entities, kind) {
  return array(value).flatMap((entry) => {
    if (typeof entry === "number") return [{ id: id(entry) }];
    if (typeof entry === "string") {
      const entity = entities.get(entry.trim().toLowerCase());
      if (kind === "entity" && entity !== undefined) return entity.ids.map((npcId) => ({ id: npcId, name: entry }));
      return [{ name: entry }];
    }
    if (entry && typeof entry === "object" && entry.id !== undefined) return [{ id: id(entry.id), ...(entry.name ? { name: String(entry.name) } : {}) }];
    return [];
  });
}

function entityFilter(value, entities) {
  if (value === undefined || value === null || value === "any") return { kind: "any" };
  if (typeof value === "object" && !Array.isArray(value)) {
    const selected = selectors(value.selector ?? value.selectors, entities, "entity");
    return selected.length > 0 ? { kind: "selector", selectors: selected } : { kind: "any" };
  }
  switch (String(value).toLowerCase()) {
    case "any_player": case "player": return { kind: "player" };
    case "any_player_or_companion": return { kind: "player" };
    case "other_player": case "other_players": return { kind: "otherPlayer" };
    case "any_except_local": return { kind: "notLocal" };
    case "local_player": case "self": return { kind: "localPlayer" };
    case "npc": case "any_npc": return { kind: "npc" };
    case "boss": return { kind: "boss" };
    case "any_add": return { kind: "add" };
    case "current_target": return { kind: "currentTarget" };
    default:
      unknownEntityFilters.add(String(value));
      return { kind: "any" };
  }
}

function positions(value) {
  return array(value).map((entry) => ({
    entity: entry.entity === "target" ? "target" : "source",
    axis: entry.axis,
    operator: entry.op ?? entry.operator,
    value: Number(entry.value),
  }));
}

function filtered(raw, entities) {
  return {
    source: entityFilter(raw.source, entities),
    target: entityFilter(raw.target, entities),
    ...(array(raw.position).length > 0 ? { position: positions(raw.position) } : {}),
  };
}

function trigger(raw, entities) {
  if (!raw || typeof raw !== "object") return undefined;
  const type = String(raw.type ?? "never");
  const common = filtered(raw, entities);
  switch (type) {
    case "combat_start": return { kind: "combatStart" };
    case "combat_end": return { kind: "combatEnd" };
    case "ability_cast": return { kind: "abilityCast", abilities: selectors(raw.abilities, entities, "ability"), ...common };
    case "effect_applied": return { kind: "effectApplied", effects: selectors(raw.effects, entities, "effect"), ...common };
    case "effect_removed": return { kind: "effectRemoved", effects: selectors(raw.effects, entities, "effect"), ...common };
    case "damage_taken": return { kind: "damageTaken", abilities: selectors(raw.abilities, entities, "ability"), mitigation: array(raw.mitigation).map((value) => String(value).toLowerCase()), ...common };
    case "damage_dealt": return { kind: "damageDealt", abilities: selectors(raw.abilities, entities, "ability"), mitigation: array(raw.mitigation).map((value) => String(value).toLowerCase()), ...common };
    case "healing_taken": return { kind: "healingTaken", abilities: selectors(raw.abilities, entities, "ability"), ...common };
    case "healing_dealt": return { kind: "healingDealt", abilities: selectors(raw.abilities, entities, "ability"), ...common };
    case "charges_changed": return { kind: "chargesChanged", effects: selectors(raw.effects, entities, "effect"), ...(raw.direction ? { direction: raw.direction } : {}) };
    case "self_charges_changed": return { kind: "selfChargesChanged", ...(raw.direction ? { direction: raw.direction } : {}) };
    case "threat_modified": return { kind: "threatModified", abilities: selectors(raw.abilities, entities, "ability"), ...(raw.threat === undefined && raw.value === undefined ? {} : { threat: Number(raw.threat ?? raw.value) }), ...common };
    case "boss_hp_below": case "boss_hp_above": return { kind: type === "boss_hp_below" ? "bossHpBelow" : "bossHpAbove", percent: Number(raw.hp_percent), selector: selectors(raw.selector ?? raw.boss, entities, "entity") };
    case "npc_appears": case "entity_death": return { kind: type === "npc_appears" ? "npcAppears" : "entityDeath", selector: selectors(raw.selector, entities, "entity"), ...(array(raw.position).length > 0 ? { position: positions(raw.position) } : {}) };
    case "target_set": return { kind: "targetSet", selector: selectors(raw.selector, entities, "entity"), target: entityFilter(raw.target, entities) };
    case "phase_entered": case "phase_ended": return { kind: type === "phase_entered" ? "phaseEntered" : "phaseEnded", phaseId: String(raw.phase_id) };
    case "any_phase_change": return { kind: "anyPhaseChange" };
    case "counter_reaches": return { kind: "counterReaches", counterId: String(raw.counter_id), value: Number(raw.value) };
    case "counter_changes": return { kind: "counterChanges", counterId: String(raw.counter_id) };
    case "timer_expires": case "timer_started": case "timer_canceled": return { kind: { timer_expires: "timerExpires", timer_started: "timerStarted", timer_canceled: "timerCanceled" }[type], timerId: String(raw.timer_id) };
    case "time_elapsed": return { kind: "timeElapsed", seconds: Number(raw.secs ?? raw.seconds) };
    case "manual": case "never": return { kind: type };
    case "any_of": return { kind: "anyOf", conditions: array(raw.conditions).map((value) => trigger(value, entities)).filter(Boolean) };
    default:
      unknownTriggerTypes.add(type);
      return { kind: "never" };
  }
}

function condition(raw) {
  if (!raw || typeof raw !== "object") return undefined;
  const type = String(raw.type);
  switch (type) {
    case "phase_active": return { kind: "phaseActive", phaseIds: array(raw.phase_ids).map(String) };
    case "counter_compare": return { kind: "counterCompare", counterId: String(raw.counter_id), operator: raw.operator ?? "eq", value: Number(raw.value) };
    case "counter_compare_counter": return { kind: "counterCompareCounter", counterId: String(raw.counter_id), operator: raw.operator ?? "eq", otherCounterId: String(raw.other_counter_id) };
    case "timer_time_remaining": return { kind: "timerTimeRemaining", timerId: String(raw.timer_id), operator: raw.operator ?? "eq", seconds: Number(raw.secs ?? raw.seconds ?? raw.value) };
    case "all_of": case "any_of": return { kind: type === "all_of" ? "allOf" : "anyOf", conditions: array(raw.conditions).map(condition).filter(Boolean) };
    case "not": return { kind: "not", condition: condition(raw.condition) };
    default:
      unknownConditionTypes.add(type);
      return undefined;
  }
}

function conditions(value) {
  return array(value).map(condition).filter(Boolean);
}

function entityMap(boss) {
  const map = new Map();
  for (const entity of array(boss.entities)) {
    const entry = { name: String(entity.name), ids: array(entity.ids).map(id), isBoss: entity.is_boss === true };
    map.set(entry.name.trim().toLowerCase(), entry);
  }
  return map;
}

function parseBoss(boss, source) {
  const entities = entityMap(boss);
  const phases = array(boss.phases).map((phase, index) => ({
    id: String(phase.id || `phase-${index + 1}`),
    order: index + 1,
    name: String(phase.display_text ?? phase.name ?? `Phase ${index + 1}`),
    style: String(phase.name ?? "Phase"),
    trigger: String(phase.start_trigger?.type ?? phase.trigger?.type ?? "combat_start"),
    startTrigger: trigger(phase.start_trigger ?? phase.trigger ?? { type: "combat_start" }, entities),
    ...(phase.end_trigger ? { endTrigger: trigger(phase.end_trigger, entities) } : {}),
    ...(phase.preceded_by ? { precededBy: String(phase.preceded_by) } : {}),
    ...(conditions(phase.conditions).length > 0 ? { conditions: conditions(phase.conditions) } : {}),
    ...(array(phase.resets_counters).length > 0 ? { resetsCounters: array(phase.resets_counters).map(String) } : {}),
    ...(difficulties(phase.difficulties).length > 0 ? { difficulties: difficulties(phase.difficulties) } : {}),
  }));
  const counters = array(boss.counters).filter((counter) => counter.enabled !== false).map((counter) => ({
    id: String(counter.id),
    name: String(counter.name ?? counter.id),
    initialValue: Number(counter.initial_value ?? 0),
    ...(counter.increment_on ? { incrementOn: trigger(counter.increment_on, entities) } : {}),
    ...(counter.decrement_on ? { decrementOn: trigger(counter.decrement_on, entities) } : {}),
    ...(counter.reset_on ? { resetOn: trigger(counter.reset_on, entities) } : {}),
    ...(counter.track_effect_stacks ? { trackEffectStacks: counter.track_effect_stacks } : {}),
  }));
  const timers = array(boss.timer).filter((timer) => timer.enabled !== false && timer.trigger).map((timer) => ({
    id: String(timer.id),
    name: String(timer.name ?? timer.id),
    ...(timer.display_text ? { displayText: String(timer.display_text) } : {}),
    trigger: trigger(timer.trigger, entities),
    ...(timer.cancel_trigger ? { cancelTrigger: trigger(timer.cancel_trigger, entities) } : {}),
    durationMs: Math.round(Number(timer.duration_secs ?? 0) * 1000),
    enabled: timer.enabled !== false,
    isAlert: timer.is_alert === true,
    canRefresh: timer.can_be_refreshed === true,
    conditions: conditions(timer.conditions),
    phaseIds: array(timer.phase ?? timer.phases).map(String),
    difficulties: difficulties(timer.difficulties),
    ...(timer.group_size ? { groupSize: Number(timer.group_size) } : {}),
    ...(timer.show_at_secs !== undefined ? { showAtMs: Math.round(Number(timer.show_at_secs) * 1000) } : {}),
    ...(timer.icon_ability_id !== undefined ? { iconAbilityId: id(timer.icon_ability_id) } : {}),
  }));
  const shields = array(boss.entities).flatMap((entity, entityIndex) => array(entity.shields).map((shield, shieldIndex) => ({
    id: `${boss.id}-shield-${entityIndex + 1}-${shieldIndex + 1}`,
    label: String(shield.label ?? "Shield"),
    targetNpcIds: array(entity.ids).map(id),
    startTrigger: trigger(shield.start_trigger, entities),
    endTrigger: trigger(shield.end_trigger, entities),
    hp: array(shield.hp).map((rule) => ({ total: Number(rule.total), difficulties: difficulties(rule.difficulties), ...(rule.group_size ? { groupSize: Number(rule.group_size) } : {}) })),
  })));
  const rawChallenges = [...array(boss.challenges), ...array(boss.challenge)];
  const challenges = rawChallenges.map((challenge) => ({
    id: String(challenge.id),
    name: String(challenge.name ?? challenge.id),
    metric: String(challenge.metric),
    enabled: challenge.enabled !== false,
    ...(challenge.columns ? { columns: String(challenge.columns) } : {}),
    difficulties: difficulties(challenge.difficulties),
    conditions: array(challenge.conditions),
  }));
  return {
    id: String(boss.id),
    name: String(boss.name),
    source,
    difficulties: difficulties(boss.difficulties),
    bossNpcIds: [...entities.values()].filter((entity) => entity.isBoss).flatMap((entity) => entity.ids),
    entityNpcIds: Object.fromEntries([...entities.values()].map((entity) => [entity.name, entity.ids])),
    phases,
    counters,
    timers,
    shields,
    challenges,
    ...(boss.victory_trigger ? { victoryTrigger: trigger(boss.victory_trigger, entities) } : {}),
  };
}

const treeResponse = await fetch(`https://api.github.com/repos/baras-app/baras/git/trees/${barasRef}?recursive=1`, { headers });
if (!treeResponse.ok) throw new Error(`BARAS tree request failed: ${treeResponse.status}`);
const tree = await treeResponse.json();
const resolvedBarasRef = tree.sha ?? barasRef;
const paths = tree.tree
  .filter((entry) => entry.type === "blob" && /^core\/definitions\/encounters\/(operations|flashpoints|other)\/.*\.toml$/.test(entry.path))
  .map((entry) => entry.path)
  .sort();

const definitions = [];
for (const source of paths) {
  const response = await fetch(`https://raw.githubusercontent.com/baras-app/baras/${resolvedBarasRef}/${source}`, { headers });
  if (!response.ok) throw new Error(`BARAS definition request failed for ${source}: ${response.status}`);
  const document = parse(await response.text());
  for (const boss of array(document.boss)) definitions.push(parseBoss(boss, source));
}

if (unknownTriggerTypes.size > 0 || unknownConditionTypes.size > 0 || unknownEntityFilters.size > 0) {
  throw new Error(`Unsupported BARAS DSL types: triggers=[${[...unknownTriggerTypes]}], conditions=[${[...unknownConditionTypes]}], entityFilters=[${[...unknownEntityFilters]}]`);
}

const output = `// Generated by tools/import-baras-encounters.mjs from BARAS ${resolvedBarasRef}.\n// Do not edit manually. Re-run the importer when the BARAS reference changes.\n\nimport type { BarasEncounterDefinition } from "../types.js";\n\nexport const BARAS_ENCOUNTER_DEFINITIONS_VERSION = ${JSON.stringify(resolvedBarasRef)} as const;\nexport const BARAS_ENCOUNTER_DEFINITIONS: readonly BarasEncounterDefinition[] = ${JSON.stringify(definitions, null, 2)};\n`;
const outputPath = resolve(repoRoot, "packages/game-data/src/generated/baras-encounters.ts");
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, output, "utf8");
console.log(`Generated ${definitions.length} encounters from ${paths.length} BARAS files at ${outputPath}`);