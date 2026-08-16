import type { Difficulty, GroupSize } from "@swtor/shared";

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
  | "lair";

export interface EncounterPhase {
  order: number;
  name: string;
  /** Shorthand for how the phase plays, e.g. "Add Wave", "Burn". */
  style: string;
  /** What moves the fight into this phase. */
  trigger: string;
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
