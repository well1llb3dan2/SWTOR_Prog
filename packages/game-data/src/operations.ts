import type { Difficulty, GroupSize } from "@swtor/shared";
import type { Operation } from "./types.js";

/**
 * Zone ids are only listed where an `AreaEntered` line in the sample corpus
 * confirmed them. The rest match on name until a log proves the id, because a
 * guessed id would fail silently while a missing one simply falls back.
 *
 * `difficulties` and `groupSizes` come from the tactical briefings rather than
 * from logs: Master Mode was retired for the launch operations and never built
 * for several later ones, and R-4 Anomaly is 8-player only.
 */

const ALL: Difficulty[] = ["Story", "Veteran", "Master"];
const NO_MASTER: Difficulty[] = ["Story", "Veteran"];
const EIGHT_AND_SIXTEEN: GroupSize[] = [8, 16];
const EIGHT_ONLY: GroupSize[] = [8];

export const OPERATIONS: readonly Operation[] = [
  {
    id: "ev",
    name: "The Eternity Vault",
    location: "Belsavis",
    zoneIds: ["833571547775670"],
    zoneNames: ["eternity vault"],
    isLair: false,
    difficulties: NO_MASTER,
    groupSizes: EIGHT_AND_SIXTEEN,
  },
  {
    id: "kp",
    name: "Karagga's Palace",
    location: "Hutta",
    zoneIds: ["833571547775669"],
    zoneNames: ["karagga's palace"],
    isLair: false,
    difficulties: NO_MASTER,
    groupSizes: EIGHT_AND_SIXTEEN,
  },
  {
    id: "ec",
    name: "Explosive Conflict",
    location: "Denova",
    zoneIds: ["833571547775688"],
    zoneNames: ["denova"],
    isLair: false,
    difficulties: ALL,
    groupSizes: EIGHT_AND_SIXTEEN,
  },
  {
    id: "tfb",
    name: "Terror From Beyond",
    location: "Asation",
    zoneIds: [],
    zoneNames: ["asation", "terror from beyond"],
    isLair: false,
    difficulties: ALL,
    groupSizes: EIGHT_AND_SIXTEEN,
  },
  {
    id: "snv",
    name: "Scum and Villainy",
    location: "Darvannis",
    zoneIds: ["137438993037"],
    zoneNames: ["darvannis"],
    isLair: false,
    difficulties: ALL,
    groupSizes: EIGHT_AND_SIXTEEN,
  },
  {
    id: "df",
    name: "Dread Fortress",
    location: "Oricon",
    zoneIds: [],
    zoneNames: ["dread fortress"],
    isLair: false,
    difficulties: ALL,
    groupSizes: EIGHT_AND_SIXTEEN,
  },
  {
    id: "dp",
    name: "Dread Palace",
    location: "Oricon",
    zoneIds: [],
    zoneNames: ["dread palace"],
    isLair: false,
    difficulties: ALL,
    groupSizes: EIGHT_AND_SIXTEEN,
  },
  {
    id: "rav",
    name: "The Ravagers",
    location: "Rishi",
    zoneIds: [],
    zoneNames: ["the ravagers", "ravagers"],
    isLair: false,
    difficulties: NO_MASTER,
    groupSizes: EIGHT_AND_SIXTEEN,
  },
  {
    id: "tos",
    name: "Temple of Sacrifice",
    location: "Yavin 4",
    zoneIds: [],
    zoneNames: ["temple of sacrifice"],
    isLair: false,
    difficulties: NO_MASTER,
    groupSizes: EIGHT_AND_SIXTEEN,
  },
  {
    id: "gotm",
    name: "Gods from the Machine",
    location: "Iokath",
    zoneIds: [],
    zoneNames: ["gods from the machine", "iokath"],
    isLair: false,
    difficulties: ALL,
    groupSizes: EIGHT_AND_SIXTEEN,
  },
  {
    id: "dxun",
    name: "The Nature of Progress",
    location: "Dxun",
    zoneIds: [],
    zoneNames: ["the nature of progress", "dxun"],
    isLair: false,
    difficulties: ALL,
    groupSizes: EIGHT_AND_SIXTEEN,
  },
  {
    id: "r4",
    name: "R-4 Anomaly",
    location: "Deep Space Platform",
    zoneIds: [],
    zoneNames: ["r-4 anomaly"],
    isLair: false,
    difficulties: NO_MASTER,
    groupSizes: EIGHT_ONLY,
  },
  {
    id: "lair",
    name: "Lair Operations",
    location: "Various",
    zoneIds: [],
    zoneNames: ["toborro's courtyard", "valley of the machine gods", "hive of the mountain queen"],
    isLair: true,
    difficulties: NO_MASTER,
    groupSizes: EIGHT_AND_SIXTEEN,
  },
];

export const OPERATIONS_BY_ID = new Map(OPERATIONS.map((op) => [op.id, op]));

/** False when a pull reports a difficulty the operation does not offer. */
export function supportsDifficulty(operation: Operation, difficulty: Difficulty): boolean {
  return operation.difficulties.includes(difficulty);
}
