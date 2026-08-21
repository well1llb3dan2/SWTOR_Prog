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
    bossNpcIds: ["3153571147153408", "3058837053505536", "3153575442120704", "3153558262251520"],
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
    bossNpcIds: ["3152463045591040", "3016450021261312", "3152467340558336", "3152458750623744"],
    adds: ["Titan Air-Strike Drone", "Titan Probe"],
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
    bossNpcIds: ["3154567579566080", "3045819007631360", "3154571874533376", "3154563284598784"],
    adds: ["Mercenary Demolitionist", "Corrupted Firebug", "Dustclaw Alpha", "Dustclaw Ravager", "Dustclaw Packling"],
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
    bossNpcIds: ["3157552581836800", "3141940375715840", "3157556876804096", "3157548286869504"],
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
    bossNpcIds: ["3154674953748480", "3016445726294016", "3154679248715776", "3154662068846592"],
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
    bossNpcIds: [
      "3054400352288768", "3032770896986112",
      "3032753717116928", "3054408942223360",
      "3156899746807808", "3156904041775104", "3032779486920704", "3156895451840512", "3054413237190656",
      "3054404647256064", "3032766602018816",
    ],
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
    bossNpcIds: [
      "3067057620910080",
      "3066945951760384", "3152407211016192", "3152441570754560", "3152445865721856",
      "3147154466013184",
      "3225679353085952",
    ],
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

const FLASHPOINTS = [
  operation("fp_ess", [
    {
      id: "fp_ess_lieutenant_isric",
      name: "Lieutenant Isric",
      bossNames: ["lieutenant isric"],
      adds: ["imperial boarding commando"],
      phases: [p(1, "Airlock Breach", "Single-Target Ground", "Encounter pull")],
      wipeMechanics: [
        {
          name: "Focused Concussion Volley",
          description: "Unmitigated Full Auto channels on non-tanks cause lethal burst damage.",
        },
      ],
      victoryEvent: "Boss defeated",
    },
    {
      id: "fp_ess_ironfist",
      name: "Ironfist",
      bossNames: ["ironfist"],
      adds: ["imperial boarding marine"],
      phases: [p(1, "Hangar Defense", "Ranged Cleave & Cover Advance", "Encounter pull")],
      wipeMechanics: [
        {
          name: "Headshot Execution",
          description: "Failing to hide behind pillars during Headshot casts is instant death.",
        },
      ],
      victoryEvent: "Boss defeated",
    },
    {
      id: "fp_ess_iss799",
      name: "ISS-799 Heavy Droid",
      bossNames: ["iss-799 heavy droid"],
      adds: ["security maintenance drone"],
      phases: [p(1, "Engine Bay Core", "Frontal Cleave & Knockback", "Encounter pull")],
      wipeMechanics: [
        {
          name: "Concussive Pulse Punt",
          description: "Standing behind the tank during the knockback sends players off the catwalk.",
        },
      ],
      victoryEvent: "Boss defeated",
    },
    {
      id: "fp_ess_vokk",
      name: "Vokk",
      bossNames: ["vokk"],
      adds: [],
      phases: [p(1, "Bridge Showdown", "Ground AoE Avoidance", "Encounter pull")],
      wipeMechanics: [
        {
          name: "Lightning Whirlwind Trap",
          description: "Standing in the purple lightning circles stacks lethal electrical damage.",
        },
      ],
      victoryEvent: "Boss defeated",
    },
  ]),
  operation("fp_bt", [
    {
      id: "fp_bt_gxr5",
      name: "GXR-5 Sabotage Droid",
      bossNames: ["gxr-5 sabotage droid"],
      adds: [],
      phases: [p(1, "Engine Deck Burn", "Frontal Flamethrower Management", "Encounter pull")],
      wipeMechanics: [
        { name: "Flamethrower Sweep", description: "Unmitigated conal fire sweeps kill non-tanks." },
      ],
      victoryEvent: "Boss defeated",
    },
    {
      id: "fp_bt_borga",
      name: "Borga the Enforcer",
      bossNames: ["borga the enforcer", "borga"],
      adds: ["mercenary guard"],
      phases: [p(1, "Cargo Hold Defense", "Melee Cleave & Adds", "Encounter pull")],
      wipeMechanics: [
        { name: "Crushing Cleave", description: "High physical cleave hits non-tanks if the boss is turned inward." },
      ],
      victoryEvent: "Boss defeated",
    },
    {
      id: "fp_bt_commander_ghon",
      name: "Commander Ghon",
      bossNames: ["commander ghon"],
      adds: ["republic defense soldier"],
      phases: [p(1, "Bridge Annex Assault", "Interrupt & Cleave", "Encounter pull")],
      wipeMechanics: [
        { name: "Concussion Grenade Stun", description: "A long stun on the tank leaves healers exposed." },
      ],
      victoryEvent: "Boss defeated",
    },
    {
      id: "fp_bt_yadira_ban",
      name: "Yadira Ban",
      bossNames: ["yadira ban"],
      adds: [],
      phases: [p(1, "Force Leap & Cyclone Nova", "Pull & Expand Avoidance", "Encounter pull")],
      wipeMechanics: [
        { name: "Cyclone Nova Blast", description: "Remaining in the white circle at the end of the cast is fatal." },
      ],
      victoryEvent: "Boss defeated",
    },
  ]),
  operation("fp_hs", [
    {
      id: "fp_hs_dn314_tunneler",
      name: "DN-314 Tunneler",
      bossNames: ["dn-314 tunneler"],
      adds: ["demolition probe droid"],
      phases: [p(1, "Mining Laser & Probes", "Laser Sweeps & Add Bursts", "Encounter pull")],
      wipeMechanics: [
        { name: "Mining Laser Incineration", description: "Standing in front of the beam rapidly kills non-tanks." },
      ],
      victoryEvent: "Boss defeated",
    },
    {
      id: "fp_hs_vorgan_the_volcano",
      name: "Vorgan the Volcano",
      bossNames: ["vorgan the volcano"],
      adds: ["vorgan's war beast"],
      phases: [p(1, "War Hound Off-Tanking & Grenades", "Add Focus & Ground Fire", "Encounter pull")],
      wipeMechanics: [
        { name: "Incendiary Puddle Stacking", description: "Overlapping fire patches under healers become lethal." },
      ],
      victoryEvent: "Boss defeated",
    },
    {
      id: "fp_hs_battlelord_kreshan",
      name: "Battlelord Kreshan",
      bossNames: ["battlelord kreshan"],
      adds: ["station combat engineer"],
      phases: [p(1, "Bridge Suppression", "Cleave & Engineer Waves", "Encounter pull")],
      wipeMechanics: [
        { name: "Thermal Grenade Detonation", description: "Grouping up while carrying red circles causes lethal overlap." },
      ],
      victoryEvent: "Boss defeated",
    },
  ]),
  operation("fp_athiss", [
    {
      id: "fp_athiss_professor_leysok",
      name: "Professor Ley'sok",
      bossNames: ["professor ley'sok"],
      adds: ["corrupted droid"],
      phases: [p(1, "Excavation Site Ambush", "Ranged Burn & Droid Cleave", "Encounter pull")],
      wipeMechanics: [
        { name: "Full Auto Volley", description: "High channeled single-target damage against non-tanks is lethal." },
      ],
      victoryEvent: "Boss defeated",
    },
    {
      id: "fp_athiss_beast_vodal_kressh",
      name: "Beast of Vodal Kressh",
      bossNames: ["beast of vodal kressh"],
      adds: ["tomb lurkerling"],
      phases: [p(1, "Ancient Tomb Cleave", "Kiting & Add Priority", "Encounter pull")],
      wipeMechanics: [
        { name: "Trampling Stomp", description: "Failing to kite during enrage results in massive melee damage." },
      ],
      victoryEvent: "Boss defeated",
    },
    {
      id: "fp_athiss_prophet_vodal",
      name: "The Prophet of Vodal",
      bossNames: ["the prophet of vodal"],
      adds: ["corrupted cultist", "flame sphere"],
      phases: [p(1, "Dark Ritual & Flame Spheres", "Kiting & Ground Fire", "Encounter pull")],
      wipeMechanics: [
        { name: "Fiery Doom Explosion", description: "Uncleansed Fiery Doom detonates after 10 seconds and wipes the party." },
      ],
      victoryEvent: "Boss defeated",
    },
  ]),
  operation("fp_mr", [
    {
      id: "fp_mr_brax",
      name: "Brax the Untamed",
      bossNames: ["brax the untamed"],
      adds: ["corrupted war hound"],
      phases: [p(1, "Beast Focus & Tank Swap", "Hound Priority", "Encounter pull")],
      wipeMechanics: [
        { name: "Packmaster Bloodrage", description: "Leaving hounds alive past 60 seconds grants a lethal attack-speed buff." },
      ],
      victoryEvent: "Boss defeated",
    },
    {
      id: "fp_mr_boarding_party_trio",
      name: "Mandalorian Squad",
      bossNames: ["chandra", "korg", "kurk"],
      victoryRequires: ["chandra", "korg", "kurk"],
      adds: ["mandalorian vanguard"],
      phases: [p(1, "Three-Target Kill Order", "Crowd Control & Focus", "Encounter pull")],
      wipeMechanics: [
        { name: "Coordinated Crossfire", description: "Leaving all three bosses active without crowd control overwhelms healing." },
      ],
      victoryEvent: "Squad defeated",
    },
    {
      id: "fp_mr_mavrix_var",
      name: "Mavrix Var",
      bossNames: ["mavrix var"],
      adds: ["automated defense cannon"],
      phases: [p(1, "Catwalk Jetpack Leaps", "Platform Swapping", "Encounter pull")],
      wipeMechanics: [
        { name: "Automated Defense Crossfire", description: "Failing to kill catwalk turrets quickly pins the party in lethal crossfire." },
      ],
      victoryEvent: "Boss defeated",
    },
  ]),
  operation("fp_cad", [
    {
      id: "fp_cad_officer_xander",
      name: "Officer Xander & Guard Droid",
      bossNames: ["officer xander", "enforcer droid"],
      victoryRequires: ["officer xander", "enforcer droid"],
      adds: ["cademimu patrol enforcer"],
      phases: [p(1, "Dual Synergy", "Shield Sharing & Cleave", "Encounter pull")],
      wipeMechanics: [
        { name: "Overcharge Laser Grid", description: "Allowing the droid to reach full energy stacks triggers a lethal sweep." },
      ],
      victoryEvent: "Both defeated",
    },
    {
      id: "fp_cad_captain_grimlyk",
      name: "Captain Grimlyk",
      bossNames: ["captain grimlyk"],
      adds: ["cademimu heavy mercenary"],
      phases: [p(1, "Slum Barricade", "Add Waves & Frontal Fire", "Encounter pull")],
      wipeMechanics: [
        { name: "Flamethrower Cleave", description: "Unmitigated conal flamethrowers kill non-tank players rapidly." },
      ],
      victoryEvent: "Boss defeated",
    },
    {
      id: "fp_cad_general_ortol",
      name: "General Ortol",
      bossNames: ["general ortol"],
      adds: [],
      phases: [p(1, "Missile Thruster Ignition", "Quadrant Hazard Management", "Encounter pull")],
      wipeMechanics: [
        { name: "Rocket Silo Exhaust Incineration", description: "Standing on active exhaust grates during ignition is fatal." },
      ],
      victoryEvent: "Boss defeated",
    },
  ]),
  operation("fp_tv", [
    {
      id: "fp_tv_handler_gorshaa",
      name: "Handler Gorshaa",
      bossNames: ["handler gorshaa"],
      adds: ["imperial attack hound"],
      phases: [p(1, "Jungle Gate Encounter", "Beast Priority & Snare Cleansing", "Encounter pull")],
      wipeMechanics: [
        { name: "Hound Frenzy Bleed", description: "Stacking bleed from hounds overwhelms healers." },
      ],
      victoryEvent: "Boss defeated",
    },
    {
      id: "fp_tv_lord_hasper",
      name: "Lord Hasper",
      bossNames: ["lord hasper"],
      adds: [],
      phases: [p(1, "Temple Steps Duel", "Lightning Ground AoE Avoidance", "Encounter pull")],
      wipeMechanics: [
        { name: "Force Lightning Tempest", description: "Uninterrupted lightning storm deals heavy party-wide damage." },
      ],
      victoryEvent: "Boss defeated",
    },
    {
      id: "fp_tv_general_edikar",
      name: "General Edikar",
      bossNames: ["general edikar"],
      adds: ["fortress defense turret", "security reinforcement"],
      phases: [p(1, "Command Bunker", "Turret Clearing & Cleave", "Encounter pull")],
      wipeMechanics: [
        { name: "Artillery Crossfire", description: "Ignoring turrets lets them focus-fire party members down one by one." },
      ],
      victoryEvent: "Boss defeated",
    },
  ]),
  operation("fp_bp", [
    {
      id: "fp_bp_major_alven",
      name: "Major Alven",
      bossNames: ["major alven"],
      adds: ["republic security droid"],
      phases: [p(1, "Deck Corridor Firefight", "Add Waves & Ranged Interrupts", "Encounter pull")],
      wipeMechanics: [
        { name: "Explosive Shot Burst", description: "Unmitigated high single-target burst against non-tanks is lethal." },
      ],
      victoryEvent: "Boss defeated",
    },
    {
      id: "fp_bp_commander_jorland",
      name: "Commander Jorland",
      bossNames: ["commander jorland", "chief engineer kels", "medic silar"],
      victoryRequires: ["commander jorland", "chief engineer kels", "medic silar"],
      adds: ["security combat probe"],
      phases: [p(1, "Focus Kill Order", "Target Priority", "Encounter pull")],
      wipeMechanics: [
        { name: "Orbital Strike Saturation", description: "Standing in overlapping zones causes instant death." },
      ],
      victoryEvent: "All 3 officers defeated",
    },
  ]),
  operation("fp_mp", [
    {
      id: "fp_mp_colonel_daksh",
      name: "Colonel Daksh",
      bossNames: ["colonel daksh"],
      adds: ["prison security droid"],
      phases: [p(1, "Cybernetic Eye Overdrive", "Kite Behind Pillars", "Encounter pull")],
      wipeMechanics: [
        { name: "Cybernetic Laser Beam", description: "Remaining in line of sight during the laser eye phase is instant death." },
      ],
      victoryEvent: "Boss defeated",
    },
    {
      id: "fp_mp_grand_moff_kilran",
      name: "Grand Moff Kilran",
      bossNames: ["grand moff kilran"],
      adds: ["imperial sniper guard", "heavy security droid"],
      phases: [p(1, "Catwalk Trench Advance", "Cover-to-Cover Advance", "Encounter pull")],
      wipeMechanics: [
        { name: "Aimed Snipe One-Shot", description: "Moving in the open while targeted with red laser sight is lethal." },
      ],
      victoryEvent: "Boss defeated",
    },
  ]),
  operation("fp_foundry", [
    {
      id: "fp_foundry_hk47",
      name: "HK-47",
      bossNames: ["hk-47"],
      adds: ["foundry defense droid", "core shield generator"],
      phases: [p(1, "Direct Fire & Snipe", "Turret & Tanking", "Encounter pull")],
      wipeMechanics: [
        { name: "Assassination Protocol Snipe", description: "Unmitigated channeled sniper attacks during stealth are instant execution." },
      ],
      victoryEvent: "Boss defeated",
    },
    {
      id: "fp_foundry_revan",
      name: "Revan",
      bossNames: ["revan"],
      adds: [],
      phases: [p(1, "Force Mastery & Push", "Dual Saber Combat", "Encounter pull")],
      wipeMechanics: [
        { name: "Asteroid Impact Crash", description: "Failing to move from asteroid targeting zones causes crushing death." },
      ],
      victoryEvent: "Revan teleports / vanquished",
    },
  ]),
  operation("fp_d7", [
    {
      id: "fp_d7_bulwark",
      name: "Bulwark",
      bossNames: ["bulwark"],
      adds: ["bulwark repair droid"],
      phases: [p(1, "Defense Shield Cycles", "Console Slicing & Shield Break", "Encounter pull")],
      wipeMechanics: [
        { name: "Energy Shield Shockwave", description: "Attacking Bulwark during the shield reflection phase wipes DPS players." },
      ],
      victoryEvent: "Boss defeated",
    },
    {
      id: "fp_d7_mentor",
      name: "Mentor",
      bossNames: ["mentor"],
      adds: ["core defense claw", "assassination droid"],
      phases: [p(1, "Power Core Slicing", "Console Interaction & Claws", "Encounter pull")],
      wipeMechanics: [
        { name: "Core Cleansing Laser Sweep", description: "Sweeping room lasers instantly vaporise anyone caught in their path." },
      ],
      victoryEvent: "Mentor core destroyed",
    },
  ]),
  operation("fp_boi", [
    {
      id: "fp_boi_gark",
      name: "Gark the Indomitable",
      bossNames: ["gark the indomitable"],
      adds: ["gamorrean honor guard"],
      phases: [p(1, "Trench Line Defense", "Add Cleave & Frontal Smash", "Encounter pull")],
      wipeMechanics: [
        { name: "Enraged Overhead Smash", description: "High physical cleave hits non-tanks if the boss turns toward the group." },
      ],
      victoryEvent: "Boss defeated",
    },
    {
      id: "fp_boi_darth_serevin",
      name: "Darth Serevin & Commander Krel",
      bossNames: ["darth serevin", "commander krel"],
      victoryRequires: ["darth serevin", "commander krel"],
      adds: ["ilum crystal formation"],
      phases: [p(1, "Dual Engagement", "Stealth & Cleave", "Encounter pull")],
      wipeMechanics: [
        { name: "Crystal Storm Explosion", description: "The crystal throw must be interrupted to prevent lethal party damage." },
      ],
      victoryEvent: "Both defeated",
    },
  ]),
  operation("fp_fe", [
    {
      id: "fp_fe_tregg",
      name: "Tregg the Destroyer",
      bossNames: ["tregg the destroyer"],
      adds: ["trandoshan hunter"],
      phases: [p(1, "Hangar Platform Cleave", "Pounce & Add Wave", "Encounter pull")],
      wipeMechanics: [
        { name: "Frenzied Axe Sweep", description: "Unmitigated 360-degree axe spins tear through melee players." },
      ],
      victoryEvent: "Boss defeated",
    },
    {
      id: "fp_fe_jindo_kress",
      name: "Jindo Kress",
      bossNames: ["jindo kress"],
      adds: ["ship console turret"],
      phases: [p(1, "Ship Suppression & Console Interaction", "Starship Missile Defense", "Encounter pull")],
      wipeMechanics: [
        { name: "Starship Missile Barrage", description: "Failing to fire the anti-aircraft console lets the ship bomb the party." },
      ],
      victoryEvent: "Boss defeated",
    },
    {
      id: "fp_fe_darth_malgus",
      name: "Darth Malgus",
      bossNames: ["darth malgus"],
      adds: [],
      phases: [p(1, "Throne Room Duel", "Choke & Force Leap", "Encounter pull")],
      wipeMechanics: [
        { name: "Unlimited Power Channeled Wipe", description: "Failing to knock Malgus into the chasm during the sub-10% channel wipes the party." },
      ],
      victoryEvent: "Malgus defeated / chasm fall",
    },
  ]),
  operation("fp_li", [
    {
      id: "fp_li_putrid_shaclaw",
      name: "Putrid Shaclaw",
      bossNames: ["putrid shaclaw"],
      adds: ["shaclaw broodling"],
      phases: [p(1, "Island Cave Cleave", "Acid Pools & Swarms", "Encounter pull")],
      wipeMechanics: [
        { name: "Caustic Puddle Overlap", description: "Standing in acid pools reduces armor and rapidly ticks down health." },
      ],
      victoryEvent: "Boss defeated",
    },
    {
      id: "fp_li_lr5_sentinel",
      name: "LR-5 Sentinel Droid",
      bossNames: ["lr-5 sentinel droid"],
      adds: ["plasma sphere anomaly"],
      phases: [p(1, "Incinerate Interrupts & Plasma Orbs", "Strict Interrupt Rotation", "Encounter pull")],
      wipeMechanics: [
        { name: "Incinerate Cast Completion", description: "A single uninterrupted Incinerate cast kills players in two seconds." },
      ],
      victoryEvent: "Boss defeated",
    },
    {
      id: "fp_li_sav_rak",
      name: "Project Sav-Rak",
      bossNames: ["project sav-rak"],
      adds: [],
      phases: [p(1, "Platform Pipe Leap", "Platform Swapping & Pipe Slicing", "Encounter pull")],
      wipeMechanics: [
        { name: "Acid Volley Channeled Overload", description: "Failing to click all three pipe release terminals allows lethal acid barrage." },
      ],
      victoryEvent: "Boss defeated",
    },
    {
      id: "fp_li_doctor_lorrick",
      name: "Doctor Lorrick",
      bossNames: ["doctor lorrick"],
      adds: ["mutated kolto experiment", "rakghoul ravager"],
      phases: [p(1, "Lab Chemical Toss & Vats", "Kiting & Satchel Bombs", "Encounter pull")],
      wipeMechanics: [
        { name: "Corrosive Acid Saturation", description: "Leaving toxic beaker pools overlapping the center wipes the group." },
      ],
      victoryEvent: "Boss defeated",
    },
  ]),
  operation("fp_kaon", [
    {
      id: "fp_kaon_rakghoul_behemoth",
      name: "Rakghoul Behemoth",
      bossNames: ["rakghoul behemoth"],
      adds: ["infected citizen", "explosive flare barrel"],
      phases: [p(1, "Armor Flare Burning", "Kiting to Flare Barrels", "Encounter pull")],
      wipeMechanics: [
        { name: "Unmitigated Behemoth Slam", description: "Failing to break his armor with flares causes a hard enrage." },
      ],
      victoryEvent: "Boss defeated",
    },
    {
      id: "fp_kaon_kr824",
      name: "KR-824 Military Droid",
      bossNames: ["kr-824 military droid"],
      adds: ["kaon security drone"],
      phases: [p(1, "City Square Defense", "Suppression Fire & Shields", "Encounter pull")],
      wipeMechanics: [
        { name: "Suppression Mortar Direct Hit", description: "Direct mortar impact deals lethal kinetic burst damage." },
      ],
      victoryEvent: "Boss defeated",
    },
    {
      id: "fp_kaon_commander_lox",
      name: "Commander Lox",
      bossNames: ["commander lox"],
      adds: ["infected mercenary"],
      phases: [p(1, "Rooftop Last Stand", "Add Control & Ranged Cleave", "Encounter pull")],
      wipeMechanics: [
        { name: "Aimed Concussion Shot", description: "High-powered sniper fire without defensives is lethal." },
      ],
      victoryEvent: "Boss defeated",
    },
  ]),
  operation("fp_czlabs", [
    {
      id: "fp_czlabs_cz8x",
      name: "CZ-8X Eradicator Droid",
      bossNames: ["cz-8x eradicator droid"],
      adds: ["lab security sentry"],
      phases: [p(1, "Hangar Platform Laser", "Laser Sweeps & Droid Cleave", "Encounter pull")],
      wipeMechanics: [
        { name: "Thermal Laser Cleave", description: "Unmitigated 180-degree laser sweeps burn through party health." },
      ],
      victoryEvent: "Boss defeated",
    },
    {
      id: "fp_czlabs_rasmus_blys",
      name: "Rasmus Blys",
      bossNames: ["rasmus blys"],
      adds: ["mutated kolto experiment", "containment pod"],
      phases: [p(1, "Pod Venting & Serum Cleansing", "Kiting & Pod Slicing", "Encounter pull")],
      wipeMechanics: [
        { name: "Toxic Bacta Flood", description: "Failing to vent active tanks floods the lab with lethal poison." },
      ],
      victoryEvent: "Boss defeated",
    },
  ]),
  operation("fp_czcore", [
    {
      id: "fp_czcore_duneclaw",
      name: "Enhanced Duneclaw",
      bossNames: ["enhanced duneclaw"],
      adds: ["czerka lab hound"],
      phases: [p(1, "Bio-Dome Sandbox", "Ground Smash & Cleaves", "Encounter pull")],
      wipeMechanics: [
        { name: "Sandstorm Ground Pound", description: "Massive full-room knockbacks punt players into hazard fields." },
      ],
      victoryEvent: "Boss defeated",
    },
    {
      id: "fp_czcore_the_vigilant",
      name: "The Vigilant",
      bossNames: ["the vigilant"],
      adds: ["security maintenance drone"],
      phases: [p(1, "Generator Coolant Floor Slices", "Coolant Platform Puzzle", "Encounter pull")],
      wipeMechanics: [
        { name: "Plasma Vent Incineration", description: "Red overheated plates during venting cause immediate party incineration." },
      ],
      victoryEvent: "Boss defeated",
    },
  ]),
  operation("fp_aot", [
    {
      id: "fp_aot_dentiri_travik",
      name: "Master Liam Dentiri / Major Travik",
      bossNames: ["master liam dentiri", "major travik"],
      victoryRequires: ["master liam dentiri", "major travik"],
      adds: ["temple defender"],
      phases: [p(1, "Temple Sanctum Duel", "Holocron Buff Management", "Encounter pull")],
      wipeMechanics: [
        { name: "Force Cascade Detonation", description: "Failing to break holocron shielding channels causes lethal temple-wide Force explosions." },
      ],
      victoryEvent: "Boss defeated",
    },
  ]),
  operation("fp_ki", [
    {
      id: "fp_ki_soverus_jens",
      name: "Darth Soverus / Commander Jens",
      bossNames: ["darth soverus", "commander jens"],
      victoryRequires: ["darth soverus", "commander jens"],
      adds: ["sith academy acolyte"],
      phases: [p(1, "Academy Steps Bombardment", "Lightning Cages & Cleave", "Encounter pull")],
      wipeMechanics: [
        { name: "Lightning Cage Shock", description: "Touching the lightning cage perimeter causes chain electrocution to allies." },
      ],
      victoryEvent: "Boss defeated",
    },
  ]),
  operation("fp_manaan", [
    {
      id: "fp_manaan_m3o7",
      name: "Sentry Droid M3-O7",
      bossNames: ["sentry droid m3-o7"],
      adds: ["laboratory security sentry"],
      phases: [p(1, "Research Platform Defense", "Mine Drops & Cleave", "Encounter pull")],
      wipeMechanics: [
        { name: "Plasma Mine Chain Detonation", description: "Detonating multiple plasma mines at once wipes the party." },
      ],
      victoryEvent: "Boss defeated",
    },
    {
      id: "fp_manaan_ortuno",
      name: "Ortuno",
      bossNames: ["ortuno"],
      adds: ["manaan research defense drone"],
      phases: [p(1, "Submerged Deck & Lightning Calling", "Puddle Electrification Navigation", "Encounter pull")],
      wipeMechanics: [
        { name: "Electric Water Surge", description: "Standing in active water puddles during the lightning channel is fatal." },
      ],
      victoryEvent: "Boss defeated",
    },
    {
      id: "fp_manaan_stivastin",
      name: "Stivastin",
      bossNames: ["stivastin"],
      adds: ["ceiling fire pipe valve"],
      phases: [p(1, "Fire Pipe Kiting", "Shield Removal Hazard Puzzle", "Encounter pull")],
      wipeMechanics: [
        { name: "Invulnerability Overdrive Slam", description: "Failing to strip his shield via overhead fire dumps leads to an enrage one-shot stomp." },
      ],
      victoryEvent: "Boss defeated",
    },
  ]),
  operation("fp_rakata", [
    {
      id: "fp_rakata_arkous_goh",
      name: "Darth Arkous & Lord Goh",
      bossNames: ["darth arkous", "lord goh"],
      victoryRequires: ["darth arkous", "lord goh"],
      adds: ["revanite temple infiltrator"],
      phases: [p(1, "Twin Sith / Republic Engagement", "Dual Boss Tank Separation", "Encounter pull")],
      wipeMechanics: [
        { name: "Resonance Dark Storm", description: "Tanking both bosses inside 15 meters empowers their lightning casts into a group wipe." },
      ],
      victoryEvent: "Both bosses defeated",
    },
  ]),
  operation("fp_bh", [
    {
      id: "fp_bh_kyramla_gemas",
      name: "Kyramla Gemas",
      bossNames: ["kyramla gemas"],
      adds: ["jungle stalker beast"],
      phases: [p(1, "Arena Jungle Pit", "Kiting & Toxic Spore Clouds", "Encounter pull")],
      wipeMechanics: [
        { name: "Spore Gas Suffocation", description: "Standing in toxic clouds applies a high-damage poison debuff that overwhelms healers." },
      ],
      victoryEvent: "Boss defeated",
    },
    {
      id: "fp_bh_jos_and_valk",
      name: "Jos & Valk Beroya",
      bossNames: ["jos", "valk beroya"],
      victoryRequires: ["jos", "valk beroya"],
      adds: ["mandalorian war hound"],
      phases: [p(1, "Jos Ground Combat / Valk Balcony Sniping", "Shield Swapping", "Encounter pull")],
      wipeMechanics: [
        { name: "Couple Enrage Fury", description: "Defeating one spouse while the other remains at high HP enrage-wipes the party." },
      ],
      victoryEvent: "Both bosses defeated",
    },
    {
      id: "fp_bh_shae_vizla",
      name: "Shae Vizla",
      bossNames: ["shae vizla"],
      adds: ["mandalorian torchbearer", "mandalorian tracker"],
      phases: [p(1, "Flame Sweep & Jetpack Barrage", "Kiting & Ground Fire", "Encounter pull")],
      wipeMechanics: [
        { name: "Conflagration Carpet Bomb", description: "Overlapping rocket reticles during flight phases result in instant party incineration." },
      ],
      victoryEvent: "Boss defeated",
    },
  ]),
  operation("fp_rishi", [
    {
      id: "fp_rishi_rear_admiral_shai",
      name: "Rear Admiral Shai / Commander Ran Kramos",
      bossNames: ["rear admiral shai", "commander ran kramos"],
      victoryRequires: ["rear admiral shai", "commander ran kramos"],
      adds: ["revanite heavy gunner", "shield recon drone"],
      phases: [p(1, "Beachhead Artillery Suppression", "Shield Droid Interception", "Encounter pull")],
      wipeMechanics: [
        { name: "Orbital Mortar Carpet Bomb", description: "Stacking overlapping mortar circles causes immediate group death." },
      ],
      victoryEvent: "Boss defeated",
    },
  ]),
  operation("fp_umbara", [
    {
      id: "fp_umbara_slythe_stalker",
      name: "Slythe Stalker",
      bossNames: ["slythe stalker"],
      adds: ["umbaran shadow beast"],
      phases: [p(1, "Shadow Pounce & Acid Spit", "Stealth Tracking & Cleave", "Encounter pull")],
      wipeMechanics: [
        { name: "Shadow Acid Saturation", description: "Failing to break stealth leaves players pinned under fatal acid bleeds." },
      ],
      victoryEvent: "Boss defeated",
    },
    {
      id: "fp_umbara_technician_vance",
      name: "Technician Vance",
      bossNames: ["technician vance"],
      adds: ["umbaran tech-stalker", "automated rail turret"],
      phases: [p(1, "Train Car Movement & Grid Traps", "Dynamic Train Car Shifting", "Encounter pull")],
      wipeMechanics: [
        { name: "Electrified Grid Shock", description: "Getting knocked into electrified rail lines causes instant environmental death." },
      ],
      victoryEvent: "Boss defeated",
    },
  ]),
  operation("fp_copero", [
    {
      id: "fp_copero_syndic_zenta",
      name: "Syndic Zenta",
      bossNames: ["syndic zenta"],
      adds: ["chiss house security officer", "automated cryo-turret"],
      phases: [p(1, "Villa Courtyard Firefight", "Turret Clearing & Cryo Spread", "Encounter pull")],
      wipeMechanics: [
        { name: "Cryo-Freeze Barrage", description: "Getting frozen prevents dodging follow-up high-explosive sniper shots." },
      ],
      victoryEvent: "Boss defeated",
    },
    {
      id: "fp_copero_valen_hakan",
      name: "Valen & Hakan",
      bossNames: ["valen", "hakan"],
      victoryRequires: ["valen", "hakan"],
      adds: ["chiss security droid", "shield matrix pylon"],
      phases: [p(1, "Dual Melee / Sniper Synergy", "Twin Boss Positioning", "Encounter pull")],
      wipeMechanics: [
        { name: "Chiss Crossfire Snipe", description: "Failing to block line of sight during the dual-sniper charge deletes party members." },
      ],
      victoryEvent: "Both bosses defeated",
    },
  ]),
  operation("fp_nathema", [
    {
      id: "fp_nathema_vindicator_hushev",
      name: "Vindicator Hushev",
      bossNames: ["vindicator hushev"],
      adds: ["zealot defender", "purification probe"],
      phases: [p(1, "Sanitarium Gates Engagement", "Add Waves & Cleave", "Encounter pull")],
      wipeMechanics: [
        { name: "Purification Cleansing Blast", description: "Allowing purification probes to complete their heal triggers a full-party energy recoil." },
      ],
      victoryEvent: "Boss defeated",
    },
    {
      id: "fp_nathema_gemini_captain",
      name: "GEMINI Captain",
      bossNames: ["gemini captain"],
      adds: ["gemini clone unit"],
      phases: [p(1, "Laser Matrix & Reflection", "Laser Cleave & Reflection", "Encounter pull")],
      wipeMechanics: [
        { name: "GEMINI Feedback Overload", description: "Attacking the incorrect clone triggers full-party feedback wipe." },
      ],
      victoryEvent: "Boss defeated",
    },
  ]),
  operation("fp_meridian", [
    {
      id: "fp_meridian_darth_savik",
      name: "Darth Savik / General Daerunn",
      bossNames: ["darth savik", "general daerunn"],
      victoryRequires: ["darth savik", "general daerunn"],
      adds: ["sith assault droid", "republic commando"],
      phases: [p(1, "Shipyard Catwalk Duel", "Lightning Net Cleansing", "Encounter pull")],
      wipeMechanics: [
        { name: "Cybernetic Net Detonation", description: "Uncleansed lightning nets jump between allies and wipe the squad." },
      ],
      victoryEvent: "Boss defeated",
    },
    {
      id: "fp_meridian_apex_defense",
      name: "Shield Core / Apex Defense",
      bossNames: ["shield core", "commander defense"],
      victoryRequires: ["shield core", "commander defense"],
      adds: ["shipyard demolisher droid", "meridian shock trooper"],
      phases: [p(1, "Battery Core Assault", "Console Cooling & Add Defense", "Encounter pull")],
      wipeMechanics: [
        { name: "Coolant Vent Meltdown", description: "Failing to vent cooling conduits causes catastrophic reactor meltdown." },
      ],
      victoryEvent: "Boss defeated",
    },
  ]),
  operation("fp_sov", [
    {
      id: "fp_sov_bask_sunn",
      name: "Bask Sunn",
      bossNames: ["bask sunn"],
      adds: ["ash'ad scout drone"],
      phases: [p(1, "Hangar Deck Firefight", "Missile Kiting & Snipers", "Encounter pull")],
      wipeMechanics: [
        { name: "Concussion Barrage", description: "Stacking missile circles results in instant party wipe." },
      ],
      victoryEvent: "Boss defeated",
    },
    {
      id: "fp_sov_troya_aven",
      name: "Troya Aven",
      bossNames: ["troya aven"],
      adds: ["ash'ad sharpshooter", "ash'ad clan warrior"],
      phases: [p(1, "Bridge Suppression", "Grapple & Cryo Grenade Cleaves", "Encounter pull")],
      wipeMechanics: [
        { name: "Cryo-Detonation Chain", description: "Stacking cryo-grenades freezes the team and exposes them to missile strikes." },
      ],
      victoryEvent: "Boss defeated",
    },
    {
      id: "fp_sov_gorrasht",
      name: "Gorrasht & Heta Kol",
      bossNames: ["gorrasht", "heta kol"],
      victoryRequires: ["gorrasht", "heta kol"],
      adds: ["dar'manda heavy gunner", "dar'manda infiltrator"],
      phases: [p(1, "Hangar Deck Standoff", "Add Priority & Heavy Cleaves", "Encounter pull")],
      wipeMechanics: [
        { name: "Dar'manda Heavy Mortar Wave", description: "Allowing gunner adds to free-cast missile barrages wipes the group." },
      ],
      victoryEvent: "Boss defeated",
    },
  ]),
  operation("fp_sote", [
    {
      id: "fp_sote_gratua_sano",
      name: "Gra'tua & Sano",
      bossNames: ["gra'tua", "sano"],
      victoryRequires: ["gra'tua", "sano"],
      adds: ["dantooine mercenary gunner"],
      phases: [p(1, "Dual Arena Engagement", "Twin Boss Split & Turret Slicing", "Encounter pull")],
      wipeMechanics: [
        { name: "Suppression Crossfire Saturation", description: "Allowing both bosses to overlap suppression fire wipes the party." },
      ],
      victoryEvent: "Both bosses defeated",
    },
    {
      id: "fp_sote_captain_aven",
      name: "Captain Aven",
      bossNames: ["captain aven"],
      adds: ["enclave infiltrator droid"],
      phases: [p(1, "Courtyard Defense", "Satchel Disarm & Droid Cleave", "Encounter pull")],
      wipeMechanics: [
        { name: "Satchel Mine Explosion", description: "Detonation of uncleansed satchel charges wipes non-tanks." },
      ],
      victoryEvent: "Boss defeated",
    },
    {
      id: "fp_sote_malgus_apparition",
      name: "Malgus Apparition",
      bossNames: ["malgus apparition"],
      adds: ["dantooine sith phantasm"],
      phases: [p(1, "Enclave Sub-Level Duel", "Dark Force Reflection", "Encounter pull")],
      wipeMechanics: [
        { name: "Corrupted Dark Force Storm", description: "A channeled room-wide storm must be interrupted immediately." },
      ],
      victoryEvent: "Apparition banished",
    },
  ]),
  operation("fp_nul", [
    {
      id: "fp_nul_apex_predator",
      name: "Apex Predator",
      bossNames: ["apex predator"],
      adds: ["elom snow stalker"],
      phases: [p(1, "Snowy Ridge Combat", "Avalanche & Knockbacks", "Encounter pull")],
      wipeMechanics: [
        { name: "Glacial Avalanche Punt", description: "Getting knocked off the mountain cliff causes irreversible environmental death." },
      ],
      victoryEvent: "Boss defeated",
    },
    {
      id: "fp_nul_lord_korkan",
      name: "Lord Korkan",
      bossNames: ["lord korkan"],
      adds: ["awakened sith behemoth", "corrupted temple probe"],
      phases: [p(1, "Relic Activation & Darkness Cleave", "Relic Cleansing & Add Control", "Encounter pull")],
      wipeMechanics: [
        { name: "Dark Relic Overload", description: "Failure to destroy active relic conduits triggers an arena-wide dark Force explosion." },
      ],
      victoryEvent: "Boss defeated",
    },
  ]),
  operation("fp_sos", [
    {
      id: "fp_sos_corrupted_keeper",
      name: "The Corrupted Keeper",
      bossNames: ["the corrupted keeper"],
      adds: ["corrupted gormak zealot", "silent shroud anomaly"],
      phases: [p(1, "Shrine Miasma & Curse Cleansing", "Voss Shrine Curse Management", "Encounter pull")],
      wipeMechanics: [
        { name: "Miasma Curse Saturation", description: "Accumulating maximum cursed miasma stacks causes lethal ticks and party collapse." },
      ],
      victoryEvent: "Boss defeated",
    },
    {
      id: "fp_sos_corrupted_abomination",
      name: "The Corrupted Abomination",
      bossNames: ["the corrupted abomination"],
      adds: ["cursed gormak cultist", "purification font basin"],
      phases: [p(1, "Cursed Miasma & Shrine Cleansing", "Voss Font Interaction", "Encounter pull")],
      wipeMechanics: [
        { name: "Miasma Decay Collapse", description: "Accumulating 10 stacks of cursed miasma triggers instant death and spreads the debuff." },
      ],
      victoryEvent: "Boss defeated",
    },
  ]),
];

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
  ...FLASHPOINTS.flat(),
];

export const ENCOUNTERS_BY_ID = new Map(ENCOUNTERS.map((e) => [e.id, e]));
