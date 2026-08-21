import { describe, expect, it } from "vitest";
import {
  ENCOUNTERS,
  ENCOUNTERS_BY_ID,
  OPERATIONS,
  isEncounterCleared,
  classifyCatalogEntity,
  classifyEncounterEntity,
  resolveEncounterPhase,
  resolveEncounter,
  supportsDifficulty,
} from "@swtor/game-data";

describe("registry integrity", () => {
  it("gives every encounter a unique id and a known operation", () => {
    const ids = ENCOUNTERS.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);

    const operationIds = new Set(OPERATIONS.map((o) => o.id));
    for (const encounter of ENCOUNTERS) {
      expect(operationIds, encounter.id).toContain(encounter.operationId);
    }
  });

  it("registers the flashpoint encounter catalog from the planning brief", () => {
    expect(ENCOUNTERS_BY_ID.get("fp_athiss_prophet_vodal")).toBeDefined();
    expect(ENCOUNTERS_BY_ID.get("fp_li_doctor_lorrick")).toBeDefined();
    expect(ENCOUNTERS_BY_ID.get("fp_fe_darth_malgus")).toBeDefined();
    expect(ENCOUNTERS_BY_ID.get("fp_manaan_ortuno")).toBeDefined();
  });

  it("lowercases every boss name so log matching is case-insensitive", () => {
    for (const encounter of ENCOUNTERS) {
      for (const name of [...encounter.bossNames, ...encounter.victoryRequires]) {
        expect(name, encounter.id).toBe(name.toLowerCase());
      }
    }
  });

  it("only requires victory targets that are also listed as bosses", () => {
    for (const encounter of ENCOUNTERS) {
      for (const required of encounter.victoryRequires) {
        expect(encounter.bossNames, encounter.id).toContain(required);
      }
    }
  });

  it("orders phases from one upward", () => {
    for (const encounter of ENCOUNTERS) {
      expect(encounter.phases.length, encounter.id).toBeGreaterThan(0);
      expect(encounter.phases.map((p) => p.order)).toEqual(encounter.phases.map((_, i) => i + 1));
    }
  });

  it("offers Master Mode for both classic raids and the new flashpoint catalog", () => {
    const master = new Set(
      OPERATIONS.filter((o) => o.difficulties.includes("Master")).map((o) => o.id),
    );
    expect(master).toEqual(
      new Set([
        "ec",
        "tfb",
        "snv",
        "df",
        "dp",
        "gotm",
        "dxun",
        "fp_ess",
        "fp_bt",
        "fp_hs",
        "fp_athiss",
        "fp_mr",
        "fp_cad",
        "fp_tv",
        "fp_bp",
        "fp_mp",
        "fp_foundry",
        "fp_d7",
        "fp_boi",
        "fp_fe",
        "fp_li",
        "fp_kaon",
        "fp_czlabs",
        "fp_czcore",
        "fp_aot",
        "fp_ki",
        "fp_manaan",
        "fp_rakata",
        "fp_bh",
        "fp_rishi",
        "fp_umbara",
        "fp_copero",
        "fp_nathema",
        "fp_meridian",
        "fp_sov",
        "fp_sote",
        "fp_nul",
        "fp_sos",
      ]),
    );
  });

  it("keeps R-4 Anomaly eight-player only", () => {
    const r4 = OPERATIONS.find((o) => o.id === "r4")!;
    expect(r4.groupSizes).toEqual([8]);
    expect(supportsDifficulty(r4, "Master")).toBe(false);
    expect(supportsDifficulty(r4, "Veteran")).toBe(true);
  });
});

describe("resolveEncounter", () => {
  it("identifies a boss by name", () => {
    const match = resolveEncounter({ npcNames: ["Dash'Roode"] });
    expect(match?.encounter.id).toBe("snv_dashroode");
    expect(match?.operation.name).toBe("Scum and Villainy");
  });

  it("ignores trash engaged alongside the boss", () => {
    const match = resolveEncounter({
      zoneId: "137438993037",
      zoneName: "Darvannis",
      npcNames: ["Voracious Xuvva", "Dash'Roode", "Sand Crawler"],
    });
    expect(match?.encounter.id).toBe("snv_dashroode");
  });

  it("uses the zone to separate bosses that share a name", () => {
    const dxun = resolveEncounter({
      zoneName: "Dxun",
      npcNames: ["Mutated Geonosian Queen"],
    });
    const ossus = resolveEncounter({
      zoneName: "Hive of the Mountain Queen",
      npcNames: ["Mutated Geonosian Queen"],
    });

    expect(dxun?.encounter.id).toBe("dxun_geonosian_queen");
    expect(ossus?.encounter.id).toBe("lair_hive_mountain_queen");
  });

  it("prefers the encounter with more of its bosses present", () => {
    const match = resolveEncounter({
      npcNames: ["Captain Horic", "Tu'chuk", "Vilus Garr", "Sunder"],
    });
    expect(match?.encounter.id).toBe("snv_cartel_warlords");
    expect(match?.matchedBosses).toHaveLength(4);
  });

  it("returns null when nothing recognisable was engaged", () => {
    expect(resolveEncounter({ npcNames: ["Operations Training Dummy"] })).toBeNull();
    expect(resolveEncounter({ npcNames: [] })).toBeNull();
  });

  it("boosts score using a verified boss npc id, not just the learned observed cache", () => {
    const match = resolveEncounter({
      npcNames: ["Dash'Roode"],
      npcIds: ["3153558262251520"],
    });
    expect(match?.encounter.id).toBe("snv_dashroode");
    expect(match?.score).toBeGreaterThanOrEqual(10);
  });
});

describe("isEncounterCleared", () => {
  const warlords = ENCOUNTERS_BY_ID.get("snv_cartel_warlords")!;
  const dashroode = ENCOUNTERS_BY_ID.get("snv_dashroode")!;
  const styrak = ENCOUNTERS_BY_ID.get("snv_dread_master_styrak")!;

  it("needs every listed target dead for a multi-boss encounter", () => {
    expect(isEncounterCleared(warlords, ["Sunder"])).toBe(false);
    expect(isEncounterCleared(warlords, ["Sunder", "Tu'chuk", "Vilus Garr"])).toBe(false);
    expect(isEncounterCleared(warlords, ["Sunder", "Tu'chuk", "Vilus Garr", "Captain Horic"])).toBe(
      true,
    );
  });

  it("needs only the single boss for a standard encounter", () => {
    expect(isEncounterCleared(dashroode, ["Dash'Roode"])).toBe(true);
    expect(isEncounterCleared(dashroode, ["Voracious Xuvva"])).toBe(false);
  });

  it("does not treat a phase-one target as a clear", () => {
    expect(isEncounterCleared(styrak, ["Kell Dragon"])).toBe(false);
    expect(isEncounterCleared(styrak, ["Kell Dragon", "Dread Master Styrak"])).toBe(true);
  });
});

describe("phase and entity resolution", () => {
  it("classifies Dustclaw names from the global catalog", () => {
    expect(classifyCatalogEntity("Dustclaw Alpha")).toBe("mechanic");
    expect(classifyCatalogEntity("Dustclaw Ravager")).toBe("mechanic");
    expect(classifyCatalogEntity("Dustclaw Packling")).toBe("mechanic");
  });

  it("classifies Titan Probe as a Titan 6 mechanic", () => {
    const encounter = ENCOUNTERS_BY_ID.get("snv_titan_6")!;
    expect(classifyEncounterEntity(encounter, "Titan Probe")).toBe("mechanic");
  });

  it("classifies a boss by verified npc id even when the name doesn't match", () => {
    const encounter = ENCOUNTERS_BY_ID.get("snv_dashroode")!;
    expect(classifyEncounterEntity(encounter, "Unknown Locale Label", "3153558262251520")).toBe("boss");
    expect(classifyEncounterEntity(encounter, "Unknown Locale Label")).toBe("unknown");
  });

  it("classifies against the catalog by npc id without a resolved encounter", () => {
    expect(classifyCatalogEntity("Some Other Label", "3058837053505536")).toBe("boss");
    expect(classifyCatalogEntity("Some Other Label")).toBe("unknown");
  });

  it("classifies Dustclaw variants as Thrasher mechanics", () => {
    const encounter = ENCOUNTERS_BY_ID.get("snv_thrasher")!;
    expect(classifyEncounterEntity(encounter, "Dustclaw Alpha")).toBe("mechanic");
    expect(classifyEncounterEntity(encounter, "Dustclaw Ravager")).toBe("mechanic");
    expect(classifyEncounterEntity(encounter, "Dustclaw Packling")).toBe("mechanic");
  });

  it("advances a phase when its deathTrigger NPC is confirmed dead", () => {
    const encounter = {
      ...ENCOUNTERS_BY_ID.get("snv_dashroode")!,
      phases: [
        { order: 1, name: "Opener", style: "Add Wave", trigger: "Encounter start" },
        { order: 2, name: "Burn", style: "Burn", trigger: "Adds cleared", deathTrigger: "adds add" },
      ],
    };
    const resolved = resolveEncounterPhase(encounter, {
      deadNpcNames: new Set(["adds add"]),
    });
    expect(resolved).toBe(2);
  });

  it("blocks a phase from triggering when its guard condition fails", () => {
    const encounter = {
      ...ENCOUNTERS_BY_ID.get("snv_dashroode")!,
      phases: [
        { order: 1, name: "Opener", style: "Add Wave", trigger: "Encounter start" },
        {
          order: 2,
          name: "Burn",
          style: "Burn",
          trigger: "50%",
          guard: { kind: "counterCompare" as const, counterId: "adds-killed", operator: "gte" as const, value: 3 },
        },
      ],
    };
    const blocked = resolveEncounterPhase(encounter, {
      bossHpPercent: 40,
      conditionContext: { getCounter: () => 1, currentPhaseOrder: 1 },
    });
    expect(blocked).toBe(1);

    const unblocked = resolveEncounterPhase(encounter, {
      bossHpPercent: 40,
      conditionContext: { getCounter: () => 3, currentPhaseOrder: 1 },
    });
    expect(unblocked).toBe(2);
  });

  it("keeps catalogued mechanics inside the matched boss encounter", () => {
    const encounter = ENCOUNTERS_BY_ID.get("snv_dashroode")!;
    expect(classifyEncounterEntity(encounter, "Dash'Roode")).toBe("boss");
    expect(classifyEncounterEntity(encounter, "Voracious Xuvva")).toBe("mechanic");
    expect(classifyEncounterEntity(encounter, "Unrelated Trash")).toBe("unknown");
  });

  it("advances phases when a catalogued HP threshold is crossed", () => {
    const encounter = ENCOUNTERS_BY_ID.get("ev_soa")!;
    expect(resolveEncounterPhase(encounter, { bossHpPercent: 80 })).toBe(1);
    expect(resolveEncounterPhase(encounter, { bossHpPercent: 74 })).toBe(2);
    expect(resolveEncounterPhase(encounter, { bossHpPercent: 29 })).toBe(3);
  });
});
