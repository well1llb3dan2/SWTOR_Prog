import type { Difficulty, GroupSize } from "@swtor/shared";
import type { Condition } from "./conditions.js";

export type OperationId =
  | "ev"
  | "kp"
  | "ec"
  | "tfb"
  | "snv"
  | "df"
  | "dp"
  | "rav"
  | "tos"
  | "gotm"
  | "dxun"
  | "r4"
  | "lair"
  | "fp_ess"
  | "fp_bt"
  | "fp_hs"
  | "fp_athiss"
  | "fp_mr"
  | "fp_cad"
  | "fp_tv"
  | "fp_bp"
  | "fp_mp"
  | "fp_foundry"
  | "fp_d7"
  | "fp_boi"
  | "fp_fe"
  | "fp_li"
  | "fp_kaon"
  | "fp_czlabs"
  | "fp_czcore"
  | "fp_aot"
  | "fp_ki"
  | "fp_manaan"
  | "fp_rakata"
  | "fp_bh"
  | "fp_rishi"
  | "fp_umbara"
  | "fp_copero"
  | "fp_nathema"
  | "fp_meridian"
  | "fp_sov"
  | "fp_sote"
  | "fp_nul"
  | "fp_sos";

export interface EncounterPhase {
  order: number;
  name: string;
  /** Shorthand for how the phase plays, e.g. "Add Wave", "Burn". */
  style: string;
  /** What moves the fight into this phase. */
  trigger: string;
  /** Lowercased NPC name whose death also advances the fight into this phase. */
  deathTrigger?: string;
  /** Must evaluate true (against live counters/phase state) for this phase to trigger. */
  guard?: Condition;
}

/** A per-encounter tally driven by ability/effect events, for mechanic counting and phase guards. */
export interface CounterDefinition {
  id: string;
  name: string;
  /** Ability name (case-insensitive substring match) that increments this counter. */
  incrementOnAbility?: string;
  /** Effect name (case-insensitive substring match) that increments this counter. */
  incrementOnEffect?: string;
}

export interface WipeMechanic {
  name: string;
  description: string;
}

export interface Encounter {
  id: string;
  name: string;
  operationId: OperationId;
  /** Position in the operation's intended clear order. */
  order: number;
  /**
   * NPC names as they appear in combat logs, lowercased.
   *
   * Names are the matching key rather than NPC ids: the same boss carries a
   * different numeric id per difficulty (Dash'Roode alone appears under two,
   * Olok the Shadow under three), so ids can only ever be a learned cache.
   */
  bossNames: string[];
  /**
   * Every name here must die for the pull to count as a kill. Empty means any
   * single boss death wins, which is the common case; multi-boss encounters
   * such as the Cartel Warlords list all of their targets.
   */
  victoryRequires: string[];
  adds: string[];
  phases: EncounterPhase[];
  wipeMechanics: WipeMechanic[];
  victoryEvent: string;
  /**
   * Verified NPC class ids for the boss entity/entities, across all observed
   * difficulties. Ids are stable per NPC (unlike names, which can theoretically
   * collide across encounters); prefer these for classification when known.
   */
  bossNpcIds?: string[];
  /**
   * Lowercased boss names that hold exactly one live instance per pull. A new
   * instance appearing while a prior instance of the same NPC id is still
   * alive means the attempt reset rather than wiped or was killed.
   */
  singleInstanceBossNames?: string[];
  /** Mechanic counters tracked for this encounter (empty for most). */
  counters?: CounterDefinition[];
}

export interface Operation {
  id: OperationId;
  name: string;
  location: string;
  /** Verified zone ids from `AreaEntered`; empty where none has been observed. */
  zoneIds: string[];
  /** Zone names as logged, lowercased. */
  zoneNames: string[];
  isLair: boolean;
  /**
   * Difficulties the live client still offers. Master Mode is absent for the
   * older operations, where it was retired, and for those that never got one.
   */
  difficulties: Difficulty[];
  /** Group sizes the operation can be run at. */
  groupSizes: GroupSize[];
}
