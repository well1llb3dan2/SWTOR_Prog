import type { Difficulty, GroupSize } from "@swtor/shared";

export interface ObservedNpc {
  encounterId: string;
  /** Name exactly as logged. */
  name: string;
  npcId: string;
  zoneId: string;
  difficulty: Difficulty;
  groupSize: GroupSize;
  maxHp: number;
}

/**
 * NPC ids and health observed in real combat logs.
 *
 * This is a cache, not a source of truth. A boss carries a different id per
 * difficulty, so ids can confirm an encounter but can never enumerate it --
 * `resolveEncounter` still matches on zone plus name and only consults this
 * table as a fast path. Every row is asserted against `samples/combat-logs/`
 * by the test suite, so stale entries fail loudly rather than drift.
 */
export const OBSERVED_NPCS: readonly ObservedNpc[] = [
  // The Eternity Vault -- 8 player Veteran
  n(
    "ev_annihilation_droid_xrr3",
    "Annihilation Droid XRR-3",
    "2034573252755456",
    "833571547775670",
    "Veteran",
    29_481_486,
  ),
  n("ev_gharj", "Gharj", "2034526008115200", "833571547775670", "Veteran", 24_080_298),
  n("ev_soa", "Soa", "2289823159156736", "833571547775670", "Veteran", 15_753_466),

  // Karagga's Palace -- 8 player Veteran
  n(
    "kp_bonethrasher",
    "Bonethrasher",
    "2624474125959168",
    "833571547775669",
    "Veteran",
    29_031_386,
  ),
  n("kp_jarg_and_sorno", "Jarg", "2760482855321600", "833571547775669", "Veteran", 22_504_952),
  n("kp_jarg_and_sorno", "Sorno", "2760487150288896", "833571547775669", "Veteran", 22_504_952),
  n(
    "kp_foreman_crusher",
    "Foreman Crusher",
    "2760637474144256",
    "833571547775669",
    "Veteran",
    28_131_190,
  ),
  n(
    "kp_g4b3_heavy_fabricator",
    "G4-B3 Heavy Fabricator",
    "2748401112317952",
    "833571547775669",
    "Veteran",
    31_619_458,
  ),
  n(
    "kp_karagga_the_unyielding",
    "Karagga the Unyielding",
    "2761191524925440",
    "833571547775669",
    "Veteran",
    33_082_278,
  ),

  // Explosive Conflict -- 8 player Story
  n("ec_zorn_and_toth", "Zorn", "2788331423268864", "833571547775688", "Story", 6_566_526),
  n("ec_zorn_and_toth", "Toth", "2788335718236160", "833571547775688", "Story", 6_566_526),
  n(
    "ec_firebrand_and_stormcaller",
    "Firebrand Battle Tank",
    "2808827007205376",
    "833571547775688",
    "Story",
    5_599_363,
  ),
  n(
    "ec_firebrand_and_stormcaller",
    "Stormcaller Blast Tank",
    "2808831302172672",
    "833571547775688",
    "Story",
    5_599_363,
  ),
  n(
    "ec_colonel_vorgath",
    "Colonel Vorgath",
    "2848692893646848",
    "833571547775688",
    "Story",
    4_581_297,
  ),
  n(
    "ec_warlord_kephess",
    "Warlord Kephess",
    "2800357331697664",
    "833571547775688",
    "Story",
    5_395_023,
  ),

  // Scum and Villainy -- 8 player Veteran
  n("snv_dashroode", "Dash'Roode", "3153558262251520", "137438993037", "Veteran", 21_829_804),
  n("snv_titan_6", "Titan 6", "3152458750623744", "137438993037", "Veteran", 26_330_792),
  n("snv_thrasher", "Thrasher", "3154563284598784", "137438993037", "Veteran", 15_978_516),
  n(
    "snv_operations_chief",
    "Operations Chief",
    "3157548286869504",
    "137438993037",
    "Veteran",
    8_326_832,
  ),
  n(
    "snv_olok_the_shadow",
    "Olok the Shadow",
    "3154662068846592",
    "137438993037",
    "Veteran",
    14_178_119,
  ),
  n(
    "snv_cartel_warlords",
    "Captain Horic",
    "3054400352288768",
    "137438993037",
    "Veteran",
    7_914_955,
  ),
  n("snv_cartel_warlords", "Tu'chuk", "3156895451840512", "137438993037", "Veteran", 7_914_955),
  n("snv_cartel_warlords", "Vilus Garr", "3054408942223360", "137438993037", "Veteran", 7_914_955),
  n("snv_cartel_warlords", "Sunder", "3054404647256064", "137438993037", "Veteran", 7_914_955),
  n(
    "snv_dread_master_styrak",
    "Kell Dragon",
    "3067057620910080",
    "137438993037",
    "Veteran",
    22_504_952,
  ),
  n(
    "snv_dread_master_styrak",
    "Dread Master Styrak",
    "3152407211016192",
    "137438993037",
    "Veteran",
    22_504_952,
  ),

  // Scum and Villainy -- 8 player Story
  n("snv_dashroode", "Dash'Roode", "3058837053505536", "137438993037", "Story", 14_181_202),
  n("snv_titan_6", "Titan 6", "3016450021261312", "137438993037", "Story", 15_414_350),
  n(
    "snv_operations_chief",
    "Operations Chief",
    "3141940375715840",
    "137438993037",
    "Story",
    4_161_875,
  ),
  n(
    "snv_olok_the_shadow",
    "Olok the Shadow",
    "3016445726294016",
    "137438993037",
    "Story",
    7_553_032,
  ),
  n("snv_cartel_warlords", "Tu'chuk", "3054413237190656", "137438993037", "Story", 4_729_171),
  n(
    "snv_dread_master_styrak",
    "Dread Master Styrak",
    "3066945951760384",
    "137438993037",
    "Story",
    15_414_350,
  ),
];

function n(
  encounterId: string,
  name: string,
  npcId: string,
  zoneId: string,
  difficulty: Difficulty,
  maxHp: number,
): ObservedNpc {
  return { encounterId, name, npcId, zoneId, difficulty, groupSize: 8, maxHp };
}

const BY_NPC_ID = new Map(OBSERVED_NPCS.map((entry) => [entry.npcId, entry]));

/** Encounter for a known NPC id, or null when it has never been observed. */
export function encounterIdForNpcId(npcId: string): string | null {
  return BY_NPC_ID.get(npcId)?.encounterId ?? null;
}
