Below is the complete engineering and mechanics specification for every Operation and Lair encounter in *Star Wars: The Old Republic* (scaled for Level 80, v7.0+), structured with **Architectural Datasheets**, **State-Flow & Phase Transition Maps**, and **Detailed Phase Rules**.

---

# 1. The Eternity Vault (EV)

```
[B1: Annihilator 6524] ──► [B2: Gharj] ──► [B3: Ancient Pylons] ──► [B4: Infernal Council] ──► [B5: Soa]
```

---

### Boss 1: Annihilator 6524
* **Location:** Belsavis | **Tiers:** SM / VM / MM | **Level:** 80
* **Base FQN / Engine ID:** `bkg.area.raid.eternity_vault` / `bkg.npc.ep80_ops.ev.annihilator_6524` (`16141054238515093774`)

| Boss / Encounter | Phases | Key Entities & Adds | Encounter Mechanics / Target Types |
| :--- | :--- | :--- | :--- |
| **Annihilator 6524** | **P1 (100%–0%):** Static tanking & Turret Burn.<br>**P2 (Periodic Loop):** Missile Salvo AoE.<br>**P3 (5:00):** Hard Enrage. | • Annihilator 6524<br>• Defense Turret A & B | • Frontal Cleave / Swipe.<br>• Missile Salvo (Raid-wide continuous channel).<br>• Static Turret ground fire. |

#### State Flow Map
```
[Phase 1: Initial Assault & Turret Spawn] (100% HP)
       │
       ▼ (Periodic 45s Timer or Boss Cast)
[Phase 2: Missile Salvo Suppression]
       │
       ▼ (Salvo Channel Finishes)
[Return to Phase 1 Combat Loop] ──(Timer ≥ 5:00)──► [Phase 3: Hard Enrage]
       │
       ▼ (Boss HP = 0%)
   [VICTORY]
```

#### Detailed Phase Breakdown & State Rules
* **Phase 1: Initial Assault & Turret Spawn (100%–0%)**
  * **Entry Trigger:** Combat initiation with Annihilator 6524.
  * **Active Entities:** Annihilator 6524, 2 Defense Turrets.
  * **Mechanics & State Rules:** Main tank faces boss away from raid to prevent cleave. Off-tank/DPS burn both Defense Turrets immediately.
  * **Exit Condition:** Boss initiates *Missile Salvo* cast or reaches 0% HP.
* **Phase 2: Missile Salvo Suppression (Periodic)**
  * **Entry Trigger:** Boss casts *Missile Salvo*.
  * **Active Entities:** Annihilator 6524.
  * **Mechanics & State Rules:** Boss channels high unmitigated raid-wide damage for 6 seconds. Raid stacks in group shields; healers rotate AoE burst heals.
  * **Exit Condition:** Channel expires $\rightarrow$ Returns to Phase 1 state.
* **Terminal Condition (Kill):** Boss receives `Death` event ($0\%$ HP).

---

### Boss 2: Gharj
* **Location:** Belsavis | **Tiers:** SM / VM / MM | **Level:** 80
* **Base FQN / Engine ID:** `bkg.npc.ep80_ops.ev.gharj` (`16141054238515093775`)

| Boss / Encounter | Phases | Key Entities & Adds | Encounter Mechanics / Target Types |
| :--- | :--- | :--- | :--- |
| **Gharj** | **P1 (100%–75%):** Platform 1.<br>**P2 (75%–50%):** Platform 2.<br>**P3 (50%–25%):** Platform 3.<br>**P4 (25%–0%):** Final Island Burn. | • Gharj (Lava Beast)<br>• Cave Prowlers | • Molten Leap & Platform sinking.<br>• Knockback / Magma environmental death.<br>• Prowler add waves. |

#### State Flow Map
```
[Phase 1: Island 1] (100% - 75%)
       │
       ▼ (Boss HP ≤ 75% -> Molten Leap)
[Phase 2: Island 2 & Prowler Adds] (75% - 50%)
       │
       ▼ (Boss HP ≤ 50% -> Molten Leap)
[Phase 3: Island 3 & Prowler Adds] (50% - 25%)
       │
       ▼ (Boss HP ≤ 25% -> Molten Leap)
[Phase 4: Island 4 Final Burn] (25% - 0%)
       │
       ▼ (Boss HP = 0%)
   [VICTORY]
```

#### Detailed Phase Breakdown & State Rules
* **Phase 1 to Phase 3: Island Encounters (100%–25%)**
  * **Entry Trigger:** Engaging Gharj on active island.
  * **Active Entities:** Gharj, Cave Prowlers (spawn during island transitions).
  * **Mechanics & State Rules:** Tank positions Gharj with his back to solid rock to absorb *Frenzy Knockback*. At $75\%, 50\%$, and $25\%$, boss casts *Molten Leap* $\rightarrow$ Current island sinks into lava. Raid must cross temporary stone bridges to the next island while killing Prowlers.
  * **Exit Condition:** Boss HP reaches next threshold ($75\%, 50\%, 25\%$).
* **Phase 4: Final Island Burn (25%–0%)**
  * **Entry Trigger:** Gharj lands on Island 4.
  * **Active Entities:** Gharj.
  * **Mechanics & State Rules:** DPS execute cooldowns; tanks mitigate stacking armor shred.
  * **Terminal Condition (Kill):** Boss receives `Death` event ($0\%$ HP).

---

### Boss 3: Ancient Pylons
* **Location:** Belsavis | **Tiers:** SM / VM / MM | **Level:** 80
* **Base FQN / Engine ID:** `bkg.npc.ep80_ops.ev.ancient_pylons` (`16141054238515093776`)

| Boss / Encounter | Phases | Key Entities & Adds | Encounter Mechanics / Target Types |
| :--- | :--- | :--- | :--- |
| **Ancient Pylons** | **P1:** Tier 1 Lock.<br>**P2:** Tier 2 Lock.<br>**P3:** Tier 3 Lock.<br>**P4:** Tier 4 Lock. | • Infinite Corrupters<br>• Captive Wraiths<br>• Corrupted Acklays | • North & South Wheel Rotation Consoles.<br>• Symbol matching (Color & Icon).<br>• Console lockout timer. |

#### State Flow Map
```
[Phase 1: Tier 1 Alignment] ──(North/South Matched)──► [Tier 1 Locked]
       │
       ▼
[Phase 2: Tier 2 Alignment] ──(North/South Matched)──► [Tier 2 Locked]
       │
       ▼
[Phase 3: Tier 3 Alignment] ──(North/South Matched)──► [Tier 3 Locked]
       │
       ▼
[Phase 4: Tier 4 Alignment] ──(North/South Matched)──► [Tier 4 Locked] ──► [VICTORY]
```

#### Detailed Phase Breakdown & State Rules
* **Phases 1–4: Tier Locks (1 through 4)**
  * **Entry Trigger:** Clicking South or North Console 1.
  * **Active Entities:** Infinite Corrupters, Captive Wraiths, Acklays.
  * **Mechanics & State Rules:** Raid splits evenly (4 North, 4 South). Teams click consoles to rotate the giant wheel until both North and South display identical matched symbols. Every 30 seconds, add waves spawn; Corrupters must be interrupted and burned before they cast *Terminal Sequence Overload*.
  * **Exit Condition:** Tier 4 puzzle wheel locks.
* **Terminal Condition (Win):** Both North and South Tier 4 indicators turn green/locked.

---

### Boss 4: Infernal Council
* **Location:** Belsavis | **Tiers:** SM / VM / MM | **Level:** 80
* **Base FQN / Engine ID:** `bkg.npc.ep80_ops.ev.infernal_council` (`16141054238515093777`)

| Boss / Encounter | Phases | Key Entities & Adds | Encounter Mechanics / Target Types |
| :--- | :--- | :--- | :--- |
| **Infernal Council** | **P1 (100%–0%):** 1v1 Isolated Honor Duels. | • Sith Marauders (DPS targets)<br>• Sith Juggernauts (Tank targets)<br>• Sith Assassins (Healer/DPS targets) | • Interference Debuff (99% damage reduction on cross-target).<br>• Individual role checks. |

#### State Flow Map
```
[Phase 1: 1v1 Simultaneous Arena Duels Initiated]
       │
       ├──► Player A defeats Assigned Council Member
       ├──► Player B defeats Assigned Council Member
       └──► Player N defeats Assigned Council Member
       │
       ▼ (All Council Entities at 0% HP)
   [VICTORY]
```

#### Detailed Phase Breakdown & State Rules
* **Phase 1: Simultaneous Arena Duels (100%–0%)**
  * **Entry Trigger:** Any player attacks any council member.
  * **Active Entities:** 8 (or 16) Council Members.
  * **Mechanics & State Rules:** Each player engages exactly one council member. If any player heals another player or attacks a non-assigned target, the attacker receives *Interference* (cannot damage target, takes high reflective damage).
  * **Exit Condition / Terminal Condition:** All Council entities receive `Death` events.

---

### Boss 5: Soa, The Infernal One
* **Location:** Belsavis | **Tiers:** SM / VM / MM | **Level:** 80
* **Base FQN / Engine ID:** `bkg.npc.ep80_ops.ev.soa` (`16141054238515093778`)

| Boss / Encounter | Phases | Key Entities & Adds | Encounter Mechanics / Target Types |
| :--- | :--- | :--- | :--- |
| **Soa** | **P1 (100%–75%):** Upper Spire.<br>**T1:** First Drop.<br>**P2 (75%–30%):** Mid Platform.<br>**T2:** Second Drop.<br>**P3 (30%–0%):** Pylon Crushing Shield. | • Soa<br>• Mind Traps (Green Orbs)<br>• Lightning Balls | • Mind Trap breakout (DPS target).<br>• Lightning Ball orb soaks.<br>• Ancient Pylon shield crush. |

#### State Flow Map
```
[Phase 1: Upper Spire Platform] (100% - 75%)
       │
       ▼ (Soa HP ≤ 75% -> Floor Collapses)
[Transition 1: Platform Descent & Lightning Orb Clear]
       │
       ▼ (Raid Lands on Mid Level)
[Phase 2: Mid Level & Mind Traps] (75% - 30%)
       │
       ▼ (Soa HP ≤ 30% -> Floor Collapses)
[Transition 2: Platform Descent]
       │
       ▼ (Raid Lands on Ground Floor)
[Phase 3: Ground Floor Shield Crushing] (30% - 0%)
       │
       ▼ (Soa HP = 0%)
   [VICTORY]
```

#### Detailed Phase Breakdown & State Rules
* **Phase 1: Upper Spire Platform (100%–75%)**
  * **Entry Trigger:** Pulling Soa.
  * **Active Entities:** Soa, Lightning Balls.
  * **Mechanics & State Rules:** Tank positions Soa near center. Designated players run into *Lightning Balls* with personal defensives to pop them away from the group.
  * **Exit Condition:** Soa hits $75\%$ HP $\rightarrow$ Soa shields and shatters the platform floor.
* **Transition 1 & 2: Platform Descent**
  * **Mechanics:** Jump down platform to platform; break floating energy conduits to clear barriers.
* **Phase 2: Mid Level (75%–30%)**
  * **Entry Trigger:** Raid lands on the second platform.
  * **Mechanics & State Rules:** Soa casts *Mind Trap* (trapping a player inside a green orb; DPS must destroy orb immediately) + *Force Cyclone* (flings players into the air).
  * **Exit Condition:** Soa reaches $30\%$ HP $\rightarrow$ Floor collapses.
* **Phase 3: Ground Floor Shield Crushing (30%–0%)**
  * **Entry Trigger:** Raid reaches bottom floor.
  * **Active Entities:** Soa (Impenetrable Barrier), Falling Ancient Pylons.
  * **Mechanics & State Rules:** Soa is invulnerable. Tank must watch the ceiling for falling *Ancient Pylons* and drag Soa directly under the impact zone. The impact shatters Soa's shield for 15 seconds.
  * **Terminal Condition (Kill):** Soa reaches $0\%$ HP.

---

# 2. Karagga's Palace (KP)

```
[B1: Bonethrasher] ──► [B2: Jarg & Sorno] ──► [B3: Foreman Crusher] ──► [B4: Heavy Fabricator] ──► [B5: Karagga]
```

---

### Boss 1: Bonethrasher
* **Location:** Nal Hutta | **Tiers:** SM / VM / MM | **Level:** 80
* **Base FQN / Engine ID:** `bkg.npc.ep80_ops.kp.bonethrasher` (`16141062124584491021`)

| Boss / Encounter | Phases | Key Entities & Adds | Encounter Mechanics / Target Types |
| :--- | :--- | :--- | :--- |
| **Bonethrasher** | **P1 (100%–0%):** Targetless Arena Combat + Gate Add Waves. | • Bonethrasher (Acklay)<br>• Gamorrean Guards<br>• Cat Scanners | • Targetless Aggro (Random Swipes/Cleaves).<br>• Smash & Pit Knockbacks.<br>• Side-gate add clear. |

#### State Flow Map
```
[Phase 1: Targetless Combat & Add Gates] (100% - 0%)
       │
       ├──► Periodic: Gamorrean Guards Release from Gates
       ├──► Periodic: Cat Scanners Target Players
       │
       ▼ (Boss HP = 0%)
   [VICTORY]
```

#### Detailed Phase Breakdown & State Rules
* **Phase 1: Targetless Combat (100%–0%)**
  * **Entry Trigger:** Dropping into the pit.
  * **Active Entities:** Bonethrasher, Gamorrean Guards, Cat Scanners.
  * **Mechanics & State Rules:** Boss is immune to taunts and targets players at random. All players must stay clear of his front cone. Off-tank rounds up Gamorreans from side gates.
  * **Terminal Condition (Kill):** Bonethrasher reaches $0\%$ HP.

---

### Boss 2: Jarg & Sorno
* **Location:** Nal Hutta | **Tiers:** SM / VM / MM | **Level:** 80
* **Base FQN / Engine ID:** `bkg.npc.ep80_ops.kp.jarg_and_sorno` (`16141062124584491022`)

| Boss / Encounter | Phases | Key Entities & Adds | Encounter Mechanics / Target Types |
| :--- | :--- | :--- | :--- |
| **Jarg & Sorno** | **P1:** Dual Ground Engagement.<br>**P2:** Sorno Aerial / Jarg Berserk.<br>**P3:** Dual Ground Burn. | • Jarg (Melee/Flamethrower)<br>• Sorno (Ranged/Healer)<br>• Unload Droids | • Interrupt Sorno's *Heal* / *Unload*.<br>• Separate bosses (>20m).<br>• Balanced burn execution. |

#### State Flow Map
```
[Phase 1: Dual Ground Engagement]
       │
       ▼ (Sorno Flies into Air Pod)
[Phase 2: Sorno Aerial Bombardment & Jarg Berserk]
       │
       ▼ (Sorno Lands)
[Phase 3: Dual Ground Burn] ──(Simultaneous Kill ≤ 15s)──► [VICTORY]
```

#### Detailed Phase Breakdown & State Rules
* **Phase 1: Dual Ground Engagement**
  * **Entry Trigger:** Pulling Jarg or Sorno.
  * **Active Entities:** Jarg, Sorno.
  * **Mechanics & State Rules:** Main tank takes Jarg away from the group (Flamethrower). Off-tank holds Sorno; DPS interrupts Sorno's *Rapid Scan* (heal).
  * **Exit Condition:** Sorno flies into his overhead missile ship.
* **Phase 2: Sorno Aerial & Jarg Berserk**
  * **Entry Trigger:** Sorno becomes untargetable in the air.
  * **Active Entities:** Jarg (Berserk), Sorno Ship (Air Strike).
  * **Mechanics & State Rules:** Jarg deals increased melee damage; tanks use defensives. Raid steps out of blue reticle air strikes.
  * **Exit Condition:** Sorno lands back on the floor.
* **Phase 3: Dual Ground Burn**
  * **Entry Trigger:** Sorno lands.
  * **Mechanics & State Rules:** Balance boss HP to kill both within 15 seconds.
  * **Terminal Condition (Kill):** Both bosses reach $0\%$ HP.

---

### Boss 3: Foreman Crusher
* **Location:** Nal Hutta | **Tiers:** SM / VM / MM | **Level:** 80
* **Base FQN / Engine ID:** `bkg.npc.ep80_ops.kp.foreman_crusher` (`16141062124584491023`)

| Boss / Encounter | Phases | Key Entities & Adds | Encounter Mechanics / Target Types |
| :--- | :--- | :--- | :--- |
| **Foreman Crusher** | **P1 (100%–0%):** Tank Check & Frenzy / Add Loops. | • Foreman Crusher<br>• Gamorrean Bodyguards<br>• Gamorrean Grunts | • Frenzy tank buster.<br>• Ground Smash.<br>• Add grouping & AoE cleave. |

#### State Flow Map
```
[Phase 1: Baseline Combat] ──(Frenzy Cast)──► [Phase 2: Heavy Frenzy & Add Waves]
       ▲                                                    │
       └────────────────(Frenzy Ends)───────────────────────┘
       │
       ▼ (Boss HP = 0%)
   [VICTORY]
```

#### Detailed Phase Breakdown & State Rules
* **Phase 1 & 2: Baseline Combat & Frenzy Loop (100%–0%)**
  * **Entry Trigger:** Pulling Foreman Crusher.
  * **Active Entities:** Foreman Crusher, Gamorrean Adds.
  * **Mechanics & State Rules:** When Crusher casts *Frenzy*, main tank rotates heavy defensive cooldowns. Off-tank clusters add waves near the boss for DPS AoE cleave.
  * **Terminal Condition (Kill):** Boss reaches $0\%$ HP.

---

### Boss 4: G4-B3 Heavy Fabricator
* **Location:** Nal Hutta | **Tiers:** SM / VM / MM | **Level:** 80
* **Base FQN / Engine ID:** `bkg.npc.ep80_ops.kp.heavy_fabricator` (`16141062124584491024`)

| Boss / Encounter | Phases | Key Entities & Adds | Encounter Mechanics / Target Types |
| :--- | :--- | :--- | :--- |
| **G4-B3 Heavy Fabricator** | **P1 (100%–0%):** Console Puzzle, Sticky Mines, & Heavy Armor. | • G4-B3 Heavy Fabricator<br>• Security Droids<br>• Repair Droids | • Overhead puzzle console alignment.<br>• Payloads: Fire (Damage), Acid (De-buff), Stun.<br>• Sticky Grenade placement. |

#### State Flow Map
```
[Phase 1: Floor Combat & Overhead Console Grid Alignment]
       │
       ├──► Console Trigger: Drop Fire / Acid / Stun Payload on Boss
       ├──► Boss Armor Stacks Stripped
       │
       ▼ (Boss HP = 0%)
   [VICTORY]
```

#### Detailed Phase Breakdown & State Rules
* **Phase 1: Console Sequence & Payload Drops (100%–0%)**
  * **Entry Trigger:** Pulling Fabricator.
  * **Active Entities:** G4-B3 Heavy Fabricator, Security Droids, Repair Droids.
  * **Mechanics & State Rules:** Boss builds *Heavy Armor* stacks (reducing damage taken by up to 90%). Upper platform operators click consoles to line up 3 matching colors/symbols above the boss, dropping an acid/fire payload that resets boss armor stacks. Ground players run *Sticky Grenades* out.
  * **Terminal Condition (Kill):** Boss reaches $0\%$ HP.

---

### Boss 5: Karagga the Unyielding
* **Location:** Nal Hutta | **Tiers:** SM / VM / MM | **Level:** 80
* **Base FQN / Engine ID:** `bkg.npc.ep80_ops.kp.karagga` (`16141062124584491025`)

| Boss / Encounter | Phases | Key Entities & Adds | Encounter Mechanics / Target Types |
| :--- | :--- | :--- | :--- |
| **Karagga the Unyielding** | **P1 (100%–0%):** Walker Kiting & Hazard Avoidance. | • Karagga (Heavy Walker)<br>• Drill Probes<br>• Mouse Droids | • Burning Oil Slicks.<br>• Gravity Well (Pull & Root).<br>• Drill Probe focus fire. |

#### State Flow Map
```
[Phase 1: Perimeter Walker Kiting & Hazard Management] (100% - 0%)
       │
       ├──► Gravity Well Cast: Raid escapes pull center
       ├──► Drill Probes Spawn: Ranged DPS burn immediately
       │
       ▼ (Karagga HP = 0%)
   [VICTORY]
```

#### Detailed Phase Breakdown & State Rules
* **Phase 1: Perimeter Walker Kiting (100%–0%)**
  * **Entry Trigger:** Pulling Karagga.
  * **Active Entities:** Karagga, Drill Probes, Mouse Droids.
  * **Mechanics & State Rules:** Main tank kites Karagga along the room outer perimeter to lay *Burning Oil Slicks* away from the center. Raid moves out of *Gravity Well* pulls. Ranged DPS immediately destroy *Drill Probes*.
  * **Terminal Condition (Kill):** Karagga reaches $0\%$ HP.

---

# 3. Explosive Conflict (EC)

```
[B1: Zorn & Toth] ──► [B2: Firebrand & Stormcaller] ──► [B3: Colonel Vorgath] ──► [B4: Warlord Kephess]
```

---

### Boss 1: Zorn & Toth
* **Location:** Denova | **Tiers:** SM / VM / MM | **Level:** 80
* **Base FQN / Engine ID:** `bkg.npc.ep80_ops.ec.zorn_and_toth` (`16141078901243781900`)

| Boss / Encounter | Phases | Key Entities & Adds | Encounter Mechanics / Target Types |
| :--- | :--- | :--- | :--- |
| **Zorn & Toth** | **P1 (100%–0%):** Split Tanking, Fear Swaps, & Baradium Spikes. | • Zorn (Ranged/Red)<br>• Toth (Melee/Purple) | • Proximity Enrage (>30m separation).<br>• Fear / Berserk Tank Swap.<br>• Baradium Spikes jump.<br>• Balanced Kill. |

#### State Flow Map
```
[Phase 1: Dual Split Tanking] (100% - 0%)
       │
       ├──► Zorn casts Fear ──────────────► Tanks Swap Boss Targets
       ├──► Toth casts Baradium Spikes ───► Raid spreads / defensives
       │
       ▼ (Both Bosses HP ≤ 0% within 10s)
   [VICTORY]
```

#### Detailed Phase Breakdown & State Rules
* **Phase 1: Dual Split Tanking (100%–0%)**
  * **Entry Trigger:** Engaging Zorn or Toth.
  * **Active Entities:** Zorn, Toth.
  * **Mechanics & State Rules:** Keep bosses $>30\text{m}$ apart. When Zorn casts *Fear*, tanks swap bosses immediately (taunt swap). When Toth jumps for *Baradium Spikes*, raid spreads out. Both bosses must die within 10 seconds of each other.
  * **Terminal Condition (Kill):** Both bosses reach $0\%$ HP.

---

### Boss 2: Firebrand & Stormcaller
* **Location:** Denova | **Tiers:** SM / VM / MM | **Level:** 80
* **Base FQN / Engine ID:** `bkg.npc.ep80_ops.ec.firebrand_and_stormcaller` (`16141078901243781901`)

| Boss / Encounter | Phases | Key Entities & Adds | Encounter Mechanics / Target Types |
| :--- | :--- | :--- | :--- |
| **Firebrand & Stormcaller** | **P1:** Ground Walker Engagement.<br>**P2:** Shield Dome & Overloads.<br>**P3 (Sub-20%):** Dual Enrage. | • Firebrand (Tank)<br>• Stormcaller (Tank)<br>• Trandoshan Demolitionists<br>• Generator Overloads | • Incinerate Armor swap.<br>• Double Death Mark soak.<br>• Hull generator destruction. |

#### State Flow Map
```
[Phase 1: Dual Walker Engagement]
       │
       ▼ (Periodic / HP: Defensive Shields Deploy)
[Phase 2: Generator Shields & Demolitionist Adds]
       │
       ▼ (Overload Generators Destroyed -> Shields Drop)
[Return to Phase 1 Combat Loop] ──(Both Walkers ≤ 20% HP)──► [Phase 3: Dual Enrage Burn]
       │
       ▼ (Both Walkers at 0% HP)
   [VICTORY]
```

#### Detailed Phase Breakdown & State Rules
* **Phase 1: Ground Walker Engagement**
  * **Entry Trigger:** Engaging Firebrand or Stormcaller.
  * **Active Entities:** Firebrand, Stormcaller.
  * **Mechanics & State Rules:** Main tank holds Firebrand (swapping on *Incinerate Armor* stacks). Off-tank holds Stormcaller; two designated players stand in Stormcaller's *Double Death Mark* reticles to soak lightning.
  * **Exit Condition:** Walkers raise immune shield domes.
* **Phase 2: Shield Dome & Generator Overload**
  * **Entry Trigger:** Shield deployment.
  * **Active Entities:** Shield Overloads, Trandoshan Demolitionists.
  * **Mechanics & State Rules:** Assigned DPS jump onto walker hulls to destroy *Generator Overloads*. Ground team burns *Demolitionists* before they plant explosives.
  * **Exit Condition:** All overloads destroyed.
* **Phase 3: Dual Enrage Burn (Sub-20%)**
  * **Entry Trigger:** Both walkers reach $\le 20\%$ HP.
  * **Mechanics & State Rules:** Walkers gain permanent *Overdrive*; burn down both targets simultaneously.
  * **Terminal Condition (Kill):** Both walkers reach $0\%$ HP.

---

### Boss 3: Colonel Vorgath
* **Location:** Denova | **Tiers:** SM / VM / MM | **Level:** 80
* **Base FQN / Engine ID:** `bkg.npc.ep80_ops.ec.colonel_vorgath` (`16141078901243781902`)

| Boss / Encounter | Phases | Key Entities & Adds | Encounter Mechanics / Target Types |
| :--- | :--- | :--- | :--- |
| **Colonel Vorgath** | **P1:** Minefield Defusal & Maze Navigation.<br>**P2:** Vorgath Arena Combat. | • Colonel Vorgath<br>• Defusal Droids<br>• Assassin Droids<br>• Heavy Turrets | • Green tile navigation.<br>• Defusal Droid pathing.<br>• Vorgath Cleave & Mortar fire. |

#### State Flow Map
```
[Phase 1: Minefield Defusal Maze & Turret Waves]
       │
       ▼ (Maze Successfully Navigated -> Vorgath Unshielded)
[Phase 2: Colonel Vorgath Direct Combat]
       │
       ▼ (Vorgath HP = 0%)
   [VICTORY]
```

#### Detailed Phase Breakdown & State Rules
* **Phase 1: Minefield Maze Navigation**
  * **Entry Trigger:** Stepping into the minefield corridor.
  * **Active Entities:** Defusal Droids, Assassin Droids, Heavy Turrets.
  * **Mechanics & State Rules:** Overhead screen displays the mine layout. Raid directs the *Defusal Droid* onto the correct green tiles to disarm the path. Raid moves only on green tiles while killing Assassins and Turrets.
  * **Exit Condition:** Raid reaches the far platform and disarms the field.
* **Phase 2: Colonel Vorgath Direct Combat**
  * **Entry Trigger:** Vorgath activates.
  * **Active Entities:** Colonel Vorgath.
  * **Mechanics & State Rules:** Tank turns Vorgath away; raid steps out of red mortar reticles.
  * **Terminal Condition (Kill):** Vorgath reaches $0\%$ HP.

---

### Boss 4: Warlord Kephess
* **Location:** Denova | **Tiers:** SM / VM / MM | **Level:** 80
* **Base FQN / Engine ID:** `bkg.npc.ep80_ops.ec.warlord_kephess` (`16141078901243781903`)

| Boss / Encounter | Phases | Key Entities & Adds | Encounter Mechanics / Target Types |
| :--- | :--- | :--- | :--- |
| **Warlord Kephess** | **P1:** Imperial Walker & Baradium Bombers.<br>**P2:** Pulsar Power Droids.<br>**P3:** Kephess Direct Ground Combat. | • Warlord Kephess<br>• Imperial Walker<br>• Trenchcutters & Bombers<br>• Pulsar Power Droids | • Baradium Bomb throwing.<br>• Reflective Pulsar shield rotation.<br>• Breath of the Masters swap.<br>• Gift of the Masters AoE. |

#### State Flow Map
```
[Phase 1: Trenchcutters, Bombers, & Walker Bombardment]
       │
       ▼ (Walker Destroyed via Baradium Bombs)
[Phase 2: Pulsar Power Droid Reflective Shields]
       │
       ▼ (Both Pulsar Droids Destroyed)
[Phase 3: Warlord Kephess Ground Combat] (100% - 0%)
       │
       ▼ (Kephess HP = 0%)
   [VICTORY]
```

#### Detailed Phase Breakdown & State Rules
* **Phase 1: Imperial Walker & Bombers**
  * **Entry Trigger:** Engaging front add wave.
  * **Active Entities:** Imperial Walker, Trenchcutters, Baradium Bombers.
  * **Mechanics & State Rules:** Kill *Baradium Bomber* $\rightarrow$ Pick up the dropped *Baradium Bomb* $\rightarrow$ Throw bomb at the Walker to disable its shields $\rightarrow$ DPS the Walker.
  * **Exit Condition:** Walker reaches $0\%$ HP.
* **Phase 2: Pulsar Power Droids**
  * **Entry Trigger:** Walker destroyed.
  * **Active Entities:** 2 Pulsar Power Droids.
  * **Mechanics & State Rules:** Tanks pull Pulsar Droids apart. Attack only the unshielded droid (shields rotate between front and back).
  * **Exit Condition:** Both Pulsar Droids destroyed.
* **Phase 3: Warlord Kephess Ground Combat (100%–0%)**
  * **Entry Trigger:** Kephess jumps down into the arena.
  * **Active Entities:** Warlord Kephess.
  * **Mechanics & State Rules:** Tanks swap on *Breath of the Masters* (stacking DoT). When Kephess casts *Gift of the Masters*, raid steps out of the purple circle immediately.
  * **Terminal Condition (Kill):** Kephess reaches $0\%$ HP.

---

# 4. Terror From Beyond (TFB)

```
[B1: Writhing Horror] ──► [B2: Dread Guards] ──► [B3: Operator IX] ──► [B4: Kephess Undying] ──► [B5: TFB]
```

---

### Boss 1: The Writhing Horror
* **Location:** Asation | **Tiers:** SM / VM / MM | **Level:** 80
* **Base FQN / Engine ID:** `bkg.npc.ep80_ops.tfb.writhing_horror` (`16141094389018471239`)

| Boss / Encounter | Phases | Key Entities & Adds | Encounter Mechanics / Target Types |
| :--- | :--- | :--- | :--- |
| **The Writhing Horror** | **P1 (100%–0%):** Burrow Cycles, Pheromones, & Jealous Males. | • The Writhing Horror<br>• Jealous Male Adds<br>• Corrosive Slimes | • Pheromone Trail deposit.<br>• Corrosive Slime tank swap.<br>• Burrow submergence & add burn. |

#### State Flow Map
```
[Phase 1: Surface Combat & Pheromone Routing]
       │
       ▼ (Boss Submerges / Burrows)
[Phase 2: Jealous Male Add Spawn]
       │
       ▼ (Jealous Male Destroyed -> Boss Emerges)
[Return to Phase 1 Combat Loop]
       │
       ▼ (Boss HP = 0%)
   [VICTORY]
```

#### Detailed Phase Breakdown & State Rules
* **Phase 1 & 2: Surface & Burrow Loop (100%–0%)**
  * **Entry Trigger:** Engaging Writhing Horror.
  * **Active Entities:** The Writhing Horror, Jealous Males, Larva Adds.
  * **Mechanics & State Rules:** Tank swaps when *Corrosive Slime* stacks reach 3. Player with *Pheromone Trail* stands in a green field to drop larva spawns. When boss burrows, burn the *Jealous Male* to force the boss back to the surface.
  * **Terminal Condition (Kill):** Writhing Horror reaches $0\%$ HP.

---

### Boss 2: The Dread Guards
* **Location:** Asation | **Tiers:** SM / VM / MM | **Level:** 80
* **Base FQN / Engine ID:** `bkg.npc.ep80_ops.tfb.dread_guards` (`16141094389018471240`)

| Boss / Encounter | Phases | Key Entities & Adds | Encounter Mechanics / Target Types |
| :--- | :--- | :--- | :--- |
| **The Dread Guards** | **P1:** Heirad Focus.<br>**P2:** Ciphas Focus.<br>**P3:** Kel'sara Focus & Resurrections. | • Heirad (Lightning/Shield)<br>• Ciphas (Melee/Strangle)<br>• Kel'sara (Death Mark) | • Heirad Lightning Shield burst.<br>• Ciphas Strangle interrupt.<br>• Kel'sara Death Mark kiting.<br>• Phantasm clean up. |

#### State Flow Map
```
[Phase 1: Heirad Priority & Lightning Shield]
       │
       ▼ (Heirad Dies)
[Phase 2: Ciphas Priority & Strangle Interrupts]
       │
       ▼ (Ciphas Dies)
[Phase 3: Kel'sara Priority & Death Mark Kiting]
       │
       ▼ (Kel'sara Dies)
   [VICTORY]
```

#### Detailed Phase Breakdown & State Rules
* **Phase 1: Heirad Priority**
  * **Active Entities:** Heirad, Ciphas, Kel'sara.
  * **Mechanics & State Rules:** Tanks hold Ciphas and Kel'sara apart. DPS burns Heirad. When Heirad gains *Lightning Shield*, burst his barrier immediately to stop raid-wide shockwaves.
  * **Exit Condition:** Heirad reaches $0\%$ HP.
* **Phase 2: Ciphas Priority**
  * **Mechanics & State Rules:** DPS switches to Ciphas. Rotate interrupts on *Strangle*.
  * **Exit Condition:** Ciphas reaches $0\%$ HP.
* **Phase 3: Kel'sara Priority**
  * **Mechanics & State Rules:** Kel'sara applies *Death Mark* to a player $\rightarrow$ Marked player sprints around the room perimeter to kite away from Kel'sara. DPS burns Kel'sara and phantom adds.
  * **Terminal Condition (Kill):** Kel'sara reaches $0\%$ HP.

---

### Boss 3: Operator IX
* **Location:** Asation | **Tiers:** SM / VM / MM | **Level:** 80
* **Base FQN / Engine ID:** `bkg.npc.ep80_ops.tfb.operator_ix` (`16141094389018471241`)

| Boss / Encounter | Phases | Key Entities & Adds | Encounter Mechanics / Target Types |
| :--- | :--- | :--- | :--- |
| **Operator IX** | **P1:** Color Deletion Sequence (Blue/Orange/Purple/Yellow).<br>**P2:** Mainframe Combat & Blackout. | • Operator IX<br>• Color Data Cores<br>• Rectifiers / Regulators | • Color tuning console assignments.<br>• Shield matching & core channels.<br>• Delete tank swap & Blackout collapse. |

#### State Flow Map
```
[Phase 1: Color Deletion Matrix (Blue -> Orange -> Purple -> Yellow)]
       │
       ▼ (All 4 Data Cores Deleted)
[Phase 2: Operator IX Mainframe Combat] (100% - 0%)
       │
       ├──► Delete Cast: Tank swaps aggro
       ├──► Blackout Cast: Raid stacks in center dome
       │
       ▼ (Operator IX HP = 0%)
   [VICTORY]
```

#### Detailed Phase Breakdown & State Rules
* **Phase 1: Color Deletion Matrix**
  * **Entry Trigger:** Clicking the center console.
  * **Active Entities:** Blue, Orange, Purple, Yellow Data Cores; Rectifiers; Subregulators.
  * **Mechanics & State Rules:** Players interact with color tuners. Players with matching color tuners stand inside the active core shield and channel the console to delete the core while DPS burns Regulators.
  * **Exit Condition:** All 4 Data Cores destroyed.
* **Phase 2: Operator IX Mainframe Combat (100%–0%)**
  * **Entry Trigger:** Operator IX detaches from the ceiling.
  * **Active Entities:** Operator IX.
  * **Mechanics & State Rules:** Tanks swap on *Delete*. When boss casts *Blackout*, whole raid stacks under the center terminal dome.
  * **Terminal Condition (Kill):** Operator IX reaches $0\%$ HP.

---

### Boss 4: Kephess the Undying
* **Location:** Asation | **Tiers:** SM / VM / MM | **Level:** 80
* **Base FQN / Engine ID:** `bkg.npc.ep80_ops.tfb.kephess_undying` (`16141094389018471242`)

| Boss / Encounter | Phases | Key Entities & Adds | Encounter Mechanics / Target Types |
| :--- | :--- | :--- | :--- |
| **Kephess the Undying** | **P1 (100%–0%):** Energy Spheres, Nanites, & Platform Hazards. | • Kephess the Undying<br>• Hypergate Anomalies | • Energy Sphere catch & buff.<br>• Corrupted Nanite puddle drops.<br>• Platform edge knockbacks. |

#### State Flow Map
```
[Phase 1: Corrupted Kephess Combat & Spheres] (100% - 0%)
       │
       ├──► Falling Energy Spheres: Designated DPS catches sphere
       ├──► Corrupted Nanites: Targeted player places puddle on outer edge
       │
       ▼ (Kephess HP = 0%)
   [VICTORY]
```

#### Detailed Phase Breakdown & State Rules
* **Phase 1: Corrupted Kephess Combat (100%–0%)**
  * **Entry Trigger:** Engaging Kephess.
  * **Active Entities:** Kephess the Undying.
  * **Mechanics & State Rules:** Assigned DPS intercepts falling *Energy Spheres* to gain a 100% damage buff. Players with *Corrupted Nanites* run to the perimeter to drop acid pools. Tanks stay centered to avoid being knocked off the platform edge.
  * **Terminal Condition (Kill):** Kephess reaches $0\%$ HP.

---

### Boss 5: The Terror from Beyond
* **Location:** Asation | **Tiers:** SM / VM / MM | **Level:** 80
* **Base FQN / Engine ID:** `bkg.npc.ep80_ops.tfb.the_terror_from_beyond` (`16141094389018471243`)

| Boss / Encounter | Phases | Key Entities & Adds | Encounter Mechanics / Target Types |
| :--- | :--- | :--- | :--- |
| **The Terror from Beyond** | **P1:** Outer Hypergate Tentacles.<br>**P2:** Interior Hex Platform Web.<br>**P3 (Sub-15%):** Tantrum Burn. | • The Terror from Beyond<br>• Hypergate Tentacles<br>• Birthing Anomalies<br>• Grasping Arms | • Hypergate Slam avoidance.<br>• Hexagonal platform jumping.<br>• Scream / Acid Spit soaks.<br>• Tantrum soft enrage. |

#### State Flow Map
```
[Phase 1: Outer Perimeter Hypergate Tentacles]
       │
       ▼ (Outer Tentacles Cleared -> Portal Opens)
[Phase 2: Interior Hexagonal Platform Network] (100% - 15%)
       │
       ├──► Grasping Arms Spawn -> Burn Arms -> Head Exposed
       ├──► Puddle drops -> Jump to adjacent hex platform
       │
       ▼ (Boss HP ≤ 15%)
[Phase 3: Tantrum Soft Enrage Burn] (15% - 0%)
       │
       ▼ (Boss HP = 0%)
   [VICTORY]
```

#### Detailed Phase Breakdown & State Rules
* **Phase 1: Outer Perimeter Tentacles**
  * **Entry Trigger:** Stepping onto the outer ring.
  * **Active Entities:** 2 Hypergate Tentacles, Birthing Anomalies, Larvae.
  * **Mechanics & State Rules:** Tanks hold Tentacles in melee range to prevent *Hypergate Slam* raid wipes. DPS clears Anomalies and burns Tentacles.
  * **Exit Condition:** Both outer tentacles destroyed.
* **Phase 2: Interior Hex Platform Network (100%–15%)**
  * **Entry Trigger:** Raid travels through the hypergate portal.
  * **Active Entities:** The Terror (Head), Grasping Arms, Unstable Anomalies.
  * **Mechanics & State Rules:** Tanks separate Grasping Arms across platforms. When arms die, the Terror's Head becomes targetable. Move off platforms when spit with green puddles.
  * **Exit Condition:** Boss reaches $\le 15\%$ HP.
* **Phase 3: Tantrum Soft Enrage Burn (15%–0%)**
  * **Entry Trigger:** Boss hits $15\%$ HP.
  * **Active Entities:** The Terror from Beyond.
  * **Mechanics & State Rules:** Boss slams all platforms simultaneously with *Tantrum*; execute maximum DPS/HPS burn.
  * **Terminal Condition (Kill):** Boss reaches $0\%$ HP.

---

# 5. Scum and Villainy (S&V)

```
[B1: Dash'Roode] ──► [B2: Titan 6] ──► [B3: Thrasher] ──► [B4: Ops Chief] ──► [B5: Olok] ──► [B6: Cartel Warlords] ──► [B7: Styrak]
```

---

### Boss 1: Dash'Roode
* **Location:** Darvannis | **Tiers:** SM / VM / MM | **Level:** 80
* **Base FQN / Engine ID:** `bkg.npc.ep80_ops.snv.dashroode` (`16141103829471940023`)

| Boss / Encounter | Phases | Key Entities & Adds | Encounter Mechanics / Target Types |
| :--- | :--- | :--- | :--- |
| **Dash'Roode** | **P1 (100%–0%):** Portable Battery & Shield Generator Routing. | • Dash'Roode<br>• Dune Crawlers | • Portable Battery carrying.<br>• Environmental Sandstorm DoT.<br>• Knockback into storm. |

#### State Flow Map
```
[Phase 1: Shield Generator 1 Active] (100% HP)
       │
       ▼ (Generator Battery Depletes -> Sandstorm Encroaches)
[Transit: Battery Transport to Next Generator]
       │
       ▼ (Generator 2/3/4 Activated)
[Phase 1 Combat Loop Continued] ──► [Boss HP = 0%] ──► [VICTORY]
```

#### Detailed Phase Breakdown & State Rules
* **Phase 1: Generator Routing (100%–0%)**
  * **Entry Trigger:** Engaging Dash'Roode.
  * **Active Entities:** Dash'Roode, Dune Crawlers.
  * **Mechanics & State Rules:** Carry the portable battery to activate environmental shields. Raid stays inside the shield dome. When the battery drains, a designated player carries it to the next generator node while off-tank clears Dune Crawlers.
  * **Terminal Condition (Kill):** Dash'Roode reaches $0\%$ HP.

---

### Boss 2: Titan 6
* **Location:** Darvannis | **Tiers:** SM / VM / MM | **Level:** 80
* **Base FQN / Engine ID:** `bkg.npc.ep80_ops.snv.titan_6` (`16141103829471940024`)

| Boss / Encounter | Phases | Key Entities & Adds | Encounter Mechanics / Target Types |
| :--- | :--- | :--- | :--- |
| **Titan 6** | **P1:** Ground Tanking & Grenades.<br>**P2:** Launch & Missile Cover.<br>**P3 (Sub-20%):** Air Strike Burn. | • Titan 6<br>• Air Strike Missiles | • Huge Grenade cleanse/run-out.<br>• "Lots of Missiles" rock pillar cover.<br>• Stationary burn race. |

#### State Flow Map
```
[Phase 1: Ground Combat & Huge Grenades]
       │
       ▼ (Launch Sequence Initiated)
[Phase 2: Lots of Missiles & Rock Pillar Cover]
       │
       ▼ (Titan 6 Lands)
[Return to Phase 1 Combat Loop] ──(Boss HP ≤ 20%)──► [Phase 3: Air Strike Soft Enrage]
       │
       ▼ (Titan 6 HP = 0%)
   [VICTORY]
```

#### Detailed Phase Breakdown & State Rules
* **Phase 1: Ground Combat & Huge Grenades**
  * **Mechanics & State Rules:** Tanks swap on *Huge Grenade* (grenade target runs $\ge 30\text{m}$ out of the raid before detonation).
  * **Exit Condition:** Titan 6 casts *Launch Sequence*.
* **Phase 2: "Lots of Missiles" Cover**
  * **Mechanics & State Rules:** Titan 6 flies into the air. Every player must hide behind a separate rock pillar to avoid line-of-sight bombardment.
  * **Exit Condition:** Titan 6 lands.
* **Phase 3: Air Strike Soft Enrage (Sub-20%)**
  * **Entry Trigger:** Boss hits $\le 20\%$ HP.
  * **Mechanics & State Rules:** Titan 6 roots in the center; burn down boss before room-wide artillery overwhelms healers.
  * **Terminal Condition (Kill):** Titan 6 reaches $0\%$ HP.

---

### Boss 3: Thrasher
* **Location:** Darvannis | **Tiers:** SM / VM / MM | **Level:** 80
* **Base FQN / Engine ID:** `bkg.npc.ep80_ops.snv.thrasher` (`16141103829471940025`)

| Boss / Encounter | Phases | Key Entities & Adds | Encounter Mechanics / Target Types |
| :--- | :--- | :--- | :--- |
| **Thrasher** | **P1 (100%–0%):** Arena Tanking, Balcony Kicks, & Demolitionists. | • Thrasher<br>• Mercenary Snipers<br>• Mercenary Demolitionists | • Fire Breath tank positioning.<br>• Balcony Knockback team.<br>• Demolitionist bomb defusal. |

#### State Flow Map
```
[Phase 1: Arena Combat & Balcony Mechanics] (100% - 0%)
       │
       ├──► Boss Knockback Cast: Upper DPS group launched to balcony
       ├──► Upper Group: Destroys Mercenary Snipers
       ├──► Ground Team: Clears Demolitionists & avoids Fire Breath
       │
       ▼ (Thrasher HP = 0%)
   [VICTORY]
```

#### Detailed Phase Breakdown & State Rules
* **Phase 1: Arena & Balcony Coordination (100%–0%)**
  * **Entry Trigger:** Pulling Thrasher.
  * **Active Entities:** Thrasher, Mercenary Snipers, Demolitionists.
  * **Mechanics & State Rules:** Tank turns Thrasher away from raid (*Fire Breath*). Designated upper DPS team stands in front of the boss when he stomps to get knocked onto the sniper balcony to kill Snipers. Ground team interrupts and kills Demolitionists.
  * **Terminal Condition (Kill):** Thrasher reaches $0\%$ HP.

---

### Boss 4: Operations Chief
* **Location:** Darvannis | **Tiers:** SM / VM / MM | **Level:** 80
* **Base FQN / Engine ID:** `bkg.npc.ep80_ops.snv.operations_chief` (`16141103829471940026`)

| Boss / Encounter | Phases | Key Entities & Adds | Encounter Mechanics / Target Types |
| :--- | :--- | :--- | :--- |
| **Operations Chief** | **P1:** City Infiltration (Red/Gold/Blue).<br>**P2:** Chief Arena Combat. | • Operations Chief<br>• City Guard Teams<br>• Infiltration Turrets | • Timed team stealth split.<br>• Turret deactivation.<br>• Armor Shred tank swap. |

#### State Flow Map
```
[Phase 1: City Infiltration & Turret Disable Routes]
       │
       ▼ (All 3 Team Routes Cleared within Timer)
[Phase 2: Operations Chief Arena Combat] (100% - 0%)
       │
       ▼ (Operations Chief HP = 0%)
   [VICTORY]
```

#### Detailed Phase Breakdown & State Rules
* **Phase 1: City Infiltration**
  * **Mechanics & State Rules:** Split team into Red, Gold, and Blue infiltration routes. Clear guard packs and disable security turrets before the timer expires.
  * **Exit Condition:** All 3 sector turrets powered down.
* **Phase 2: Operations Chief Arena Combat (100%–0%)**
  * **Entry Trigger:** Entering the Chief's command courtyard.
  * **Active Entities:** Operations Chief, Reinforcement Droids.
  * **Mechanics & State Rules:** Tanks swap on *Armor Shred*. Kill priority reinforcement adds; burn the Chief.
  * **Terminal Condition (Kill):** Operations Chief reaches $0\%$ HP.

---

### Boss 5: Olok the Shadow
* **Location:** Darvannis | **Tiers:** SM / VM / MM | **Level:** 80
* **Base FQN / Engine ID:** `bkg.npc.ep80_ops.snv.olok_the_shadow` (`16141103829471940027`)

| Boss / Encounter | Phases | Key Entities & Adds | Encounter Mechanics / Target Types |
| :--- | :--- | :--- | :--- |
| **Olok the Shadow** | **P1:** Droid Auction Selection Puzzle.<br>**P2:** Olok Stealth & Shady Characters. | • Olok the Shadow<br>• Frontline / Assault Droids<br>• Shady Characters | • Token currency console purchases.<br>• Droid row pre-clear.<br>• Stealth vanish & add clears. |

#### State Flow Map
```
[Phase 1: Droid Auction House Console Purchases & Droid Wave Clears]
       │
       ▼ (All 4 Droid Rows Cleared)
[Phase 2: Olok the Shadow Combat & Stealth Vanishes] (100% - 0%)
       │
       ▼ (Olok HP = 0%)
   [VICTORY]
```

#### Detailed Phase Breakdown & State Rules
* **Phase 1: Droid Auction Puzzle**
  * **Mechanics & State Rules:** Upper console players use tokens looted from Shady Characters to purchase and disable specific droids in the lower holding bay before the floor opens. Clear remaining droids row by row.
  * **Exit Condition:** All 4 droid rows eliminated.
* **Phase 2: Olok the Shadow Combat (100%–0%)**
  * **Entry Trigger:** Olok emerges into the pit.
  * **Active Entities:** Olok the Shadow, Shady Characters.
  * **Mechanics & State Rules:** Olok periodically stealths and summons Shady Characters. Kill adds to force Olok back into visibility.
  * **Terminal Condition (Kill):** Olok reaches $0\%$ HP.

---

### Boss 6: Cartel Warlords
* **Location:** Darvannis | **Tiers:** SM / VM / MM | **Level:** 80
* **Base FQN / Engine ID:** `bkg.npc.ep80_ops.snv.cartel_warlords` (`16141103829471940028`)

| Boss / Encounter | Phases | Key Entities & Adds | Encounter Mechanics / Target Types |
| :--- | :--- | :--- | :--- |
| **Cartel Warlords** | **P1:** 4 Warlords.<br>**P2:** 3 Warlords.<br>**P3:** 2 Warlords.<br>**P4:** Final Enraged Warlord. | • Captain Horic<br>• Tu'Chuk<br>• Vilenthriss<br>• Sunder | • Kill priority cascading buffs.<br>• Sunder Fixate / One-shot melee.<br>• Horic Corrosive Grenade cleanse. |

#### State Flow Map
```
[Phase 1: 4 Active Warlords] ──(Kill Captain Horic)──► [Phase 2: 3 Buffed Warlords]
                                                              │
       ┌──────────────────────────────────────────────────────┘
       ▼
[Phase 2: 3 Active Warlords] ──(Kill Tu'Chuk)───────► [Phase 3: 2 Buffed Warlords]
                                                              │
       ┌──────────────────────────────────────────────────────┘
       ▼
[Phase 3: 2 Active Warlords] ──(Kill Vilenthriss)───► [Phase 4: Sunder Enraged Solo]
                                                              │
                                                              ▼ (Sunder HP = 0%)
                                                          [VICTORY]
```

#### Detailed Phase Breakdown & State Rules
* **Phase 1 to Phase 4: Cascading Warlord Elimination**
  * **Entry Trigger:** Engaging any Warlord.
  * **Active Entities:** Captain Horic, Tu'Chuk, Vilenthriss, Sunder.
  * **Mechanics & State Rules:** When a warlord dies, survivors heal to 100% and gain upgraded abilities.
    * *Standard Kill Order:* Horic $\rightarrow$ Tu'Chuk $\rightarrow$ Vilenthriss $\rightarrow$ Sunder.
    * *Sunder Rule:* When Sunder casts *Fixate*, the fixated player must run continuously; Sunder's basic melee will one-shot non-tanks.
  * **Terminal Condition (Kill):** Final surviving warlord reaches $0\%$ HP.

---

### Boss 7: Dread Master Styrak
* **Location:** Darvannis | **Tiers:** SM / VM / MM | **Level:** 80
* **Base FQN / Engine ID:** `bkg.npc.ep80_ops.snv.dread_master_styrak` (`16141103829471940029`)

| Boss / Encounter | Phases | Key Entities & Adds | Encounter Mechanics / Target Types |
| :--- | :--- | :--- | :--- |
| **Dread Master Styrak** | **P1:** Kell Dragon.<br>**P2:** Styrak & Phantasms.<br>**P3:** Ring of Apparitions.<br>**P4:** Giant Styrak Burn. | • Dread Master Styrak<br>• Kell Dragon<br>• Phantasms & Manifestations | • Kell Dragon tanking & breath.<br>• Force Lightning Spine spin.<br>• Ring of Apparitions breakout.<br>• Giant manifestation burn. |

#### State Flow Map
```
[Phase 1: Kell Dragon & Styrak Shielded]
       │
       ▼ (Kell Dragon HP = 0%)
[Phase 2: Styrak Combat & Phantasms]
       │
       ▼ (HP Threshold: Hallucination Ring Triggered)
[Phase 3: Ring of Apparitions Breakout]
       │
       ▼ (Apparition Destroyed -> Ring Broken)
[Return to Phase 2 Combat Loop] ──(Styrak HP ≤ 10%)──► [Phase 4: Giant Styrak Final Burn]
       │
       ▼ (Styrak HP = 0%)
   [VICTORY]
```

#### Detailed Phase Breakdown & State Rules
* **Phase 1: Kell Dragon**
  * **Active Entities:** Kell Dragon, Dread Master Styrak (Immune).
  * **Mechanics & State Rules:** Tanks turn Kell Dragon away (*Spit/Cleave*); DPS burns Kell Dragon down.
  * **Exit Condition:** Kell Dragon reaches $0\%$ HP.
* **Phase 2 & 3: Styrak Combat & Illusion Ring**
  * **Active Entities:** Styrak, Manifestations, Apparitions.
  * **Mechanics & State Rules:** Avoid *Force Lightning Spine* (spin attack). When Styrak traps players in a *Ring of Apparitions*, all DPS focus down a single apparition to break the circle before it collapses.
  * **Exit Condition:** Styrak reaches $\le 10\%$ HP.
* **Phase 4: Giant Styrak Final Burn (10%–0%)**
  * **Entry Trigger:** Styrak hits $10\%$ HP.
  * **Active Entities:** Giant Phantom Styrak.
  * **Mechanics & State Rules:** Styrak summons a massive phantasm; burn all offensive cooldowns.
  * **Terminal Condition (Kill):** Styrak reaches $0\%$ HP.

---

# 6. Dread Fortress (DF)

```
[B1: Nefra] ──► [B2: Commander Draxus] ──► [B3: Grob'thok] ──► [B4: Corruptor Zero] ──► [B5: Brontes]
```

---

### Boss 1: Nefra, Who Bars the Way
* **Location:** Oricon | **Tiers:** SM / VM / MM | **Level:** 80
* **Base FQN / Engine ID:** `bkg.npc.ep80_ops.df.nefra` (`16141114298192841042`)

| Boss / Encounter | Phases | Key Entities & Adds | Encounter Mechanics / Target Types |
| :--- | :--- | :--- | :--- |
| **Nefra** | **P1 (100%–0%):** Cleave, DoT Cleansing, & Tank Busters. | • Nefra | • Voice of the Masters (Raid DoT Cleanse).<br>• Twin Cleave.<br>• Nightmare twin tanks. |

#### State Flow Map
```
[Phase 1: Gatekeeper Combat & Cleanses] (100% - 0%)
       │
       ├──► Boss casts Voice of the Masters ──► Healers/DPS Cleanse Immediately
       ├──► Boss casts Twin Cleave ───────────► Tank active defensives / Swap
       │
       ▼ (Nefra HP = 0%)
   [VICTORY]
```

#### Detailed Phase Breakdown & State Rules
* **Phase 1: Gatekeeper Combat (100%–0%)**
  * **Entry Trigger:** Engaging Nefra.
  * **Active Entities:** Nefra.
  * **Mechanics & State Rules:** Tanks turn Nefra away from the group. When Nefra casts *Voice of the Masters*, all players/healers must cleanse the DoT immediately. In Master Mode, both tanks stand in front to split *Twin Cleave*.
  * **Terminal Condition (Kill):** Nefra reaches $0\%$ HP.

---

### Boss 2: Commander Draxus
* **Location:** Oricon | **Tiers:** SM / VM / MM | **Level:** 80
* **Base FQN / Engine ID:** `bkg.npc.ep80_ops.df.commander_draxus` (`16141114298192841043`)

| Boss / Encounter | Phases | Key Entities & Adds | Encounter Mechanics / Target Types |
| :--- | :--- | :--- | :--- |
| **Commander Draxus** | **Waves 1–9:** Structured Squad Assault. | • Commander Draxus<br>• Subjugators (Choke)<br>• Corruptors / Despoilers<br>• Dismantlers / Guardians | • Interrupt Corrupt.<br>• Stun-break Subjugator Choke.<br>• Guardian Shield Domes.<br>• Structured wave management. |

#### State Flow Map
```
[Wave 1: Draxus + Subjugators] ──► [Wave 2: Subjugators + Corruptor] ──► [Wave 3: Draxus + Dismantlers]
                                                                                   │
       ┌───────────────────────────────────────────────────────────────────────────┘
       ▼
[Wave 4: Despoilers + Corruptors] ──► [Wave 5: Draxus + Guardians] ──► [Wave 6: Subjugators + Corruptors]
                                                                                   │
       ┌───────────────────────────────────────────────────────────────────────────┘
       ▼
[Wave 7: Despoilers + Guardians] ──► [Wave 8: Dismantlers + Subjugators] ──► [Wave 9: Draxus Final Stand]
                                                                                   │
                                                                                   ▼ (Draxus HP = 0%)
                                                                               [VICTORY]
```

#### Detailed Phase Breakdown & State Rules
* **Waves 1 through 9: Structured Assault Sequence**
  * **Wave 1:** Draxus + 2 Subjugators. Tank Draxus; DPS stuns/burns Subjugators.
  * **Wave 2:** 2 Subjugators + 1 Corruptor. DPS must interrupt *Corrupt* immediately.
  * **Wave 3:** Draxus lands + 2 Dismantlers. Tanks swap on Dismantler armor debuffs.
  * **Wave 4:** 2 Despoilers (Healers) + 2 Corruptors. DPS kicks Despoiler heals.
  * **Wave 5:** Draxus + Guardians. Stand inside Guardian shield domes to damage them.
  * **Wave 6:** 2 Subjugators + 2 Corruptors + 1 Dismantler. Strict crowd control required.
  * **Wave 7:** 2 Despoilers + 2 Guardians.
  * **Wave 8:** 2 Dismantlers + 2 Subjugators.
  * **Wave 9:** Draxus engages directly alongside all remaining active enemies.
  * **Terminal Condition (Kill):** Commander Draxus reaches $0\%$ HP.

---

### Boss 3: Grob'thok, Who Feeds the Forge
* **Location:** Oricon | **Tiers:** SM / VM / MM | **Level:** 80
* **Base FQN / Engine ID:** `bkg.npc.ep80_ops.df.grobthok` (`16141114298192841044`)

| Boss / Encounter | Phases | Key Entities & Adds | Encounter Mechanics / Target Types |
| :--- | :--- | :--- | :--- |
| **Grob'thok** | **P1 (100%–0%):** Smelting Magnet Drops, Mining Adds, & Roar Kiting. | • Grob'thok<br>• Ugnaught Workers<br>• Mining Droids | • Smelter Magnet add incineration.<br>• Roar debris dodging.<br>• Mining cart perimeter kiting. |

#### State Flow Map
```
[Phase 1: Smelter Arena Positioning & Magnet Drops] (100% - 0%)
       │
       ├──► Magnet Alarm Sounds ──► Tank positions boss under overhead crane
       ├──► Magnet Drops ─────────► Sucks up Ugnaught/Mining Droid adds
       ├──► Boss casts Roar ──────► Raid dodges falling molten pipe debris
       │
       ▼ (Grob'thok HP = 0%)
   [VICTORY]
```

#### Detailed Phase Breakdown & State Rules
* **Phase 1: Smelter Positioning (100%–0%)**
  * **Entry Trigger:** Engaging Grob'thok.
  * **Active Entities:** Grob'thok, Ugnaught Workers, Mining Droids.
  * **Mechanics & State Rules:** When the crane siren sounds, tank positions Grob'thok directly under the overhead magnet. The magnet drops, pulling and incinerating all trash adds. Move away from falling molten slag during *Roar*.
  * **Terminal Condition (Kill):** Grob'thok reaches $0\%$ HP.

---

### Boss 4: Corruptor Zero
* **Location:** Oricon | **Tiers:** SM / VM / MM | **Level:** 80
* **Base FQN / Engine ID:** `bkg.npc.ep80_ops.df.corruptor_zero` (`16141114298192841045`)

| Boss / Encounter | Phases | Key Entities & Adds | Encounter Mechanics / Target Types |
| :--- | :--- | :--- | :--- |
| **Corruptor Zero** | **P1 (100%–20%):** Factory Add Waves & Concussion Mines.<br>**P2 (20%–0%):** Chest Laser. | • Corruptor Zero<br>• Heavy Assault Droids<br>• Repair Droids | • Concussion Mine drop placement.<br>• Add grouping under missile strikes.<br>• Massive Chest Laser rotation. |

#### State Flow Map
```
[Phase 1: Droid Factory Waves & Concussion Mines] (100% - 20%)
       │
       ├──► Concussion Mine on Player: Run mine to perimeter
       ├──► Factory Adds Spawn: Group under boss for missile cleave
       │
       ▼ (Corruptor Zero HP ≤ 20%)
[Phase 2: Massive Chest Laser / Soft Enrage] (20% - 0%)
       │
       ├──► Boss charges Chest Laser: Entire raid rotates behind boss
       │
       ▼ (Corruptor Zero HP = 0%)
   [VICTORY]
```

#### Detailed Phase Breakdown & State Rules
* **Phase 1: Factory Adds & Mines (100%–20%)**
  * **Active Entities:** Corruptor Zero, Assault Droids, Repair Droids.
  * **Mechanics & State Rules:** Players targeted with *Concussion Mine* run to the perimeter. Group adds directly under the boss so his *Missile Barrage* destroys them.
  * **Exit Condition:** Boss reaches $\le 20\%$ HP.
* **Phase 2: Massive Chest Laser (20%–0%)**
  * **Entry Trigger:** Boss hits $20\%$ HP.
  * **Active Entities:** Corruptor Zero.
  * **Mechanics & State Rules:** Boss ceases summoning adds and channels *Massive Chest Laser* while rotating in a circle. The entire raid must continuously move behind the boss to burn remaining HP.
  * **Terminal Condition (Kill):** Corruptor Zero reaches $0\%$ HP.

---

### Boss 5: Dread Master Brontes
* **Location:** Oricon | **Tiers:** SM / VM / MM | **Level:** 80
* **Base FQN / Engine ID:** `bkg.npc.ep80_ops.df.dread_master_brontes` (`16141114298192841046`)

| Boss / Encounter | Phases | Key Entities & Adds | Encounter Mechanics / Target Types |
| :--- | :--- | :--- | :--- |
| **Dread Master Brontes** | **P1:** Hands & Turrets.<br>**P2:** Kephess & Lightning Orbs.<br>**P3:** Six-Finger Clock.<br>**P4:** Giant Brontes & Two Hands. | • Dread Master Brontes<br>• Kephess Clones<br>• Fingers / Hands of Brontes<br>• Energy Orbs | • Lightning Orb kiting & soak stacks.<br>• Sweeping clock laser evasion.<br>• Hand knockback tank juggling. |

#### State Flow Map
```
[Phase 1: Hands & Turrets Engagement]
       │
       ▼ (Hands Destroyed)
[Phase 2: Kephess Clones & Lightning Orb Soaks]
       │
       ▼ (Kephess Clones Destroyed)
[Phase 3: The Six-Finger Clock Phase]
       │
       ▼ (All 6 Fingers Destroyed)
[Phase 4: Giant Brontes & Two Hands Final Burn] (100% - 0%)
       │
       ▼ (Brontes HP = 0%)
   [VICTORY]
```

#### Detailed Phase Breakdown & State Rules
* **Phase 1: Hands & Turrets**
  * **Active Entities:** Left & Right Hand of Brontes, Turrets.
  * **Mechanics & State Rules:** Separate and burn both Hands while avoiding ground spikes.
  * **Exit Condition:** Both Hands destroyed.
* **Phase 2: Kephess & Lightning Orbs**
  * **Active Entities:** Kephess Clones, Energy Orbs.
  * **Mechanics & State Rules:** Burn Kephess clones. Assigned players kite *Lightning Orbs* and step into them to soak charges at safe intervals.
  * **Exit Condition:** Clones destroyed.
* **Phase 3: The Six-Finger Clock**
  * **Entry Trigger:** 6 Fingers spawn in a circle.
  * **Mechanics & State Rules:** Brontes channels a lethal rotating laser from the room center. Raid moves clockwise in a tight group, destroying each finger before the beam reaches them.
  * **Exit Condition:** All 6 Fingers destroyed.
* **Phase 4: Giant Brontes & Two Hands (Final Burn)**
  * **Entry Trigger:** Giant Brontes emerges with 2 giant Hands.
  * **Mechanics & State Rules:** Tanks hold the Hands facing away to manage knockbacks. DPS burns Brontes before raid-wide lightning overwhelms healers.
  * **Terminal Condition (Kill):** Brontes reaches $0\%$ HP.

---

# 7. Dread Palace (DP)

```
[B1: Bestia] ──► [B2: Tyrans] ──► [B3: Calphayus] ──► [B4: Raptus] ──► [B5: The Dread Council]
```

---

### Boss 1: Dread Master Bestia
* **Location:** Oricon | **Tiers:** SM / VM / MM | **Level:** 80
* **Base FQN / Engine ID:** `bkg.npc.ep80_ops.dp.dread_master_bestia` (`16141120938491823901`)

| Boss / Encounter | Phases | Key Entities & Adds | Encounter Mechanics / Target Types |
| :--- | :--- | :--- | :--- |
| **Dread Master Bestia** | **P1 (100%–50%):** Dread Larvae & Monsters.<br>**P2 (50%–0%):** Bestia Direct Combat. | • Dread Master Bestia<br>• Dread Larvae<br>• Dread Monsters | • Combustion pool soaking.<br>• Stacking monster debuffs.<br>• Force Breach tank swap. |

#### State Flow Map
```
[Phase 1: Dread Monster Add Waves & Combustion Pools] (100% - 50%)
       │
       ▼ (Bestia HP ≤ 50%)
[Phase 2: Bestia Engagement & Force Breach Swaps] (50% - 0%)
       │
       ▼ (Bestia HP = 0%)
   [VICTORY]
```

#### Detailed Phase Breakdown & State Rules
* **Phase 1: Dread Monster Add Waves (100%–50%)**
  * **Entry Trigger:** Engaging Bestia's throne.
  * **Active Entities:** Bestia (Shielded), Dread Larvae, Dread Monsters.
  * **Mechanics & State Rules:** Tanks hold Dread Monsters away from *Combustion Pools*. Players stand in pools to extinguish them. Burn monsters down.
  * **Exit Condition:** Bestia hits $\le 50\%$ HP.
* **Phase 2: Bestia Direct Combat (50%–0%)**
  * **Entry Trigger:** Bestia leaves throne.
  * **Active Entities:** Bestia.
  * **Mechanics & State Rules:** Tanks swap on *Force Breach*. Clear remaining larvae adds.
  * **Terminal Condition (Kill):** Bestia reaches $0\%$ HP.

---

### Boss 2: Dread Master Tyrans
* **Location:** Oricon | **Tiers:** SM / VM / MM | **Level:** 80
* **Base FQN / Engine ID:** `bkg.npc.ep80_ops.dp.dread_master_tyrans` (`16141120938491823902`)

| Boss / Encounter | Phases | Key Entities & Adds | Encounter Mechanics / Target Types |
| :--- | :--- | :--- | :--- |
| **Dread Master Tyrans** | **P1 (100%–0%):** Simplification Floor Drops & Thorn Spread. | • Dread Master Tyrans | • Simplification (Perimeter tile dropping).<br>• Affliction DoT cleanse.<br>• Thorn circle raid spread. |

#### State Flow Map
```
[Phase 1: Simplification Floor Drops & Affliction Cleanses] (100% - 0%)
       │
       ├──► Simplification Targeted: Player runs to designated outer edge tile
       ├──► Tile Collapses into Abyss: Player steps off before drop
       ├──► Affliction Cast: Healers cleanse immediately
       │
       ▼ (Tyrans HP = 0%)
   [VICTORY]
```

#### Detailed Phase Breakdown & State Rules
* **Phase 1: Tile Management & Cleanses (100%–0%)**
  * **Entry Trigger:** Engaging Tyrans.
  * **Active Entities:** Dread Master Tyrans.
  * **Mechanics & State Rules:** Player targeted with *Simplification* runs to the farthest available perimeter hexagon tile; when the tile turns red, step off before it drops into the pit. Cleanse *Affliction* DoT; spread out when *Thorn* appears.
  * **Terminal Condition (Kill):** Tyrans reaches $0\%$ HP.

---

### Boss 3: Dread Master Calphayus
* **Location:** Oricon | **Tiers:** SM / VM / MM | **Level:** 80
* **Base FQN / Engine ID:** `bkg.npc.ep80_ops.dp.dread_master_calphayus` (`16141120938491823903`)

| Boss / Encounter | Phases | Key Entities & Adds | Encounter Mechanics / Target Types |
| :--- | :--- | :--- | :--- |
| **Dread Master Calphayus** | **P1–P3:** Past & Future Portals.<br>**P4:** Final Throne Room Burn. | • Dread Master Calphayus<br>• Corrupted Seeds / Trees<br>• Future/Past Apparitions | • Past (Orange) & Future (Purple) split.<br>• Seed planting & crystal harvesting.<br>• Throne room burn. |

#### State Flow Map
```
[Phase 1: Portal Sequence 1 (Past Seed / Future Tree)]
       │
       ▼ (Calphayus Barrier Dispelled)
[Phase 2: Portal Sequence 2 (Crystal Alignment)]
       │
       ▼ (Calphayus Barrier Dispelled)
[Phase 3: Portal Sequence 3 (Apparition Clears)]
       │
       ▼
[Phase 4: Throne Room Final Burn] (100% - 0%)
       │
       ▼ (Calphayus HP = 0%)
   [VICTORY]
```

#### Detailed Phase Breakdown & State Rules
* **Phases 1–3: Past & Future Portal Sequences**
  * **Mechanics & State Rules:** Raid splits between **Past (Orange)** and **Future (Purple)** portals. Past team plants seeds and places crystals; Future team harvests grown trees and harmonizes crystals to strip Calphayus's invulnerability.
  * **Exit Condition:** Third portal sequence completed.
* **Phase 4: Throne Room Final Burn (100%–0%)**
  * **Entry Trigger:** Returning to the main chamber.
  * **Active Entities:** Calphayus.
  * **Mechanics & State Rules:** Burn Calphayus before environmental corruption soft enrages.
  * **Terminal Condition (Kill):** Calphayus reaches $0\%$ HP.

---

### Boss 4: Dread Master Raptus
* **Location:** Oricon | **Tiers:** SM / VM / MM | **Level:** 80
* **Base FQN / Engine ID:** `bkg.npc.ep80_ops.dp.dread_master_raptus` (`16141120938491823904`)

| Boss / Encounter | Phases | Key Entities & Adds | Encounter Mechanics / Target Types |
| :--- | :--- | :--- | :--- |
| **Dread Master Raptus** | **P1–P3:** Role Challenge Portals.<br>**P4:** Arena Burn. | • Dread Master Raptus<br>• Captive Shadows<br>• Trial Brutes | • Tank, DPS, Healer trial portals.<br>• Force Execution cleave.<br>• Deadly Whirlwind kiting. |

#### State Flow Map
```
[Phase 1: Main Arena Combat] ──(Trial Portals Open)──► [Phase 2: Role Trial Challenges]
       ▲                                                           │
       └──────────────(Trials Complete / Buffs Gained)─────────────┘
       │
       ▼ (Raptus HP = 0%)
   [VICTORY]
```

#### Detailed Phase Breakdown & State Rules
* **Phases 1–3: Role Trials & Arena Combat**
  * **Mechanics & State Rules:** Raptus opens 3 trial portals:
    * *Tank Trial:* Tank enters and survives an invincible brute using defensive cooldowns.
    * *DPS Trial:* DPS enter and destroy *Captive Shadows* within 30 seconds.
    * *Healer Trial:* Healers enter and heal the dying captive NPC to 100%.
  * **Arena Mechanics:** Dodge *Force Execution* (narrow red line cleave) and kite boss during *Deadly Whirlwind*.
  * **Terminal Condition (Kill):** Raptus reaches $0\%$ HP.

---

### Boss 5: The Dread Council
* **Location:** Oricon | **Tiers:** SM / VM / MM | **Level:** 80
* **Base FQN / Engine ID:** `bkg.npc.ep80_ops.dp.the_dread_council` (`16141120938491823905`)

| Boss / Encounter | Phases | Key Entities & Adds | Encounter Mechanics / Target Types |
| :--- | :--- | :--- | :--- |
| **The Dread Council** | **P1:** Bestia & Calphayus.<br>**P2:** Tyrans & Raptus.<br>**P3:** Styrak & Brontes Phantoms.<br>**P4:** 4 Masters Simultaneous 15% Burn. | • Bestia, Calphayus, Tyrans, Raptus<br>• Styrak & Brontes Crystals | • 50% Throne retreats.<br>• Crystal manifestation clears.<br>• Dread Empowerment simultaneous kill. |

#### State Flow Map
```
[Phase 1: Bestia & Calphayus Active] (100% - 50%)
       │
       ▼ (Both Pushed to ≤ 50% -> Return to Thrones)
[Phase 2: Tyrans & Raptus Active] (100% - 50%)
       │
       ▼ (Both Pushed to ≤ 50% -> Return to Thrones)
[Phase 3: Styrak & Brontes Crystal Manifestations]
       │
       ▼ (Both Manifestations Destroyed)
[Phase 4: All 4 Masters Land for Simultaneous 15% Burn] (15% - 0%)
       │
       ▼ (All 4 Masters Die within 10s of each other)
   [VICTORY]
```

#### Detailed Phase Breakdown & State Rules
* **Phase 1: Bestia & Calphayus (100%–50%)**
  * **Mechanics & State Rules:** Tanks separate Bestia and Calphayus. Push both to $50\%$ to force them back to their thrones.
* **Phase 2: Tyrans & Raptus (100%–50%)**
  * **Mechanics & State Rules:** Tank Tyrans and Raptus; dodge *Force Execution* and *Death Mark*. Push both to $50\%$.
* **Phase 3: Styrak & Brontes Manifestations**
  * **Mechanics & State Rules:** Destroy Styrak and Brontes manifestations emerging from the center crystals.
* **Phase 4: Simultaneous 15% Burn**
  * **Entry Trigger:** All 4 Masters land together at $15\%$ HP.
  * **Mechanics & State Rules:** Balance damage across all 4 Masters. When any master dies, the remaining masters gain *Dread Empowerment* stacks (wiping the raid if not killed within 10 seconds).
  * **Terminal Condition (Kill):** All 4 Masters reach $0\%$ HP.

---

# 8. The Ravagers

```
[B1: Sparky] ──► [B2: Quartermaster Bulo] ──► [B3: Torque] ──► [B4: Master & Blaster] ──► [B5: Coratanni]
```

---

### Boss 1: Sparky
* **Location:** Rishi | **Tiers:** SM / VM / MM | **Level:** 80
* **Base FQN / Engine ID:** `bkg.npc.ep80_ops.rav.sparky` (`16141139481940182745`)

| Boss / Encounter | Phases | Key Entities & Adds | Encounter Mechanics / Target Types |
| :--- | :--- | :--- | :--- |
| **Sparky** | **P1 (100%–0%):** "Delicious" Aggro Swaps & Pack Hunter Waves. | • Sparky (Colicoid)<br>• Pack Hunters | • "Delicious" debuff swap.<br>• Rampage channel interrupt.<br>• Pack Hunter add cleave. |

#### State Flow Map
```
[Phase 1: Cave Combat & "Delicious" Swaps] (100% - 0%)
       │
       ├──► Boss applies Delicious to Main Tank ──► Off-Tank Taunts Sparky
       ├──► Pack Hunters spawn ──────────────────► Fixate on "Delicious" Tank / Cleaved
       ├──► Boss casts Rampage ──────────────────► Interrupt immediately
       │
       ▼ (Sparky HP = 0%)
   [VICTORY]
```

#### Detailed Phase Breakdown & State Rules
* **Phase 1: Cave Combat (100%–0%)**
  * **Entry Trigger:** Engaging Sparky.
  * **Active Entities:** Sparky, Pack Hunters.
  * **Mechanics & State Rules:** Sparky applies *Delicious* to the current tank; *Pack Hunters* fixate on this player. Off-tank taunts Sparky away while DPS AoE-cleaves the Pack Hunters on the Delicious tank. Interrupt *Rampage*.
  * **Terminal Condition (Kill):** Sparky reaches $0\%$ HP.

---

### Boss 2: Quartermaster Bulo
* **Location:** Rishi | **Tiers:** SM / VM / MM | **Level:** 80
* **Base FQN / Engine ID:** `bkg.npc.ep80_ops.rav.quartermaster_bulo` (`16141139481940182746`)

| Boss / Encounter | Phases | Key Entities & Adds | Encounter Mechanics / Target Types |
| :--- | :--- | :--- | :--- |
| **Quartermaster Bulo** | **P1 (100%–0%):** Massive Barrel Toss, Cart Kiting, & Scattershot. | • Quartermaster Bulo<br>• Pirate Deckhands<br>• Load Lifter Droids | • Massive Barrel run-out.<br>• Cart kiting into pirate adds.<br>• Scattershot tank swap. |

#### State Flow Map
```
[Phase 1: Cargo Bay Combat & Barrel Kiting] (100% - 0%)
       │
       ├──► Massive Barrel targeted: Player runs barrel away from group
       ├──► Explosive Cart spawns: Kite cart into Pirate Deckhand adds
       ├──► Scattershot: Tanks swap on armor debuff
       │
       ▼ (Bulo HP = 0%)
   [VICTORY]
```

#### Detailed Phase Breakdown & State Rules
* **Phase 1: Cargo Bay Combat (100%–0%)**
  * **Entry Trigger:** Engaging Bulo.
  * **Active Entities:** Quartermaster Bulo, Pirate Deckhands, Load Lifter Droids.
  * **Mechanics & State Rules:** Targeted player runs *Massive Barrel* out of the group. Kite explosive cargo carts directly into *Pirate Deckhands* to blow them up. Tanks swap on *Scattershot*.
  * **Terminal Condition (Kill):** Bulo reaches $0\%$ HP.

---

### Boss 3: Torque
* **Location:** Rishi | **Tiers:** SM / VM / MM | **Level:** 80
* **Base FQN / Engine ID:** `bkg.npc.ep80_ops.rav.torque` (`16141139481940182747`)

| Boss / Encounter | Phases | Key Entities & Adds | Encounter Mechanics / Target Types |
| :--- | :--- | :--- | :--- |
| **Torque** | **P1 (100%–0%):** Maintenance Console Defense & Fire Vents. | • Torque<br>• Shoots-Lasers Droids<br>• Sabotage / Repair Droids | • Protect repair droids.<br>• Activate floor fire vents.<br>• Cleanse Disorientation Grenades. |

#### State Flow Map
```
[Phase 1: Maintenance Room Console Defense] (100% - 0%)
       │
       ├──► Sabotage Droids spawn ─────► Burn before they destroy Room Consoles
       ├──► Shoots-Lasers Droids spawn ─► Activate Floor Fire Vents to incinerate
       ├──► Disorientation Grenade ────► Healers Cleanse immediately
       │
       ▼ (Torque HP = 0%)
   [VICTORY]
```

#### Detailed Phase Breakdown & State Rules
* **Phase 1: Console Defense (100%–0%)**
  * **Entry Trigger:** Engaging Torque.
  * **Active Entities:** Torque, Shoots-Lasers Droids, Sabotage Droids, Repair Droids.
  * **Mechanics & State Rules:** Protect repair droids fixing the consoles. Activate floor fire vents to destroy *Shoots-Lasers Droids*. Cleanse *Disorientation Grenades*.
  * **Terminal Condition (Kill):** Torque reaches $0\%$ HP.

---

### Boss 4: Master & Blaster
* **Location:** Rishi | **Tiers:** SM / VM / MM | **Level:** 80
* **Base FQN / Engine ID:** `bkg.npc.ep80_ops.rav.master_and_blaster` (`16141139481940182748`)

| Boss / Encounter | Phases | Key Entities & Adds | Encounter Mechanics / Target Types |
| :--- | :--- | :--- | :--- |
| **Master & Blaster** | **P1:** Master Active.<br>**P2:** Blaster Active & Mines.<br>**P3 (Sub-20%):** Dual Sweeping Laser Burn. | • Master (Gunner)<br>• Blaster (Massive Droid)<br>• Proximity Mines | • Ion Cutter tank swap.<br>• Thermal Mine absorption.<br>• Sweeping Laser rotation & knockbacks. |

#### State Flow Map
```
[Phase 1: Master Pod Bombardment]
       │
       ▼ (Master Enters Immunity Pod)
[Phase 2: Blaster Ground Combat & Mines]
       │
       ▼ (Master Lands)
[Phase 3: Dual Boss Sweeping Laser Burn] (20% - 0%)
       │
       ▼ (Both Bosses HP = 0%)
   [VICTORY]
```

#### Detailed Phase Breakdown & State Rules
* **Phase 1: Master Focus**
  * **Active Entities:** Master, Blaster (Shielded).
  * **Mechanics & State Rules:** Tank Master; avoid red bombardment circles.
  * **Exit Condition:** Master retreats to pod.
* **Phase 2: Blaster Focus**
  * **Active Entities:** Blaster, Thermal Mines.
  * **Mechanics & State Rules:** Tanks swap on *Ion Cutter* stacks. Soak *Thermal Mines* with defensives.
  * **Exit Condition:** Master rejoins the fight.
* **Phase 3: Dual Sweeping Laser Burn (Sub-20%)**
  * **Active Entities:** Master and Blaster.
  * **Mechanics & State Rules:** Blaster casts *Sweeping Laser* (rotating knockback beam); stay close behind Blaster while burning both targets.
  * **Terminal Condition (Kill):** Both Master and Blaster reach $0\%$ HP.

---

### Boss 5: Coratanni & Ruugar
* **Location:** Rishi | **Tiers:** SM / VM / MM | **Level:** 80
* **Base FQN / Engine ID:** `bkg.npc.ep80_ops.rav.coratanni` (`16141139481940182749`)

| Boss / Encounter | Phases | Key Entities & Adds | Encounter Mechanics / Target Types |
| :--- | :--- | :--- | :--- |
| **Coratanni & Ruugar** | **P1:** Coratanni & Pearl (Bridge).<br>**T1:** Escape Pod Run.<br>**P2:** Ruugar & Hostages. | • Coratanni<br>• Pearl (Pet)<br>• Ruugar<br>• Hostages / Mercenaries | • Pearl separation tanking.<br>• Coratanni escape pod push.<br>• Ruugar mine placement.<br>• Hostage cleave avoidance. |

#### State Flow Map
```
[Phase 1: Bridge Battle (Coratanni & Pearl)] (100% - 20%)
       │
       ▼ (Coratanni HP ≤ 20% -> Flees in Escape Pod)
[Transition: Cargo Hold Transit Corridor]
       │
       ▼ (Enter Lower Hold)
[Phase 2: Ruugar Arena Combat & Hostages] (100% - 0%)
       │
       ▼ (Ruugar HP = 0%)
   [VICTORY]
```

#### Detailed Phase Breakdown & State Rules
* **Phase 1: Bridge Battle (100%–20%)**
  * **Active Entities:** Coratanni, Pearl.
  * **Mechanics & State Rules:** Tank Pearl away from Coratanni (*Acid Breath*). DPS burns Pearl, then pushes Coratanni to $20\%$.
  * **Exit Condition:** Coratanni boards the escape pod.
* **Phase 2: Ruugar Combat (100%–0%)**
  * **Entry Trigger:** Entering the lower cargo hold.
  * **Active Entities:** Ruugar, Cargo Bay Mercenaries, Hostages.
  * **Mechanics & State Rules:** Drop Ruugar's mines against outer walls. Avoid AoE damage near friendly *Hostages*. Burn Ruugar.
  * **Terminal Condition (Kill):** Ruugar reaches $0\%$ HP.

---

# 9. Temple of Sacrifice (ToS)

```
[B1: Malaphar] ──► [B2: Sword Squadron] ──► [B3: Underlurker] ──► [B4: Commanders] ──► [B5: Revan]
```

---

### Boss 1: Malaphar the Savage
* **Location:** Yavin 4 | **Tiers:** SM / VM / MM | **Level:** 80
* **Base FQN / Engine ID:** `bkg.npc.ep80_ops.tos.malaphar` (`16141148291049283711`)

| Boss / Encounter | Phases | Key Entities & Adds | Encounter Mechanics / Target Types |
| :--- | :--- | :--- | :--- |
| **Malaphar the Savage** | **P1 (100%–0%):** Savagery vs. Exhaustion Circle Balancing. | • Malaphar<br>• Savage Adds | • Red Circle (Savagery buff / high damage).<br>• Blue Circle (Exhaustion cleanse).<br>• Savage add cleave. |

#### State Flow Map
```
[Phase 1: Savagery vs. Exhaustion Circle Balancing] (100% - 0%)
       │
       ├──► Stand in Red Circle ──► Gain Savagery stacks (Bonus DPS / High incoming damage)
       ├──► Step into Blue Circle ─► Clears Savagery with Exhaustion
       ├──► Add waves spawn ──────► Cleave down on boss
       │
       ▼ (Malaphar HP = 0%)
   [VICTORY]
```

#### Detailed Phase Breakdown & State Rules
* **Phase 1: Circle Balancing (100%–0%)**
  * **Entry Trigger:** Engaging Malaphar.
  * **Active Entities:** Malaphar, Savage Adds.
  * **Mechanics & State Rules:** Players stand in the Red circle to gain *Savagery* (increasing damage done and damage taken); when stacks reach 10–12, step into the Blue circle to clear stacks. Tanks alternate circles to manage incoming damage. Cleave adds.
  * **Terminal Condition (Kill):** Malaphar reaches $0\%$ HP.

---

### Boss 2: Sword Squadron (Unit 1 & Unit 2)
* **Location:** Yavin 4 | **Tiers:** SM / VM / MM | **Level:** 80
* **Base FQN / Engine ID:** `bkg.npc.ep80_ops.tos.sword_squadron` (`16141148291049283712`)

| Boss / Encounter | Phases | Key Entities & Adds | Encounter Mechanics / Target Types |
| :--- | :--- | :--- | :--- |
| **Sword Squadron** | **P1 (100%–0%):** Dual Walker Balancing & Bomb Defusals. | • Unit 1 (Walker)<br>• Unit 2 (Walker)<br>• Shield Drones / Bombers | • Huge Grenade & Gravity Missile soak.<br>• Bomb collection and throw.<br>• Simultaneous kill. |

#### State Flow Map
```
[Phase 1: Dual Walker Balancing & Bomb Defusals] (100% - 0%)
       │
       ├──► Walker Shields Deploy ──► Throw collected bombs to drop shield
       ├──► Gravity Missiles Target ─► Soak missiles outside the raid
       │
       ▼ (Both Walkers HP ≤ 0% within 10s)
   [VICTORY]
```

#### Detailed Phase Breakdown & State Rules
* **Phase 1: Dual Walker Combat (100%–0%)**
  * **Entry Trigger:** Engaging Unit 1 or Unit 2.
  * **Active Entities:** Unit 1, Unit 2, Shield Drones, Bombers.
  * **Mechanics & State Rules:** Tanks separate walkers. When a walker deploys shields, collect bombs from downed bombers and throw them at the walker to collapse its barrier. Kill both walkers within 10 seconds of each other.
  * **Terminal Condition (Kill):** Both walkers reach $0\%$ HP.

---

### Boss 3: The Underlurker
* **Location:** Yavin 4 | **Tiers:** SM / VM / MM | **Level:** 80
* **Base FQN / Engine ID:** `bkg.npc.ep80_ops.tos.the_underlurker` (`16141148291049283713`)

| Boss / Encounter | Phases | Key Entities & Adds | Encounter Mechanics / Target Types |
| :--- | :--- | :--- | :--- |
| **The Underlurker** | **P1:** Combat & Lurkerlings.<br>**P2:** Cross Collapse Check. | • The Underlurker<br>• Lurkerlings | • Lurkerling AoE burst.<br>• Cross Formation positioning behind rock.<br>• Collapse wipe check. |

#### State Flow Map
```
[Phase 1: Combat & Lurkerling Cleave]
       │
       ▼ (Boss channels Collapse -> Spawns Cross Grid)
[Phase 2: The Cross Formation Alignment]
       │
       ├──► Position behind rock: 3 North, 1 East, 1 South, 1 West (8m)
       ├──► All 4 cross arms turn Green ──► Raid Survives Collapse
       │
       ▼ (Cross Passed)
[Return to Phase 1 Combat Loop] ──► [Boss HP = 0%] ──► [VICTORY]
```

#### Detailed Phase Breakdown & State Rules
* **Phase 1 & 2: Combat & Cross Loop**
  * **Mechanics & State Rules:** Clear *Lurkerlings* quickly. When Underlurker casts *Collapse*, raid hides behind the fallen boulder and forms a perfect cross (3 North, 1 East, 1 South, 1 West in 8-player mode). All 4 cross arms must turn green before the channel ends to prevent a raid wipe.
  * **Terminal Condition (Kill):** Underlurker reaches $0\%$ HP.

---

### Boss 4: Revanite Commanders
* **Location:** Yavin 4 | **Tiers:** SM / VM / MM | **Level:** 80
* **Base FQN / Engine ID:** `bkg.npc.ep80_ops.tos.revanite_commanders` (`16141148291049283714`)

| Boss / Encounter | Phases | Key Entities & Adds | Encounter Mechanics / Target Types |
| :--- | :--- | :--- | :--- |
| **Revanite Commanders** | **P1–P3:** Platform Commander Rotation. | • Lord Kurse<br>• Mandalore Deret<br>• Salk Atok | • Orbital Bombardment shield dome collapse.<br>• Platform rotation.<br>• Balanced kill. |

#### State Flow Map
```
[Phase 1: Commander Rotation (Kurse / Deret / Salk)] (100% - 0%)
       │
       ├──► Orbital Bombardment Triggered ──► Entire raid stacks inside active Shield Dome
       │
       ▼ (All 3 Commanders HP = 0%)
   [VICTORY]
```

#### Detailed Phase Breakdown & State Rules
* **Phase 1: Commander Rotation (100%–0%)**
  * **Active Entities:** Lord Kurse, Mandalore Deret, Salk Atok.
  * **Mechanics & State Rules:** Tanks manage bosses across platforms. When *Orbital Bombardment* initiates, all players must stack inside the active commander's *Shield Dome* to survive.
  * **Terminal Condition (Kill):** All 3 commanders reach $0\%$ HP.

---

### Boss 5: The Returned Revan
* **Location:** Yavin 4 | **Tiers:** SM / VM / MM | **Level:** 80
* **Base FQN / Engine ID:** `bkg.npc.ep80_ops.tos.the_returned_revan` (`16141148291049283715`)

| Boss / Encounter | Phases | Key Entities & Adds | Encounter Mechanics / Target Types |
| :--- | :--- | :--- | :--- |
| **The Returned Revan** | **P1 (100%–70%):** Ground.<br>**P2 (70%–30%):** Spire & Aberrations.<br>**P3 (30%–0%):** Core Sacrifice DPS Race. | • The Returned Revan<br>• Essence of the Machine<br>• Revanite Apparitions | • Impale tank swap.<br>• Spire Heave knockback.<br>• Aberration clears.<br>• Core Sacrifice DPS race. |

#### State Flow Map
```
[Phase 1: Ground Platform Combat] (100% - 70%)
       │
       ▼ (Revan HP ≤ 70% -> Spire Platform Transition)
[Phase 2: The Spire, Aberrations, & Heaves] (70% - 30%)
       │
       ▼ (Revan HP ≤ 30% -> Machine Core Drop)
[Phase 3: The Machine Core Sacrifice DPS Race] (30% - 0%)
       │
       ▼ (All 4 Machine Cores Destroyed)
   [VICTORY]
```

#### Detailed Phase Breakdown & State Rules
* **Phase 1: Ground Platform (100%–70%)**
  * **Mechanics & State Rules:** Tanks swap on *Impale*. Spread out for *Force Essence*.
  * **Exit Condition:** Revan hits $\le 70\%$ HP.
* **Phase 2: The Spire (70%–30%)**
  * **Mechanics & State Rules:** Revan casts *Heave* (vertical knockback). Clear *Aberrations* and pass energy tethers.
  * **Exit Condition:** Revan hits $\le 30\%$ HP.
* **Phase 3: The Machine Core DPS Race (30%–0%)**
  * **Entry Trigger:** Revan channels the final *Sacrifice*.
  * **Mechanics & State Rules:** Revan is immune. Raid focuses all DPS on the 4 *Machine Cores* to destroy them before Revan's cast completes.
  * **Terminal Condition (Win):** All 4 Machine Cores destroyed.

---

# 10. Gods from the Machine (GotM)

```
[B1: Tyth] ──► [B2: Aivela & Esne] ──► [B3: Nahut] ──► [B4: Scyva] ──► [B5: Izax]
```

---

### Boss 1: Tyth, God of Rage
* **Location:** Iokath | **Tiers:** SM / VM / MM | **Level:** 80
* **Base FQN / Engine ID:** `bkg.npc.ep80_ops.gotm.tyth` (`16141169018472910482`)

| Boss / Encounter | Phases | Key Entities & Adds | Encounter Mechanics / Target Types |
| :--- | :--- | :--- | :--- |
| **Tyth** | **P1 (100%–0%):** Rage Meter, Droid Waves, & Inversion Cleave. | • Tyth<br>• Guardian Droids<br>• Grace / Justice Droids | • Rage meter management (0–100).<br>• Inversion Cleave tanking.<br>• Energy Overload wipe prevention. |

#### State Flow Map
```
[Phase 1: Rage Meter & Droid Wave Management] (100% - 0%)
       │
       ├──► Tyth gains Rage on hits ──► Kill Guardian Droids to drain Rage
       ├──► Rage reaches 100 ────────► Instant Wipe (Energy Overload)
       ├──► Inversion Cleave ────────► Main Tank faces boss away from raid
       │
       ▼ (Tyth HP = 0%)
   [VICTORY]
```

#### Detailed Phase Breakdown & State Rules
* **Phase 1: Rage Management (100%–0%)**
  * **Entry Trigger:** Engaging Tyth.
  * **Active Entities:** Tyth, Guardian Droids, Grace Droids, Justice Droids.
  * **Mechanics & State Rules:** Tyth's Rage increases when hit. If Rage hits 100, he casts *Energy Overload* (wipe). Killing Guardian Droids removes Tyth's Rage. Tanks turn *Inversion Cleave* away from the group.
  * **Terminal Condition (Kill):** Tyth reaches $0\%$ HP.

---

### Boss 2: Aivela & Esne
* **Location:** Iokath | **Tiers:** SM / VM / MM | **Level:** 80
* **Base FQN / Engine ID:** `bkg.npc.ep80_ops.gotm.aivela_and_esne` (`16141169018472910483`)

| Boss / Encounter | Phases | Key Entities & Adds | Encounter Mechanics / Target Types |
| :--- | :--- | :--- | :--- |
| **Aivela & Esne** | **P1:** Polarization & Matrix Reflect.<br>**P2:** Countermeasures.<br>**P3:** Synchronized Burn. | • Aivela (Passion)<br>• Esne (Envy)<br>• Polarization Drones | • Positive (Blue) / Negative (Red) tuning.<br>• Countermeasure laser reflect.<br>• Simultaneous kill. |

#### State Flow Map
```
[Phase 1: Polarization Tuning (Positive/Negative) & Drone Clears]
       │
       ▼ (Matrix Countermeasures Activated)
[Phase 2: Laser Reflection Puzzle]
       │
       ▼ (Countermeasures Cleared)
[Phase 3: Synchronized Dual Burn] (100% - 0%)
       │
       ▼ (Both Bosses HP ≤ 0% within 5s)
   [VICTORY]
```

#### Detailed Phase Breakdown & State Rules
* **Phase 1 to Phase 3: Polarization & Matrix Synchronization**
  * **Mechanics & State Rules:** Players match their polarity (Positive/Negative) to active boss shields and incoming beams. Reflect matrix lasers back onto the bosses. Both bosses must die within 5 seconds of each other.
  * **Terminal Condition (Kill):** Both Aivela and Esne reach $0\%$ HP.

---

### Boss 3: Nahut, Son of Envy
* **Location:** Iokath | **Tiers:** SM / VM / MM | **Level:** 80
* **Base FQN / Engine ID:** `bkg.npc.ep80_ops.gotm.nahut` (`16141169018472910484`)

| Boss / Encounter | Phases | Key Entities & Adds | Encounter Mechanics / Target Types |
| :--- | :--- | :--- | :--- |
| **Nahut** | **P1:** Stealth Shroud & Light Beacons.<br>**P2:** Turret Extraction.<br>**P3 (Sub-20%):** Ring of Fire. | • Nahut<br>• Stealth Drones<br>• Rail Turrets | • Power Core carrying to floor beacons.<br>• Breaking Nahut's stealth.<br>• Ring of Fire contracting burn. |

#### State Flow Map
```
[Phase 1: Cloaked Stealth & Light Beacon Powering]
       │
       ▼ (Nahut Exposed via Light Conduit)
[Phase 2: Rail Turret Destruction & Core Extraction]
       │
       ▼ (Nahut HP ≤ 20%)
[Phase 3: Contracting Ring of Fire Final Burn] (20% - 0%)
       │
       ▼ (Nahut HP = 0%)
   [VICTORY]
```

#### Detailed Phase Breakdown & State Rules
* **Phase 1: Stealth & Beacons**
  * **Mechanics & State Rules:** Nahut is invisible in shadow. Carry Power Cores to floor conduits to illuminate the arena and expose Nahut.
  * **Exit Condition:** Nahut pushed through core threshold.
* **Phase 2: Rail Turrets**
  * **Mechanics & State Rules:** Destroy heavy snare *Rail Turrets*.
* **Phase 3: Ring of Fire (Sub-20%)**
  * **Entry Trigger:** Nahut reaches $\le 20\%$ HP.
  * **Mechanics & State Rules:** Nahut ignites the outer perimeter in a shrinking ring of fire; burn boss before safe floor area vanishes.
  * **Terminal Condition (Kill):** Nahut reaches $0\%$ HP.

---

### Boss 4: Scyva, Mother of Sorrows
* **Location:** Iokath | **Tiers:** SM / VM / MM | **Level:** 80
* **Base FQN / Engine ID:** `bkg.npc.ep80_ops.gotm.scyva` (`16141169018472910485`)

| Boss / Encounter | Phases | Key Entities & Adds | Encounter Mechanics / Target Types |
| :--- | :--- | :--- | :--- |
| **Scyva** | **P1:** Purifier Cores & Shield Overload.<br>**P2:** Extinction Protocol Beam.<br>**P3:** Avatar Burn. | • Scyva<br>• Archive Droids<br>• Purifier Cores | • Extinction Protocol beam kiting.<br>• Shield console overload.<br>• Atomic Energy orb soaking. |

#### State Flow Map
```
[Phase 1: Shield Overload & Purifier Cores]
       │
       ▼ (Shields Down)
[Phase 2: Extinction Protocol Orbital Beam Kiting]
       │
       ▼ (Console Override Complete)
[Phase 3: Scyva Avatar Final Burn] (100% - 0%)
       │
       ▼ (Scyva HP = 0%)
   [VICTORY]
```

#### Detailed Phase Breakdown & State Rules
* **Phase 1 & 2: Shields & Orbital Beam**
  * **Mechanics & State Rules:** Overload shield consoles. Kite the giant *Extinction Protocol* orbital beam into *Archive Droids* to disintegrate them.
  * **Exit Condition:** Consoles overridden.
* **Phase 3: Scyva Avatar Final Burn (100%–0%)**
  * **Entry Trigger:** Scyva's avatar descends.
  * **Mechanics & State Rules:** Soak atomic energy orbs; burn Scyva's core.
  * **Terminal Condition (Kill):** Scyva reaches $0\%$ HP.

---

### Boss 5: Izax, The Destroyer
* **Location:** Iokath | **Tiers:** SM / VM / MM | **Level:** 80
* **Base FQN / Engine ID:** `bkg.npc.ep80_ops.gotm.izax` (`16141169018472910486`)

| Boss / Encounter | Phases | Key Entities & Adds | Encounter Mechanics / Target Types |
| :--- | :--- | :--- | :--- |
| **Izax** | **P1:** Tether / Pylons.<br>**P2:** EMP Induction.<br>**P3:** Anchor Drones.<br>**P4:** Hull Redirect.<br>**P5:** Omni-Wipe Burn. | • Izax<br>• Anchor Drones<br>• Induction Nodes | • EMP charge soaking.<br>• Drone Harpoon anchor tethers.<br>• Catalyst cannon firing.<br>• Omni-wipe burn race. |

#### State Flow Map
```
[Phase 1: Platform Pylons & Conduit Tethers]
       │
       ▼
[Phase 2: EMP Induction Nodes & Charge Soaking]
       │
       ▼
[Phase 3: Anchor Drone Harpoon Tethering]
       │
       ▼
[Phase 4: Catalyst Cannon Hull Reflection]
       │
       ▼
[Phase 5: Central Conduit Omni-Wipe Final Burn] (100% - 0%)
       │
       ▼ (Izax HP = 0%)
   [VICTORY]
```

#### Detailed Phase Breakdown & State Rules
* **Phases 1–4: Tethering & Catalyst Cannon Sequences**
  * **Mechanics & State Rules:** Secure platform pylons, soak EMP bursts, grab *Harpoon Anchors* from shot-down drones, tether Izax's limbs, and fire the catalyst cannon into his chest.
  * **Exit Condition:** Izax lands on the central conduit.
* **Phase 5: Central Conduit Omni-Wipe Burn (100%–0%)**
  * **Entry Trigger:** Izax roots on the central platform.
  * **Mechanics & State Rules:** DPS race against Izax's 360-degree *Omni-Wipe* charge.
  * **Terminal Condition (Kill):** Izax reaches $0\%$ HP.

---

# 11. The Nature of Progress (Dxun)

```
[B1: Red] ──► [B2: Mutant Squad] ──► [B3: Holding Pens] ──► [B4: Huntmaster] ──► [B5: Apex Vanguard]
```

---

### Boss 1: Red, the Primeval Stalker
* **Location:** Dxun | **Tiers:** SM / VM / MM | **Level:** 80
* **Base FQN / Engine ID:** `bkg.npc.ep80_ops.dxun.red` (`16141189402847192031`)

| Boss / Encounter | Phases | Key Entities & Adds | Encounter Mechanics / Target Types |
| :--- | :--- | :--- | :--- |
| **Red, the Packmaster** | **P1:** Red Combat.<br>**P2:** Felshade Hunt & Flare Batteries. | • Red<br>• Felshade Prowlers | • Flare Battery illumination.<br>• Stealth reveal in light zones.<br>• Acid spray kiting. |

#### State Flow Map
```
[Phase 1: Red Engagement in Light Zone]
       │
       ▼ (Red Flees into Shadows)
[Phase 2: Felshade Hunt & Flare Battery Placement]
       │
       ▼ (Felshades Cleared in Light -> Red Returns)
[Return to Phase 1 Combat Loop] ──► [Red HP = 0%] ──► [VICTORY]
```

#### Detailed Phase Breakdown & State Rules
* **Phase 1 & 2: Light Flare & Felshade Loop**
  * **Mechanics & State Rules:** Carry and deploy *Flare Batteries* to create light zones. *Felshade Prowlers* are immune to damage in darkness; drag them into light zones to burn them. Tank faces Red away (*Acid Spray*).
  * **Terminal Condition (Kill):** Red reaches $0\%$ HP.

---

### Boss 2: Mutant Trandoshan Squad
* **Location:** Dxun | **Tiers:** SM / VM / MM | **Level:** 80
* **Base FQN / Engine ID:** `bkg.npc.ep80_ops.dxun.mutant_squad` (`16141189402847192032`)

| Boss / Encounter | Phases | Key Entities & Adds | Encounter Mechanics / Target Types |
| :--- | :--- | :--- | :--- |
| **Mutant Trandoshan Squad** | **P1 (100%–0%):** 4 Mutants & Decontamination Scrubbers. | • Greus (Flamethrower)<br>• Kronissus (Cryo)<br>• Hissyphus (Poison)<br>• Dretcher (Acid) | • Elemental debuff stacking.<br>• Matching Decontamination Stations.<br>• Synchronized kill. |

#### State Flow Map
```
[Phase 1: 4 Mutant Trandoshans Active] (100% - 0%)
       │
       ├──► Elemental Debuff Stacks reach 10 ──► Step into matching Decon Scrubber Station
       │
       ▼ (All 4 Mutants HP ≤ 0% within 15s)
   [VICTORY]
```

#### Detailed Phase Breakdown & State Rules
* **Phase 1: Elemental Scrubbing (100%–0%)**
  * **Active Entities:** Greus, Kronissus, Hissyphus, Dretcher.
  * **Mechanics & State Rules:** Bosses apply Fire, Cryo, Poison, and Acid stacks. When stacks reach high thresholds, step into the matching color *Decontamination Station* to cleanse. Kill all 4 within 15 seconds of each other.
  * **Terminal Condition (Kill):** All 4 mutants reach $0\%$ HP.

---

### Boss 3: The Holding Pens
* **Location:** Dxun | **Tiers:** SM / VM / MM | **Level:** 80
* **Base FQN / Engine ID:** `bkg.npc.ep80_ops.dxun.holding_pens` (`16141189402847192033`)

| Boss / Encounter | Phases | Key Entities & Adds | Encounter Mechanics / Target Types |
| :--- | :--- | :--- | :--- |
| **The Holding Pens** | **P1:** Containment Valves & Cattle Prods.<br>**P2:** TITAN Variant. | • TITAN-6 Variant<br>• Escaped Experimentals | • Cattle-prod shocker stuns.<br>• Containment valve gate locks.<br>• Door lock puzzle. |

#### State Flow Map
```
[Phase 1: Containment Gate Puzzle & Cattle Prod Beast Herding]
       │
       ▼ (All Containment Pens Secured)
[Phase 2: TITAN Variant Security Lockdown] (100% - 0%)
       │
       ▼ (TITAN Variant HP = 0%)
   [VICTORY]
```

#### Detailed Phase Breakdown & State Rules
* **Phase 1 & 2: Gate Security & TITAN Combat**
  * **Mechanics & State Rules:** Use shock cattle-prods to stun and herd escaping beasts back into security pens while routing power valves. Burn the TITAN variant.
  * **Terminal Condition (Kill):** TITAN variant reaches $0\%$ HP.

---

### Boss 4: The Huntmaster
* **Location:** Dxun | **Tiers:** SM / VM / MM | **Level:** 80
* **Base FQN / Engine ID:** `bkg.npc.ep80_ops.dxun.the_huntmaster` (`16141189402847192034`)

| Boss / Encounter | Phases | Key Entities & Adds | Encounter Mechanics / Target Types |
| :--- | :--- | :--- | :--- |
| **The Huntmaster** | **P1–P3:** Sniper Blinds & Traps.<br>**P4:** Arena Burn. | • The Huntmaster<br>• Hunting Hounds<br>• Armored Traps | • Tracking beacon disarms.<br>• Fire / Electro trap routing.<br>• Sniper line-of-sight cover. |

#### State Flow Map
```
[Phase 1: Sniper Blind 1 & Hound Waves] ──► [Phase 2: Blind 2 & Traps] ──► [Phase 3: Blind 3]
                                                                                   │
       ┌───────────────────────────────────────────────────────────────────────────┘
       ▼
[Phase 4: Open Arena Huntmaster Final Burn] (100% - 0%)
       │
       ▼ (Huntmaster HP = 0%)
   [VICTORY]
```

#### Detailed Phase Breakdown & State Rules
* **Phases 1–3: Sniper Blinds & Traps**
  * **Mechanics & State Rules:** Huntmaster fires from fortified sniper perches. Disarm traps, kill hounds, and use line-of-sight cover to force him out of blinds 1, 2, and 3.
  * **Exit Condition:** Third blind cleared.
* **Phase 4: Open Arena Burn (100%–0%)**
  * **Entry Trigger:** Huntmaster descends to ground level.
  * **Active Entities:** The Huntmaster.
  * **Mechanics & State Rules:** Burn Huntmaster before environmental traps ignite the full room.
  * **Terminal Condition (Kill):** Huntmaster reaches $0\%$ HP.

---

### Boss 5: Apex Vanguard
* **Location:** Dxun | **Tiers:** SM / VM / MM | **Level:** 80
* **Base FQN / Engine ID:** `bkg.npc.ep80_ops.dxun.apex_vanguard` (`16141189402847192035`)

| Boss / Encounter | Phases | Key Entities & Adds | Encounter Mechanics / Target Types |
| :--- | :--- | :--- | :--- |
| **Apex Vanguard** | **P1 (100%–0%):** Battery Power Management (Solar / Chemical / Shock). | • Apex Vanguard<br>• Darkness Drones<br>• Acid Slimes | • Battery Charging & Station Routing.<br>• Solar: Dispels darkness shield.<br>• Chemical: Clears acid.<br>• Shock: Interrupts wipe cast. |

#### State Flow Map
```
[Phase 1: Battery Management & Station Routing] (100% - 0%)
       │
       ├──► Darkness Shield Deployed ──► Carry Battery to Solar Station (Dispels Shield)
       ├──► Acid Floods Room ──────────► Carry Battery to Chemical Station (Clears Acid)
       ├──► Boss casts Wipe Channel ───► Carry Battery to Shock Station (Interrupts Wipe)
       │
       ▼ (Apex Vanguard HP = 0%)
   [VICTORY]
```

#### Detailed Phase Breakdown & State Rules
* **Phase 1: Battery Management (100%–0%)**
  * **Entry Trigger:** Pulling Apex Vanguard.
  * **Active Entities:** Apex Vanguard, Darkness Drones, Acid Slimes.
  * **Mechanics & State Rules:** Designated player manages the Portable Battery:
    * *Solar Station:* Dispels boss's invulnerable darkness shield.
    * *Chemical Station:* Neutralizes acid puddles.
    * *Shock Station:* Interrupts boss's lethal wipe cast.
  * **Fail Condition:** Battery reaches 0% power or overheats past 100%.
  * **Terminal Condition (Kill):** Apex Vanguard reaches $0\%$ HP.

---

# 12. R-4 Anomaly

```
[B1: IP-CPT] ──► [B2: Watchdog] ──► [B3: Lord Kanoth] ──► [B4: Lady Dominique]
```

---

### Boss 1: IP-CPT
* **Location:** Elom | **Tiers:** SM / VM | **Level:** 80
* **Base FQN / Engine ID:** `bkg.npc.ep80_ops.r4.ip_cpt` (`16141201948291048172`)

| Boss / Encounter | Phases | Key Entities & Adds | Encounter Mechanics / Target Types |
| :--- | :--- | :--- | :--- |
| **IP-CPT** | **P1 (100%–0%):** Laser Grids, Console Buttons, & Upload Interrupts. | • IP-CPT<br>• Overload Droids<br>• Refurbishing Units | • Floor sector laser grid jumping.<br>• Terminal button overrides.<br>• Sub-system interrupt rotations. |

#### State Flow Map
```
[Phase 1: Rotating Laser Grids & Terminal Overrides] (100% - 0%)
       │
       ├──► Laser Grid sweeps sector ────► Jump over lasers / rotate sectors
       ├──► Upload Sequence initiated ──► Assign players to Terminal Buttons & Interrupt
       │
       ▼ (IP-CPT HP = 0%)
   [VICTORY]
```

#### Detailed Phase Breakdown & State Rules
* **Phase 1: Grid & Console Security (100%–0%)**
  * **Entry Trigger:** Engaging IP-CPT.
  * **Active Entities:** IP-CPT, Overload Droids, Refurbishing Units.
  * **Mechanics & State Rules:** Jump over rotating laser grids. Assign players to terminal buttons to disable room lockouts while rotating interrupts on *Upload Sequence* adds.
  * **Terminal Condition (Kill):** IP-CPT reaches $0\%$ HP.

---

### Boss 2: Watchdog
* **Location:** Elom | **Tiers:** SM / VM | **Level:** 80
* **Base FQN / Engine ID:** `bkg.npc.ep80_ops.r4.watchdog` (`16141201948291048173`)

| Boss / Encounter | Phases | Key Entities & Adds | Encounter Mechanics / Target Types |
| :--- | :--- | :--- | :--- |
| **Watchdog** | **P1 (100%–0%):** Rocket Tethers, Polarity Nodes, & Breakaway Tiles. | • Watchdog<br>• Gravity Mines | • Rocket tether polarity absorption.<br>• Breakaway perimeter tiles.<br>• Gravity suppression polarity swaps. |

#### State Flow Map
```
[Phase 1: Rocket Tethers & Breakaway Platforms] (100% - 0%)
       │
       ├──► Rocket Tether targeted ──► Tethered players split across polarity nodes
       ├──► Floor tiles flash red ───► Evacuate tiles before they collapse into abyss
       │
       ▼ (Watchdog HP = 0%)
   [VICTORY]
```

#### Detailed Phase Breakdown & State Rules
* **Phase 1: Gravity & Tethers (100%–0%)**
  * **Entry Trigger:** Engaging Watchdog.
  * **Active Entities:** Watchdog, Gravity Mines.
  * **Mechanics & State Rules:** Players targeted with *Rocket Tethers* move to opposing polarity nodes to cancel the explosion. Move off perimeter tiles as they flash red and collapse into the pit.
  * **Terminal Condition (Kill):** Watchdog reaches $0\%$ HP.

---

### Boss 3: Lord Kanoth
* **Location:** Elom | **Tiers:** SM / VM | **Level:** 80
* **Base FQN / Engine ID:** `bkg.npc.ep80_ops.r4.lord_kanoth` (`16141201948291048174`)

| Boss / Encounter | Phases | Key Entities & Adds | Encounter Mechanics / Target Types |
| :--- | :--- | :--- | :--- |
| **Lord Kanoth** | **P1:** Frost/Flame Cycles.<br>**T1:** Hallway Run.<br>**P2:** Final Chamber Burn. | • Lord Kanoth<br>• Nihrot Infestations<br>• Corrupted Apparitions | • Nihrot seed cleanup.<br>• Frost/Flame rune polarity clearing.<br>• Rapid corridor sprint. |

#### State Flow Map
```
[Phase 1: Nihrot Frost & Flame Polarity Tiles]
       │
       ▼ (Room Floods with Nihrot)
[Transition: Connecting Corridor Sprint]
       │
       ▼ (Enter Final Chamber)
[Phase 2: Final Chamber Nihrot Burn] (100% - 0%)
       │
       ▼ (Lord Kanoth HP = 0%)
   [VICTORY]
```

#### Detailed Phase Breakdown & State Rules
* **Phase 1 & Transition: Nihrot Cycles & Hallway Run**
  * **Mechanics & State Rules:** Step on opposing elemental runes (Fire clears Frost, Frost clears Fire) to manage *Nihrot Infestation*. When the room becomes overwhelmed, sprint down the connecting hallway.
  * **Exit Condition:** Reaching the final chamber.
* **Phase 2: Final Chamber Burn (100%–0%)**
  * **Entry Trigger:** Engaging Kanoth in Chamber 2.
  * **Mechanics & State Rules:** Execute maximum DPS before Nihrot covers all available safe tiles.
  * **Terminal Condition (Kill):** Lord Kanoth reaches $0\%$ HP.

---

### Boss 4: Lady Dominique
* **Location:** Elom | **Tiers:** SM / VM | **Level:** 80
* **Base FQN / Engine ID:** `bkg.npc.ep80_ops.r4.lady_dominique` (`16141201948291048175`)

| Boss / Encounter | Phases | Key Entities & Adds | Encounter Mechanics / Target Types |
| :--- | :--- | :--- | :--- |
| **Lady Dominique** | **P1:** Dominique Platform.<br>**P2:** Mining Walker Overload.<br>**P3:** Overload Burn. | • Lady Dominique<br>• Corrupted Mining Walker<br>• Mass Anomalies | • Laser tether redirection.<br>• Walker core overload & stun.<br>• Gravity Well displacement. |

#### State Flow Map
```
[Phase 1: Dominique Hover Platform & Aria Tethers]
       │
       ▼ (Mining Walker Powers Up)
[Phase 2: Walker Core Tether Redirection & Stun]
       │
       ▼ (Walker Stunned -> Dominique Shield Drops)
[Phase 3: Lady Dominique Vulnerability Burn] (100% - 0%)
       │
       ▼ (Lady Dominique HP = 0%)
   [VICTORY]
```

#### Detailed Phase Breakdown & State Rules
* **Phase 1 to Phase 3: Platform & Walker Redirection**
  * **Mechanics & State Rules:** Dominique hovers above while the *Mining Walker* attacks ground targets. Redirect laser tether beams into the Walker's power cores to down its shield and stun it, causing Dominique's barrier to drop for DPS burn windows.
  * **Terminal Condition (Kill):** Lady Dominique reaches $0\%$ HP.

---

# 13. Relentless Retribution *(Relentless Replication)*

```
[Boss: Propagator Core XR-53]
```

---

### Boss: Propagator Core XR-53
* **Location:** Ilum (Subterranean Gree Facility) | **Tiers:** SM / VM / MM | **Level:** 80
* **Base FQN / Engine ID:** `bkg.npc.ep80_ops.lair.propagator_core_xr53` (`16141215892019482701`)

| Boss / Encounter | Phases | Key Entities & Adds | Encounter Mechanics / Target Types |
| :--- | :--- | :--- | :--- |
| **Propagator Core XR-53** | **P1 (100%–70%):** Construct Hatching & Cleanses.<br>**P2 (70%–35%):** Prime Directive Shield.<br>**P3 (35%–15%):** Acidic Purge & Collection.<br>**P4 (15%–0%):** Overdrive / Soft Enrage. | • Propagator Core XR-53<br>• Seeker Droids (*Prey Seeker*)<br>• Supplicant / Defender / Rampaging Constructs<br>• Collection Droid | • Lethal Strike tank buster & Extraneous Expulsion.<br>• Hungering Bite yellow floor cleanse.<br>• Prime Directive role shield deactivation.<br>• Acidic puddle vacuuming via Collection Droid.<br>• Continuous Replication Overload pulses. |

#### State Flow Map
```
[Phase 1: Construct Hatching & Debuff Cleansing] (100% - 70%)
       │
       ▼ (Boss HP ≤ 70% or casts Prime Directive)
[Phase 2: Prime Directive Shield & Construct Priority] (70% - 35%)
       │
       ▼ (Boss HP ≤ 35% / Canisters Rupture)
[Phase 3: Acidic Purge & Collection Droid Aura] (35% - 15%)
       │
       ▼ (Boss HP ≤ 15%)
[Phase 4: Core Meltdown / Soft Enrage Burn] (15% - 0%)
       │
       ▼ (Propagator Core XR-53 HP = 0%)
   [VICTORY]
```

#### Detailed Phase Breakdown & State Rules
* **Phase 1: Construct Hatching & Cleansing (100%–70%)**
  * **Entry Trigger:** Engaging Propagator Core XR-53.
  * **Active Entities:** Propagator Core XR-53, Seeker Droids, Imperfect Constructs.
  * **Mechanics & State Rules:** Main tank takes *Lethal Strike*; off-tank taunts to face *Extraneous Expulsion* away from raid. Players step into yellow floor matrices to cleanse *Hungering Bite* stacks. Ranged DPS burst down *Seeker Droids* before they cast hard stuns on players.
  * **Exit Condition:** Boss reaches $\le 70\%$ HP or begins casting *Prime Directive*.
* **Phase 2: Prime Directive Shield (70%–35%)**
  * **Entry Trigger:** Boss reaches $70\%$ HP and casts *Prime Directive*.
  * **Active Entities:** Boss (Shielded), Defender Constructs, Supplicant Constructs, Rampaging Constructs.
  * **Mechanics & State Rules:** Designated roles step into the shield perimeter to disrupt the boss's invulnerable dome (SM/VM: 1 role; MM: 2 distinct roles). DPS rotates interrupts on *Supplicant Constructs* to stop healing channels. Off-tank kites *Rampaging Constructs*.
  * **Exit Condition:** Shield broken and boss pushed to $\le 35\%$ HP.
* **Phase 3: Acidic Purge & Collection Droid (35%–15%)**
  * **Entry Trigger:** Boss reaches $35\%$ HP.
  * **Active Entities:** Boss, Collection Droid, Powerful Constructs.
  * **Mechanics & State Rules:** Acid floods floor quadrants; raid stacks inside the moving *Collection Droid's* aura for immunity while the droid vacuums puddles. Off-tank faces *Powerful Constructs* away from the droid.
  * **Exit Condition:** Boss reaches $\le 15\%$ HP.
* **Phase 4: Core Meltdown Soft Enrage (15%–0%)**
  * **Entry Trigger:** Boss reaches $15\%$ HP.
  * **Active Entities:** Propagator Core XR-53.
  * **Mechanics & State Rules:** Boss enters *Replication Overload*, pulsing escalating electrical damage every 4 seconds. Tanks rotate major defensive cooldowns against rapid *Lethal Strikes*. Burn boss before raid-wide pulses wipe the group.
  * **Terminal Condition (Kill):** Propagator Core XR-53 reaches $0\%$ HP.


# 14. Single-Boss Lair Encounters

---

### 1. Golden Fury (Toborro's Courtyard)
* **Location:** Makeb | **Tiers:** SM / VM | **Level:** 80
* **Base FQN / Engine ID:** `bkg.npc.ep80_ops.lair.golden_fury` (`16141210948192841001`)

| Boss / Encounter | Phases | Key Entities & Adds | Encounter Mechanics / Target Types |
| :--- | :--- | :--- | :--- |
| **Golden Fury** | **P1 (100%–0%):** Radiation Doors & Isotope Lasers. | • Golden Fury<br>• Laser Pods | • Isotope-5 Laser tanking.<br>• Armor Pierce tank swap.<br>• Radiation Blast Door hiding. |

#### State Flow Map
```
[Phase 1: Isotope Tanking & Laser Pods] (100% - 0%)
       │
       ├──► Radiation Purge Alarm Sounds ──► Entire raid hides behind Blast Doors
       ├──► Isotope-5 Beam Cast ──────────► Tank active defensives / Swap on Armor Pierce
       │
       ▼ (Golden Fury HP = 0%)
   [VICTORY]
```

#### Detailed Phase Breakdown & State Rules
* **Phase 1: Isotope Tanking & Blast Doors (100%–0%)**
  * **Entry Trigger:** Engaging Golden Fury.
  * **Active Entities:** Golden Fury, Laser Pods.
  * **Mechanics & State Rules:** Tanks swap on *Armor Pierce*. When the room alarm sounds for *Radiation Purge*, all players must hide behind blast doors until the purge wave ends.
  * **Terminal Condition (Kill):** Golden Fury reaches $0\%$ HP.

---

### 2. Colossal Monolith
* **Location:** Ziost | **Tiers:** SM / VM | **Level:** 80
* **Base FQN / Engine ID:** `bkg.npc.ep80_ops.lair.colossal_monolith` (`16141210948192841002`)

| Boss / Encounter | Phases | Key Entities & Adds | Encounter Mechanics / Target Types |
| :--- | :--- | :--- | :--- |
| **Colossal Monolith** | **P1 (100%–0%):** Rift Anomalies & Color Matching. | • Colossal Monolith<br>• Rift Anomalies | • Rift Color Matching.<br>• Sweeping Cleave.<br>• Energy Charge absorption. |

#### State Flow Map
```
[Phase 1: Rift Anomalies & Color Matching] (100% - 0%)
       │
       ├──► Rift Anomalies Spawn ──► Players match colored aura rings to rift color
       ├──► Sweeping Cleave ───────► Tank points boss away from group
       │
       ▼ (Colossal Monolith HP = 0%)
   [VICTORY]
```

#### Detailed Phase Breakdown & State Rules
* **Phase 1: Rift Matching (100%–0%)**
  * **Entry Trigger:** Engaging Colossal Monolith.
  * **Active Entities:** Colossal Monolith, Rift Anomalies.
  * **Mechanics & State Rules:** When *Rift Anomalies* appear, players with matching colored aura circles must step into the rift to neutralize it before it destabilizes and wipes the raid. Tank turns boss away (*Cleave*).
  * **Terminal Condition (Kill):** Colossal Monolith reaches $0\%$ HP.

---

### 3. Mutated Geonosian Queen (Hive of the Mountain Queen)
* **Location:** Ossus | **Tiers:** SM / VM / MM | **Level:** 80
* **Base FQN / Engine ID:** `bkg.npc.ep80_ops.lair.geonosian_queen` (`16141210948192841003`)

| Boss / Encounter | Phases | Key Entities & Adds | Encounter Mechanics / Target Types |
| :--- | :--- | :--- | :--- |
| **Mutated Geonosian Queen** | **P1 (100%–0%):** Pheromones, Egg Stomping, & Royal Guards. | • Mutated Geonosian Queen<br>• Royal Guards<br>• Caustic Drones / Larvae | • Pheromone egg stomping.<br>• Royal Guard interrupt & separation.<br>• Acid pool kiting. |

#### State Flow Map
```
[Phase 1: Egg Stomping & Royal Guard Adds] (100% - 0%)
       │
       ├──► Pheromone Target on Player ──► Run over unhatched eggs to stomp them
       ├──► Royal Guards Spawn ──────────► Off-Tank holds facing away / Rotate interrupts
       │
       ▼ (Queen HP = 0%)
   [VICTORY]
```

#### Detailed Phase Breakdown & State Rules
* **Phase 1: Pheromones & Royal Guards (100%–0%)**
  * **Entry Trigger:** Engaging the Queen.
  * **Active Entities:** Mutated Geonosian Queen, Royal Guards, Caustic Drones.
  * **Mechanics & State Rules:** Player targeted with *Pheromones* runs over unhatched egg clusters to crush them before adds hatch. Off-tank holds *Royal Guards* away from the raid and coordinates stun/interrupt rotations on their frontal cleave casts.
  * **Terminal Condition (Kill):** Queen reaches $0\%$ HP.

---

### 4. Xenoanalyst II
* **Location:** Ilum (Gray Secant) | **Tiers:** SM / VM / MM | **Level:** 80
* **Base FQN / Engine ID:** `bkg.npc.ep80_ops.lair.xenoanalyst_ii` (`16141210948192841004`)

| Boss / Encounter | Phases | Key Entities & Adds | Encounter Mechanics / Target Types |
| :--- | :--- | :--- | :--- |
| **Xenoanalyst II** | **P1 (100%–0%):** Discharge Cleanses & Hologram Simulations. | • Xenoanalyst II<br>• Hologram Adds (Terentatek, Akk Dog, Rancor) | • Discharge DoT cleanse.<br>• Red/Blue console defense.<br>• Hologram DPS phase. |

#### State Flow Map
```
[Phase 1: Console Defense & Discharge Cleanses]
       │
       ▼ (Boss Becomes Immune -> Simulation Begins)
[Phase 2: Holographic Species Simulations (Terentatek / Rancor)]
       │
       ▼ (Hologram Adds Cleared -> Shield Drops)
[Return to Phase 1 Combat Loop] ──► [Xenoanalyst HP = 0%] ──► [VICTORY]
```

#### Detailed Phase Breakdown & State Rules
* **Phase 1 & 2: Console Defense & Simulation Loop**
  * **Mechanics & State Rules:** Cleanse *Discharge* DoT. When Xenoanalyst shields and projects holographic simulations (Terentatek, Akk Dog, Rancor), burn down all hologram adds to drop the boss's shield.
  * **Terminal Condition (Kill):** Xenoanalyst reaches $0\%$ HP.

---

### 5. The Eyeless
* **Location:** Rakghoul Tunnels | **Tiers:** SM / VM / MM | **Level:** 80
* **Base FQN / Engine ID:** `bkg.npc.ep80_ops.lair.the_eyeless` (`16141210948192841005`)

| Boss / Encounter | Phases | Key Entities & Adds | Encounter Mechanics / Target Types |
| :--- | :--- | :--- | :--- |
| **The Eyeless** | **P1 (100%–0%):** Green Slime Puddles & Add Waves. | • The Eyeless<br>• Infected Rakghouls | • Green vomit puddle kiting.<br>• Knockback aggro drop swap.<br>• Add cleave. |

#### State Flow Map
```
[Phase 1: Slime Puddle Kiting & Knockback Swaps] (100% - 0%)
       │
       ├──► Boss casts Green Vomit ────► Tank kites boss along outer perimeter
       ├──► Knockback on Main Tank ────► Off-Tank taunts immediately (Aggro drop)
       ├──► Infected Rakghouls Spawn ──► Group on boss & cleave down
       │
       ▼ (The Eyeless HP = 0%)
   [VICTORY]
```

#### Detailed Phase Breakdown & State Rules
* **Phase 1: Slime Kiting (100%–0%)**
  * **Entry Trigger:** Engaging The Eyeless.
  * **Active Entities:** The Eyeless, Infected Rakghouls.
  * **Mechanics & State Rules:** Main tank continuously kites The Eyeless around the room perimeter to prevent green vomit pools from covering the center. Off-tank taunts after the main tank takes a knockback (which resets aggro). DPS cleaves down Rakghoul adds.
  * **Terminal Condition (Kill):** The Eyeless reaches $0\%$ HP.