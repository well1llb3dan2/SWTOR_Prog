import type { Encounter, EncounterPhase, OperationId } from "./types.js";

const p = (order: number, name: string, style: string, trigger: string): EncounterPhase => ({
  order,
  name,
  style,
  trigger,
});

type EncounterSeed = Omit<Encounter, "operationId" | "order" | "victoryRequires"> & {
  victoryRequires?: string[];
};

function operation(operationId: OperationId, seeds: EncounterSeed[]): Encounter[] {
  return seeds.map((seed, index) => ({
    ...seed,
    victoryRequires: seed.victoryRequires ?? [],
    operationId,
    order: index + 1,
  }));
}

const EV = operation("ev", [
  {
    // The briefing calls this "Annihilator 6520"; logs record the live name.
    id: "ev_annihilation_droid_xrr3",
    name: "Annihilation Droid XRR-3",
    bossNames: ["annihilation droid xrr-3", "annihilator 6520"],
    adds: ["Defense Turret", "Assault Probe"],
    phases: [
      p(1, "Artillery Engagement", "Single-Target Ground", "Encounter start"),
      p(2, "Missile Barrage Protocol", "Channelled AOE", "Health intervals at 75%, 50%, 25%"),
    ],
    wipeMechanics: [
      {
        name: "Full Salvo Enrage",
        description: "Uninterruptible raid-wide barrage once the six-minute enrage expires.",
      },
    ],
    victoryEvent: "Boss defeated",
  },
  {
    id: "ev_gharj",
    name: "Gharj",
    bossNames: ["gharj"],
    adds: ["Cave Prowler"],
    phases: [
      p(1, "Platform Engagement", "Static Tank & Spank", "Boss engaged on the current island"),
      p(2, "Seismic Smash & Relocation", "Arena Shift", "Lava rises and the platform sinks"),
    ],
    wipeMechanics: [
      {
        name: "Molten Immersion",
        description: "Failing to reach a fresh island before submergence wipes to lava ticks.",
      },
    ],
    victoryEvent: "Boss defeated",
  },
  {
    id: "ev_ancient_pylons",
    name: "Ancient Pylons",
    bossNames: ["ancient pylon defense system", "ancient pylon"],
    adds: ["Infinite Corrupted Acklay", "Corrupted Golem"],
    phases: [
      p(
        1,
        "North & South Alignment Wheels",
        "Split Puzzle",
        "Terminal activation; lock four rings",
      ),
    ],
    wipeMechanics: [
      {
        name: "Vault Lockout Purge",
        description: "Puzzle timer expiry electrocutes the whole room.",
      },
    ],
    victoryEvent: "Puzzle solved / four rings aligned",
  },
  {
    id: "ev_infernal_council",
    name: "The Infernal Council",
    bossNames: [
      "infernal council",
      "sith lord",
      "sith marauder",
      "sith assassin",
      "sith juggernaut",
    ],
    adds: ["Sith Marauder / Lord", "Sith Assassin / Juggernaut"],
    phases: [p(1, "1v1 Duels", "Isolated Combat", "Pulling any Council member locks each player")],
    wipeMechanics: [
      {
        name: "Interference Curse",
        description: "Healing or attacking outside your assigned duel triggers heavy raid damage.",
      },
    ],
    victoryEvent: "All Council members eliminated",
  },
  {
    id: "ev_soa",
    name: "Soa",
    bossNames: ["soa"],
    adds: ["Mind Trap", "Ball Lightning"],
    phases: [
      p(1, "Platform Level 1", "Shielded", "Encounter start to 75%"),
      p(2, "Platform Level 2 & Descent", "Trap Management", "75% floor collapse, down to 30%"),
      p(3, "Final Arena & Pyramid Break", "Pyramid Vulnerability", "30% floor collapse"),
    ],
    wipeMechanics: [
      {
        name: "Invulnerability Overload",
        description: "Missing pyramid drops keeps Soa immune while raid damage ramps.",
      },
    ],
    victoryEvent: "Boss defeated",
  },
]);

const KP = operation("kp", [
  {
    id: "kp_bonethrasher",
    name: "Bonethrasher",
    bossNames: ["bonethrasher"],
    adds: ["Gamorrean Guard", "Karagga's Nexu"],
    phases: [p(1, "Untauntable Rampage", "Aggro-Free Cleave", "Encounter start")],
    wipeMechanics: [
      { name: "Berserk Swat", description: "Lethal swipe on the five-minute hard enrage." },
    ],
    victoryEvent: "Boss defeated",
  },
  {
    id: "kp_jarg_and_sorno",
    name: "Jarg & Sorno",
    bossNames: ["jarg", "sorno"],
    victoryRequires: ["jarg", "sorno"],
    adds: ["Scann-Drone", "Mercenary Interceptor"],
    phases: [
      p(1, "Dual Engagement", "Twin Boss Split", "Encounter start"),
      p(2, "Rockets & Carbonite Bombardment", "Ground Hazard", "Sorno jumps to the rafters"),
    ],
    wipeMechanics: [
      {
        name: "Dual Overdrive",
        description: "Leaving one boss alive too long after the other dies amplifies its damage.",
      },
    ],
    victoryEvent: "Both bosses defeated",
  },
  {
    id: "kp_foreman_crusher",
    name: "Foreman Crusher",
    bossNames: ["foreman crusher"],
    adds: ["Gamorrean Slicer", "Heavy Gamorrean Bruiser"],
    phases: [
      p(1, "Frenzy Phase", "Tank & Spank", "Encounter start"),
      p(2, "Foreman's Retaliation", "Add Waves", "Boss summons gate reinforcements"),
    ],
    wipeMechanics: [
      {
        name: "Frenzied Pummel",
        description: "Uncontrolled adds at enrage produce lethal raid-wide shockwaves.",
      },
    ],
    victoryEvent: "Boss defeated",
  },
  {
    id: "kp_g4b3_heavy_fabricator",
    name: "G4-B3 Heavy Fabricator",
    bossNames: ["g4-b3 heavy fabricator", "g4-b3"],
    adds: ["Heavy Security Droid", "Stun Droid"],
    phases: [
      p(1, "Armor Stacking Protocol", "Hazard Puzzle", "Boss stacks armour; drag under lava dumps"),
    ],
    wipeMechanics: [
      {
        name: "Armor Saturation Enrage",
        description: "Failing to strip ten armour stacks leaves the boss at 99% damage reduction.",
      },
    ],
    victoryEvent: "Boss defeated",
  },
  {
    id: "kp_karagga_the_unyielding",
    name: "Karagga the Unyielding",
    bossNames: ["karagga the unyielding", "karagga"],
    adds: ["Cybernetic Drills", "Palace Guard"],
    phases: [p(1, "Walker Artillery Protocol", "Kiting", "Encounter start")],
    wipeMechanics: [
      {
        name: "Flamethrower Saturation",
        description: "Burning oil trails across every tile leave no safe ground.",
      },
    ],
    victoryEvent: "Boss defeated",
  },
]);

const EC = operation("ec", [
  {
    id: "ec_zorn_and_toth",
    name: "Zorn & Toth",
    bossNames: ["zorn", "toth"],
    victoryRequires: ["zorn", "toth"],
    adds: ["Baradium Rock Formation"],
    phases: [
      p(
        1,
        "Dual Proximity Management",
        "Distance Split",
        "Encounter start; keep bosses >30m apart",
      ),
      p(2, "Berserk Jump Switch", "Tank Swap", "Toth leaps to Zorn"),
    ],
    wipeMechanics: [
      {
        name: "Symbiotic Rage",
        description: "Bosses in close range gain 500% bonus damage and immunity.",
      },
    ],
    victoryEvent: "Both bosses defeated",
  },
  {
    id: "ec_firebrand_and_stormcaller",
    name: "Firebrand & Stormcaller",
    bossNames: ["firebrand battle tank", "stormcaller blast tank", "firebrand", "stormcaller"],
    victoryRequires: ["firebrand battle tank", "stormcaller blast tank"],
    adds: ["Combat Droid (Shield Generator)", "Baradium Missile Gunner"],
    phases: [
      p(
        1,
        "Dual Armored Platform Protocol",
        "Split Raid",
        "Encounter start; raid splits left/right",
      ),
      p(2, "Defensive Shield Dome Deployment", "Shield Bubble", "80%, 60%, 40%, 20% health"),
    ],
    wipeMechanics: [
      {
        name: "Orbital Bombardment",
        description: "Standing outside an active shield dome during the transition is lethal.",
      },
    ],
    victoryEvent: "Both walkers destroyed",
  },
  {
    id: "ec_colonel_vorgath",
    name: "Colonel Vorgath",
    bossNames: ["colonel vorgath"],
    adds: ["Demolitions Probe Droid", "Imperial Defoliator"],
    phases: [
      p(1, "Minefield Puzzle Grid", "Grid Clearing", "Encounter start"),
      p(2, "Turret Defense & Engagement", "Boss Burn", "Raid reaches the far platform"),
    ],
    wipeMechanics: [
      {
        name: "Baradium Minefield Detonation",
        description: "Stepping on an unassigned tile detonates the grid.",
      },
    ],
    victoryEvent: "Boss defeated",
  },
  {
    id: "ec_warlord_kephess",
    name: "Warlord Kephess",
    bossNames: ["warlord kephess"],
    adds: ["Baradium Bomber", "Warstrider Battlewalker", "Trandoshan Warrior"],
    phases: [
      p(1, "Shield Line & Bombers", "Add Wave", "Encounter start"),
      p(2, "Warstrider Destruction", "Walker Burn", "Shields disabled by three bomb drops"),
      p(3, "Kephess Ground Assault", "Boss Engagement", "Walker destroyed"),
      p(4, "Gift of the Masters", "Soft Enrage", "Below 20% health"),
    ],
    wipeMechanics: [
      {
        name: "Baradium Bomb Drop Failure",
        description: "Letting a Baradium Bomber detonate among allies wipes the raid.",
      },
    ],
    victoryEvent: "Boss defeated",
  },
]);

const TFB = operation("tfb", [
  {
    id: "tfb_writhing_horror",
    name: "The Writhing Horror",
    bossNames: ["the writhing horror", "writhing horror", "the withering horror"],
    adds: ["Corrosive Slime", "Lurker Drone"],
    phases: [
      p(1, "Ground Combat & Spore Field", "Positioning", "Encounter start"),
      p(2, "Burrow & Add Cleansing", "Add Defense", "Boss burrows at health intervals"),
      p(3, "Final Soft Enrage", "Burn", "Below 15% health"),
    ],
    wipeMechanics: [
      {
        name: "Corrosive Acid Slime Overload",
        description: "Uncleansed corrosive spit spreads a lethal ticking dot.",
      },
    ],
    victoryEvent: "Boss defeated",
  },
  {
    id: "tfb_dread_guard",
    name: "The Dread Guard",
    bossNames: ["heirad", "ciphas", "kel'sara"],
    victoryRequires: ["heirad", "ciphas", "kel'sara"],
    adds: ["Dread Tendril"],
    phases: [
      p(1, "Heirad Priority", "Focus Target", "Encounter start"),
      p(2, "Ciphas Shield & Strangler", "Focus Target", "Heirad dies"),
      p(3, "Kel'sara Mark of Death", "Kite & Burn", "Ciphas dies"),
    ],
    wipeMechanics: [
      {
        name: "Surging Chain Lightning",
        description: "A missed interrupt on Heirad's empowered cast wipes the group outright.",
      },
    ],
    victoryEvent: "All three Dread Guard defeated",
  },
  {
    id: "tfb_operator_ix",
    name: "Operator IX",
    bossNames: ["operator ix"],
    adds: ["Regulator", "Shield Recon Drone", "Decontamination Droid"],
    phases: [
      p(1, "Core Color Deletion Puzzle", "Terminal Sequencing", "Encounter start"),
      p(2, "Direct Combat", "Boss Extraction", "Core deactivated"),
    ],
    wipeMechanics: [
      {
        name: "Black Shield Protocol",
        description: "Mismatched colour circles or a timed-out core triggers a deletion blast.",
      },
    ],
    victoryEvent: "Boss defeated",
  },
  {
    id: "tfb_kephess_the_undying",
    name: "Kephess the Undying",
    bossNames: ["kephess the undying"],
    adds: ["Corrupted Energy Entity"],
    phases: [
      p(1, "Hypergate Pylon Pulses", "Pylon Alignment", "Encounter start"),
      p(2, "Radioactive Leaping & Singularity", "Kiting", "50% health"),
    ],
    wipeMechanics: [
      {
        name: "Hypergate Resonance Blast",
        description: "Kephess standing in the beam, or a failed vacuum pull, is catastrophic.",
      },
    ],
    victoryEvent: "Boss defeated",
  },
  {
    id: "tfb_terror_from_beyond",
    name: "The Terror From Beyond",
    bossNames: ["the terror from beyond", "terror from beyond"],
    adds: ["Grasping Tentacle", "Spitting Tentacle", "Unstable Hypergate Abomination"],
    phases: [
      p(1, "First Platform & Tentacles", "Island Warfare", "Encounter start"),
      p(2, "Hypergate Realm Platforms", "Realm Transition", "50% health"),
      p(3, "The Final Burn", "Platform Leaping", "Below 15% health"),
    ],
    wipeMechanics: [
      {
        name: "Scream of the Deep",
        description: "Failing tentacles before every platform is smashed drops the raid into void.",
      },
    ],
    victoryEvent: "Terror defeated",
  },
]);

const SNV = operation("snv", [
  {
    id: "snv_dashroode",
    name: "Dash'Roode",
    bossNames: ["dash'roode"],
    adds: ["Voracious Xuvva", "Sand Crawler", "Environmental Shield Generator"],
    phases: [p(1, "Shield Generator Trek", "Mobile Shield Escort", "Encounter start")],
    wipeMechanics: [
      {
        name: "Atmospheric Flaying Sandstorm",
        description: "Letting the shield battery deplete stacks a lethal raid-wide bleed.",
      },
    ],
    victoryEvent: "Boss defeated",
  },
  {
    id: "snv_titan_6",
    name: "Titan 6",
    bossNames: ["titan 6"],
    adds: ["Titan Air-Strike Drone"],
    phases: [
      p(1, "Ground Barrage & Missile Drops", "Rock Hiding", "Encounter start"),
      p(2, "Launch Sequence", "Intermission", "Titan launches into the sky"),
      p(3, "Burn Enrage", "Soft Enrage", "20% health"),
    ],
    wipeMechanics: [
      {
        name: "Launch Protocol",
        description:
          "Not sheltering behind rock pillars during the orbital launch vaporises the raid.",
      },
    ],
    victoryEvent: "Boss defeated",
  },
  {
    id: "snv_thrasher",
    name: "Thrasher",
    bossNames: ["thrasher"],
    adds: ["Mercenary Demolitionist", "Corrupted Firebug"],
    phases: [p(1, "Arena Engagement & Wall Snipers", "Knockup Protocol", "Encounter start")],
    wipeMechanics: [
      {
        name: "Rampart Sniper Saturation",
        description: "Surviving wall snipers carpet-bomb the lower arena.",
      },
    ],
    victoryEvent: "Boss defeated",
  },
  {
    id: "snv_operations_chief",
    name: "Operations Chief",
    bossNames: ["operations chief"],
    adds: ["City Defense Turret", "Mercenary Infiltrator"],
    phases: [
      p(1, "City Sector Clearing", "Split Infiltration", "Pulling the city gates"),
      p(2, "Operations Chief Ambush", "Boss Defense", "Teams converge on the command tower"),
    ],
    wipeMechanics: [
      {
        name: "Base Security Alarm",
        description: "Failing to disable security nodes simultaneously sounds the alarm.",
      },
    ],
    victoryEvent: "Boss defeated",
  },
  {
    id: "snv_olok_the_shadow",
    name: "Olok the Shadow",
    bossNames: ["olok the shadow"],
    adds: ["War Droid", "Bodyguard Enforcer"],
    phases: [
      p(1, "Droid Auction", "Puzzle Wave", "Encounter start"),
      p(2, "Direct Engagement", "Stealth & Cleave", "All droid cages cleared"),
    ],
    wipeMechanics: [
      {
        name: "Automated Defense Surge",
        description: "Releasing every heavy war droid at once overwhelms the tanks.",
      },
    ],
    victoryEvent: "Boss defeated",
  },
  {
    id: "snv_cartel_warlords",
    name: "Cartel Warlords",
    bossNames: ["captain horic", "tu'chuk", "vilus garr", "sunder"],
    victoryRequires: ["captain horic", "tu'chuk", "vilus garr", "sunder"],
    adds: ["Cartel Bodyguard"],
    phases: [
      p(
        1,
        "Kill Order Strategy",
        "Sequential Elimination",
        "Encounter start; each death buffs the rest",
      ),
    ],
    wipeMechanics: [
      {
        name: "Sunder's Fixate",
        description: "Sunder reaching his fixate target, or enraging last, deals lethal cleaves.",
      },
    ],
    victoryEvent: "All four Warlords defeated",
  },
  {
    id: "snv_dread_master_styrak",
    name: "Dread Master Styrak",
    // The Kell Dragon is phase one, so seeing it identifies the encounter, but
    // only Styrak's death clears it.
    bossNames: ["dread master styrak", "kell dragon"],
    victoryRequires: ["dread master styrak"],
    adds: ["Kell Dragon", "Apparition of Chained Torment", "Phantasm"],
    phases: [
      p(1, "Kell Dragon Engagement", "Pet Boss", "Encounter start"),
      p(2, "Phantasm Infiltration", "Ring DPS Check", "Kell Dragon dies"),
      p(3, "Giant Spectral Dragon", "Burn", "Below 15% health"),
    ],
    wipeMechanics: [
      {
        name: "Nightmare Chained Torment",
        description: "Inner-ring phantasms reaching the centre detonate the raid.",
      },
    ],
    victoryEvent: "Boss defeated",
  },
]);

const DF = operation("df", [
  {
    id: "df_nefra",
    name: "Nefra, Who Bars the Way",
    bossNames: ["nefra, who bars the way", "nefra"],
    adds: [],
    phases: [p(1, "Tank Cleave & Cleansing", "Dot Management", "Encounter start")],
    wipeMechanics: [
      {
        name: "Voice of the Masters",
        description: "Uncleansed raid-wide bleed ramps exponentially.",
      },
    ],
    victoryEvent: "Boss defeated",
  },
  {
    id: "df_gate_commander_draxus",
    name: "Gate Commander Draxus",
    bossNames: ["gate commander draxus", "draxus"],
    adds: ["Subterfuge Droid", "Dismantler", "Corruptor", "Guardian"],
    phases: [p(1, "Defensive Waves 1-9", "Sequential Waves", "Boss drops shield and departs")],
    wipeMechanics: [
      {
        name: "Dismantler Slam",
        description: "An uninterrupted Dismantler slam kills instantly.",
      },
    ],
    victoryEvent: "Draxus defeated in wave nine",
  },
  {
    id: "df_grobthok",
    name: "Grob'thok, Who Feeds the Forge",
    bossNames: ["grob'thok, who feeds the forge", "grob'thok"],
    adds: ["Ugnaught Miner", "Forged Roamer"],
    phases: [p(1, "Smelting Furnace Positioning", "Magnet Protocol", "Encounter start")],
    wipeMechanics: [
      {
        name: "Overhead Magnet Drop Miss",
        description: "Adds not pulled under the molten drop accumulate until the raid falls.",
      },
    ],
    victoryEvent: "Boss defeated",
  },
  {
    id: "df_corruptor_zero",
    name: "Corruptor Zero",
    bossNames: ["corruptor zero"],
    adds: ["Corrupted Anti-Personnel Droid", "Corrupted Combat Droid"],
    phases: [
      p(1, "Calibration Waves", "Add Waves", "Encounter start to 20%"),
      p(2, "Unified Protocol", "Soft Enrage", "20% health"),
    ],
    wipeMechanics: [
      {
        name: "Chest Laser Cleave",
        description: "The uninterruptible laser barrage kills anyone who fails to step out.",
      },
    ],
    victoryEvent: "Boss defeated",
  },
  {
    id: "df_dread_master_brontes",
    name: "Dread Master Brontes",
    bossNames: ["dread master brontes", "brontes"],
    adds: ["Finger of Brontes", "Corrupted Clone", "Energy Sphere"],
    phases: [
      p(1, "Hands & Energy Orbs", "Orb Popping", "Encounter start"),
      p(2, "Lightning Matrix Clock", "Beam Rotation", "50% health"),
      p(3, "Six Finger Extraction", "Tentacle Burn", "Shield collapse"),
      p(4, "Two Giant Hands", "Final Burn", "Below 15% health"),
    ],
    wipeMechanics: [
      {
        name: "Clock Beam Intersection",
        description: "Touching the rotating beam in phase two is immediately lethal.",
      },
    ],
    victoryEvent: "Boss defeated",
  },
]);

const DP = operation("dp", [
  {
    id: "dp_bestia",
    name: "Dread Master Bestia",
    bossNames: ["dread master bestia", "bestia"],
    adds: ["Dread Larva", "Dread Monster"],
    phases: [
      p(1, "Monster Summoning Waves", "Add Spawning", "Encounter start"),
      p(2, "Direct Combat & Pools", "Boss Burn", "50% health or monsters cleared"),
    ],
    wipeMechanics: [
      {
        name: "Empowered Monster Stacks",
        description: "Dread Monsters absorbing red pools gain stacks that one-shot tanks.",
      },
    ],
    victoryEvent: "Bestia retreats to the throne",
  },
  {
    id: "dp_tyrans",
    name: "Dread Master Tyrans",
    bossNames: ["dread master tyrans", "tyrans"],
    adds: [],
    phases: [p(1, "Tactical Tile Removal Grid", "Floor Management", "Encounter start")],
    wipeMechanics: [
      {
        name: "Tile Depletion",
        description: "Dropping Simplification circles centrally removes the floor.",
      },
    ],
    victoryEvent: "Tyrans retreats to the throne",
  },
  {
    id: "dp_calphayus",
    name: "Dread Master Calphayus",
    bossNames: ["dread master calphayus", "calphayus"],
    adds: ["Corrupted Vision", "Energy Crystal"],
    phases: [
      p(1, "Present Realm", "Baseline", "Encounter start"),
      p(2, "Past & Future Portals", "Split Timeline", "75% and 50% health"),
    ],
    wipeMechanics: [
      {
        name: "Temporal Paradox",
        description: "Harvesting the future seed before planting the past one wipes the raid.",
      },
    ],
    victoryEvent: "Calphayus retreats to the throne",
  },
  {
    id: "dp_raptus",
    name: "Dread Master Raptus",
    bossNames: ["dread master raptus", "raptus"],
    adds: ["Shadow of Raptus"],
    phases: [p(1, "Trial Portals & Ground Duel", "Role Challenges", "Encounter start")],
    wipeMechanics: [
      {
        name: "Force Execution",
        description: "The high-speed cone slash kills anyone not behind him.",
      },
    ],
    victoryEvent: "Raptus retreats to the throne",
  },
  {
    id: "dp_dread_council",
    name: "The Dread Council",
    bossNames: [
      "dread master bestia",
      "dread master tyrans",
      "dread master calphayus",
      "dread master raptus",
    ],
    victoryRequires: [
      "dread master bestia",
      "dread master tyrans",
      "dread master calphayus",
      "dread master raptus",
    ],
    adds: ["Kell Dragon Ghost", "Dread Projection"],
    phases: [
      p(1, "Initial Pairings", "Rotational Pairings", "Encounter start; push masters below 50%"),
      p(2, "All Four Masters", "Quad Boss", "Masters drop from thrones; bring all to 15%"),
      p(3, "Dread Crystal Convergence", "Final DPS Race", "Masters merge into spectral avatars"),
    ],
    wipeMechanics: [
      {
        name: "Uneven Death Enrage",
        description: "Killing one master early in phase two massively buffs the rest.",
      },
    ],
    victoryEvent: "All Dread Masters destroyed",
  },
]);

const RAV = operation("rav", [
  {
    id: "rav_sparky",
    name: "Sparky",
    bossNames: ["sparky"],
    adds: ["Sparky's Broodling", "Pack Hunter"],
    phases: [p(1, "Delicious Stacks & Pounce", "Tank Swap", "Encounter start")],
    wipeMechanics: [
      {
        name: "Broodling Overrun",
        description: "Uncontrolled broodlings let Sparky feast into a frenzy.",
      },
    ],
    victoryEvent: "Boss defeated",
  },
  {
    id: "rav_quartermaster_bulo",
    name: "Quartermaster Bulo",
    bossNames: ["quartermaster bulo", "bulo"],
    adds: ["Pirate Loader", "Deckhand Sniper"],
    phases: [p(1, "Barrel Toss & Cart Moving", "Kiting", "Encounter start")],
    wipeMechanics: [
      {
        name: "Barrel Conflagration",
        description: "Barrels dropped into add clusters or the raid detonate the room.",
      },
    ],
    victoryEvent: "Boss defeated",
  },
  {
    id: "rav_torque",
    name: "Torque",
    bossNames: ["torque"],
    adds: ["Shoots-Lasers Droid", "Maintenance Droid", "Disrepair Console"],
    phases: [p(1, "Ship Console Defense", "Console Management", "Encounter start")],
    wipeMechanics: [
      {
        name: "Total Console Destruction",
        description: "All four bridge consoles burning triggers automated venting.",
      },
    ],
    victoryEvent: "Boss defeated",
  },
  {
    id: "rav_master_and_blaster",
    name: "Master & Blaster",
    bossNames: ["master", "blaster"],
    victoryRequires: ["master", "blaster"],
    adds: ["Ion Cutter Droid", "Resonance Mine"],
    phases: [
      p(1, "Blaster Active", "Walker Tanking", "Encounter start"),
      p(2, "Master Descends", "Master DPS", "Blaster at 60% health"),
      p(3, "Dual Tank Burn", "Twin Boss Burn", "Both bosses engaged; floor collapses"),
    ],
    wipeMechanics: [
      {
        name: "Resonance Mine Cascade",
        description: "Mines detonating together chain into a raid wipe.",
      },
    ],
    victoryEvent: "Both bosses defeated",
  },
  {
    id: "rav_coratanni",
    name: "Coratanni & Ruugar",
    bossNames: ["coratanni", "ruugar"],
    adds: ["Pearl", "Ruugar's Smuggled Droid"],
    phases: [
      p(1, "Bridge Battle", "Deck Combat", "Encounter start; push Coratanni to 20%"),
      p(2, "Escape Pod Deck", "Ruugar Duel", "Take the escape pod to Ruugar's hold"),
    ],
    wipeMechanics: [
      {
        name: "Scatter Gun Execution",
        description: "Ruugar facing the hostage or raid delivers a fatal shotgun spread.",
      },
    ],
    victoryEvent: "Ruugar defeated",
  },
]);

const TOS = operation("tos", [
  {
    id: "tos_malaphar",
    name: "Malaphar the Savage",
    bossNames: ["malaphar the savage", "malaphar"],
    adds: ["Savage Beastling"],
    phases: [p(1, "Red/Blue Ring Management", "Ring Cycling", "Encounter start")],
    wipeMechanics: [
      {
        name: "Savage Roar",
        description: "High un-cleansed red stacks turn the raid scream lethal.",
      },
    ],
    victoryEvent: "Boss defeated",
  },
  {
    id: "tos_sword_squadron",
    name: "Sword Squadron",
    bossNames: [
      "sword squadron unit one",
      "sword squadron unit two",
      "sword squadron unit 1",
      "sword squadron unit 2",
      "sword squadron",
    ],
    victoryRequires: ["sword squadron unit one", "sword squadron unit two"],
    adds: ["Huge Grenadier Droid", "Shield Probe Droid"],
    phases: [p(1, "Dual Walker Defense", "Shield Switch", "Encounter start")],
    wipeMechanics: [
      {
        name: "Mega-Blast Orbital Cannons",
        description: "Shields unbroken after the 45-second charge fires lethal artillery.",
      },
    ],
    victoryEvent: "Both walkers destroyed",
  },
  {
    id: "tos_underlurker",
    name: "The Underlurker",
    bossNames: ["the underlurker", "underlurker"],
    adds: ["Lurkerling", "Fallen Rock Formation"],
    phases: [p(1, "Lurkerling Spawns & Cross Collapse", "Formation Check", "Encounter start")],
    wipeMechanics: [
      {
        name: "Cross Collapse Failure",
        description: "Failing the four-way cross positioning wipes the raid instantly.",
      },
    ],
    victoryEvent: "Boss defeated",
  },
  {
    id: "tos_revanite_commanders",
    name: "Revanite Commanders",
    bossNames: ["commander derok", "commander sano", "commander kurse", "derok", "sano", "kurse"],
    victoryRequires: ["derok", "sano", "kurse"],
    adds: ["Revanite Zealot", "Revanite Heavy Gunner"],
    phases: [p(1, "Tri-Commander Rotation", "Rotating Engagement", "Encounter start")],
    wipeMechanics: [
      {
        name: "Thermal Bomb Cluster",
        description: "Overlapping thermal circles deal lethal simultaneous damage.",
      },
    ],
    victoryEvent: "All three Commanders defeated",
  },
  {
    id: "tos_revan",
    name: "Revan",
    bossNames: ["revan"],
    adds: ["Force Aberration", "Revan's Blade", "Energy Core"],
    phases: [
      p(1, "Ground Platform Combat", "Pillars", "Encounter start to 70%"),
      p(2, "Catwalk Ascension", "Catwalk Movement", "70% to 50%"),
      p(3, "The Machine Floor", "Heave & Saber Burn", "50% to 9%"),
      p(4, "The Core Sacrifice Burn", "Final DPS Race", "Below 9% health"),
    ],
    wipeMechanics: [
      {
        name: "The Machine Unleashed",
        description: "Failing to burn the Core within 30 seconds wipes the raid.",
      },
    ],
    victoryEvent: "Core destroyed / Revan vanquished",
  },
]);

const GOTM = operation("gotm", [
  {
    id: "gotm_tyth",
    name: "Tyth",
    bossNames: ["tyth", "tyth, god of rage"],
    adds: ["Grace Droid", "Guardian Droid", "Justice Droid"],
    phases: [p(1, "Rage Meter & Sweeping Slash", "Rage Management", "Encounter start")],
    wipeMechanics: [
      {
        name: "Rage Overload Slam",
        description: "Tyth reaching 100 Rage triggers an uninterruptible arena cleave.",
      },
    ],
    victoryEvent: "Boss defeated",
  },
  {
    id: "gotm_aivela_and_esne",
    name: "Aivela & Esne",
    bossNames: ["aivela", "esne"],
    victoryRequires: ["aivela", "esne"],
    adds: ["Remote Probe Droid", "Synthesis Droid"],
    phases: [
      p(1, "Dual Battery / Beam Cycling", "Polarity Modulation", "Encounter start"),
      p(2, "Overdrive Nexus", "Twin Boss Convergence", "40% health"),
    ],
    wipeMechanics: [
      {
        name: "Mismatched Modulation",
        description: "Taking a beam while tuned to the opposite polarity is catastrophic.",
      },
    ],
    victoryEvent: "Both bosses defeated",
  },
  {
    id: "gotm_nahut",
    name: "Nahut",
    bossNames: ["nahut", "nahut, the son of shadow"],
    adds: ["Grounded Disruptor Turret", "Hyper-Shield Drone"],
    phases: [
      p(1, "Shadow Cloaking & Rail Car", "Scanner Kiting", "Encounter start"),
      p(2, "Central Platform Collapse", "Ring Burn", "25% health"),
    ],
    wipeMechanics: [
      {
        name: "Stealth Ambush",
        description: "Nahut unbroken by scanner lasers executes players one by one.",
      },
    ],
    victoryEvent: "Boss defeated",
  },
  {
    id: "gotm_scyva",
    name: "Scyva",
    bossNames: ["scyva", "scyva, the mother of sorrows"],
    adds: ["Ignite Droid", "Extinction Infiltrator", "Atomic Remnant Core"],
    phases: [
      p(1, "Radiant Shield Matrix", "Add Waves", "Encounter start"),
      p(2, "Scyva Descent", "Boss Burn", "50% health"),
    ],
    wipeMechanics: [
      {
        name: "Ignite Droid Meltdown",
        description: "An Ignite droid reaching full heat explodes the arena.",
      },
    ],
    victoryEvent: "Boss defeated",
  },
  {
    id: "gotm_izax",
    name: "Izax",
    bossNames: ["izax", "izax, the destroyer"],
    adds: ["Anchor Drone", "Energy Tether Node", "Induction Conductor"],
    phases: [
      p(1, "Hull Battle & Tether Hooks", "Tether Mechanics", "Encounter start"),
      p(2, "Missile Defense", "Kiting", "75% health"),
      p(3, "Induction Generator Puzzle", "Shield Reflection", "45% health"),
      p(4, "The Final Descent", "Final DPS Race", "Below 10% health"),
    ],
    wipeMechanics: [
      {
        name: "Omnidirectional Destroyer Beam",
        description: "Failing to redirect the central laser incinerates the deck.",
      },
    ],
    victoryEvent: "Boss defeated",
  },
]);

const DXUN = operation("dxun", [
  {
    id: "dxun_red",
    name: "Red",
    // "red" alone is generic, so the full title carries the match where present.
    bossNames: ["red, the pack alpha", "red"],
    adds: ["Reptilian Hunter", "Felshade Prowler"],
    phases: [
      p(1, "Forest Stalking", "Flare Mechanic", "Encounter start"),
      p(2, "Alpha Showdown", "Boss Burn", "Below 30% health"),
    ],
    wipeMechanics: [
      {
        name: "Pack Ambush",
        description: "Unrevealed prowlers stack bleeds until the group is slaughtered.",
      },
    ],
    victoryEvent: "Boss defeated",
  },
  {
    id: "dxun_geonosian_queen",
    name: "Mutated Geonosian Queen",
    bossNames: ["mutated geonosian queen"],
    adds: ["Royal Guard Geonosian", "Pheromone Larva"],
    phases: [
      p(1, "Royal Guard Wave Defense", "Pheromone Swaps", "Encounter start"),
      p(2, "Aerial Bombardment", "Acid Pools", "50% health"),
    ],
    wipeMechanics: [
      {
        name: "Caustic Pheromone Cascade",
        description: "Royal Guards surviving their enrage timer cause a room-wide acid shock.",
      },
    ],
    victoryEvent: "Queen defeated",
  },
  {
    id: "dxun_holding_facility",
    name: "Holding Facility",
    bossNames: ["greus", "hissyphus", "kronissus", "titax"],
    victoryRequires: ["greus", "hissyphus", "kronissus", "titax"],
    adds: ["Czerka Security Guard", "Environmental Laser Turret"],
    phases: [p(1, "The Multi-Train Holding Track", "Track Shifting", "Encounter start")],
    wipeMechanics: [
      {
        name: "Freight Impact",
        description: "Standing on an active rail when the warning lights flash is fatal.",
      },
    ],
    victoryEvent: "All four Trandoshans defeated",
  },
  {
    id: "dxun_huntmaster",
    name: "The Huntmaster",
    bossNames: ["the huntmaster", "huntmaster"],
    adds: ["Cybernetic Beast", "Sniper Drone"],
    phases: [
      p(1, "Trap Activation & Beast Luring", "Pen Management", "Encounter start"),
      p(2, "Direct Confrontation", "Burn", "Beast pens exhausted"),
    ],
    wipeMechanics: [
      {
        name: "Ambush Sniper Barrage",
        description: "Losing line of sight discipline during the reticle phase is an execution.",
      },
    ],
    victoryEvent: "Boss defeated",
  },
  {
    id: "dxun_apex_vanguard",
    name: "Apex Vanguard",
    bossNames: ["apex vanguard"],
    adds: ["Acid Droid", "Battery Power Terminal"],
    phases: [
      p(1, "Battery Charging & Acid Neutralization", "Battery Carrying", "Encounter start"),
      p(2, "Overheated Photogenesis", "Soft Enrage", "20% health"),
    ],
    wipeMechanics: [
      {
        name: "Photogenesis Nuclear Burst",
        description: "Failing to blind the Vanguard with charged consoles annihilates the room.",
      },
    ],
    victoryEvent: "Boss defeated",
  },
]);

const R4 = operation("r4", [
  {
    id: "r4_ip_cpt",
    name: "IP-CPT",
    bossNames: ["ip-cpt"],
    adds: ["Maintenance Probe", "Security Enforcer Droid"],
    phases: [
      p(1, "Subroutine Puzzle & Shield Cleave", "Console Encryption", "Encounter start"),
      p(2, "Terminal Overload Burn", "Final DPS Race", "25% health"),
    ],
    wipeMechanics: [
      {
        name: "Security Purge Protocol",
        description: "A wrong terminal input or timeout wipes the platform.",
      },
    ],
    victoryEvent: "Boss defeated",
  },
  {
    id: "r4_watchdog",
    name: "Watchdog",
    bossNames: ["watchdog"],
    adds: ["Targeting Sensor Drone"],
    phases: [
      p(1, "Rocket Jump & Mine Field", "Mine Placement", "Encounter start"),
      p(2, "Thermal Overdrive", "Soft Enrage", "20% health"),
    ],
    wipeMechanics: [
      {
        name: "Proximity Mine Cascade",
        description: "Two mines tripped together chain-react into a wipe.",
      },
    ],
    victoryEvent: "Boss defeated",
  },
  {
    id: "r4_lord_kanoth",
    name: "Lord Kanoth",
    bossNames: ["lord kanoth", "kanoth"],
    adds: ["Void Abberation", "Corrupted Echo"],
    phases: [
      p(1, "Fire & Void Floor Tiles", "Tile Management", "Encounter start"),
      p(2, "The Void Dimension Descent", "Shadow Realm", "50% health"),
    ],
    wipeMechanics: [
      {
        name: "Total Platform Corruption",
        description: "Mis-flipped tiles leave the room entirely void with no safe ground.",
      },
    ],
    victoryEvent: "Boss defeated",
  },
  {
    id: "r4_lady_dominique",
    name: "Lady Dominique",
    bossNames: ["lady dominique", "dominique"],
    adds: ["Gray Star Mercenary", "Cultist Fanatic", "ARIA"],
    phases: [
      p(1, "Upper Ring Platform", "Laser Tethering", "Encounter start"),
      p(2, "Center Reactor Core Descent", "Reactor Burn", "40% health"),
    ],
    wipeMechanics: [
      {
        name: "Resonance Dark Nova",
        description: "The dark energy tether reaching full saturation destroys the station.",
      },
    ],
    victoryEvent: "Boss defeated",
  },
]);

const LAIR = operation("lair", [
  {
    id: "lair_golden_fury",
    name: "Golden Fury",
    bossNames: ["golden fury"],
    adds: ["Isotope-5 Containment Droid"],
    phases: [p(1, "Laser Induction & Radiation Puddles", "Puddle Drop", "Encounter start")],
    wipeMechanics: [
      {
        name: "Isotope-5 Elimination Beam",
        description: "Failing to break line of sight during the laser channel is lethal.",
      },
    ],
    victoryEvent: "Boss defeated",
  },
  {
    id: "lair_colossal_monolith",
    name: "Colossal Monolith",
    bossNames: ["colossal monolith", "monolith"],
    adds: ["Rift Anomaly"],
    phases: [p(1, "Color Curse Breaking & Rifts", "Debuff Cleansing", "Encounter start")],
    wipeMechanics: [
      {
        name: "Devouring Darkness Outburst",
        description: "Unsealed planar rifts let the Monolith siphon power and wipe the group.",
      },
    ],
    victoryEvent: "Boss defeated",
  },
  {
    id: "lair_hive_mountain_queen",
    name: "Mutated Geonosian Queen (Hive of the Mountain Queen)",
    bossNames: ["mutated geonosian queen"],
    adds: ["Caustic Drone", "Knight Guard", "Pheromone Egg"],
    phases: [
      p(1, "Egg Stomp & Guard Off-Tanking", "Egg Crushing", "Encounter start"),
      p(2, "Caustic Scream & Submersion", "Acid Carpet", "40% health"),
    ],
    wipeMechanics: [
      {
        name: "Unchecked Royal Guard Enrage",
        description: "Knight Guards surviving their window enrage and one-shot tanks.",
      },
    ],
    victoryEvent: "Boss defeated",
  },
]);

export const ENCOUNTERS: readonly Encounter[] = [
  ...EV,
  ...KP,
  ...EC,
  ...TFB,
  ...SNV,
  ...DF,
  ...DP,
  ...RAV,
  ...TOS,
  ...GOTM,
  ...DXUN,
  ...R4,
  ...LAIR,
];

export const ENCOUNTERS_BY_ID = new Map(ENCOUNTERS.map((e) => [e.id, e]));
