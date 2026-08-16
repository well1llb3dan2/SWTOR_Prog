> ## ⚠️ VERIFICATION STATUS — NPC IDs AND HEALTH VALUES ARE NOT TRUSTED
>
> Cross-checked against `samples/combat-logs/` on 2026-08-16. **Only 3 of the 17
> numeric Boss Template IDs below appear in real logs, and only one of those is
> attached to the right boss.**
>
> | Claimed ID | This document says | Logs actually say |
> |---|---|---|
> | `2289823159156736` | Soa | **Soa** — correct |
> | `2788331423268864` | Zorn & Toth *and* Colonel Vorgath | **Zorn** — the Vorgath claim is wrong |
> | `2808827007205376` | Jarg & Sorno *(Karagga's Palace)* | **Firebrand Battle Tank** *(Explosive Conflict)* |
>
> Seven IDs are reused across unrelated bosses — `3303551405129728` is claimed
> for Styrak, Brontes *and* the Dread Council; `3025241819316224` for three
> different Terror From Beyond bosses. An NPC template ID is unique per NPC, so
> these cannot all be right. Health values also disagree with measurement: Soa
> is listed at 21,500,000 on 8M Veteran against an observed 15,753,466.
>
> **Verified IDs and health live in `operationFlows.md` section 0** and in
> `packages/game-data/src/observed.ts`, where every row is asserted against the
> logs by the test suite.
>
> What *was* adopted from this document:
> * The corrected boss name **The Writhing Horror** (previously "Withering").
> * Master Mode availability per operation, and R-4 Anomaly being 8-player only
>   — now encoded as `difficulties` and `groupSizes` in `packages/game-data`.
>
> Encounter matching keys on **zone id + boss name**, never on NPC id or health,
> so the operations below are already wired up without needing these IDs.

---

### COMPREHENSIVE 8-MAN & 16-MAN HEALTH & TACTICAL DIRECTORY (v7.x / LEVEL 80 SCALED)

* **Scaling Formula (7.x Baseline)**: 16-Player (16M) operations scale boss health pools to **`1.95x` (Story Mode)** and **`2.00x – 2.05x` (Veteran & Master Mode)** of their 8-Player (8M) baselines.
* **Master Mode Status**: Operations marked *Decommissioned / Not Implemented* have no active Master Mode in the live 7.x client.
* **R-4 Anomaly**: Designed as an **8-Player exclusive** instance; 16M difficulty is disabled in the game engine.

---

# 1. THE ETERNITY VAULT (EV)

---

### Annihilation Droid XRR-3 — The Eternity Vault

**Encounter Overview**
* **ID:** `ev_annihilation_droid_xrr3`
* **Boss Name:** Annihilation Droid XRR-3
* **Operation & Location:** The Eternity Vault (Belsavis)
* **Lair Boss:** No
* **Boss Template ID:** `1779997656219648` (`npc.location.flashpoint.raid.eternity_vault.enemy.difficulty_1.boss_silentior`)

**Health Pools & Difficulty**
| Difficulty | 8-Player (8M) HP | 16-Player (16M) HP | Exclusive Mechanics / Tactical Modifiers |
|---|---|---|---|
| Story Mode (SM) | **5,420,000** | **10,600,000** | Standard missile barrage |
| Veteran Mode (VM) | **13,850,000** | **27,700,000** | Storm Protocol Enrage `[2045143167270912]` |
| Master Mode (MM) | *N/A (Decommissioned)* | *N/A (Decommissioned)* | N/A |

**Associated Adds**
* **Defense Turret:** Combat Log ID `2290059382358016` | Global ID `16140950939887872856`

**Encounter Phases**
1. **Phase 1: Artillery Engagement** (`Single-Target Ground`) — Trigger: Encounter pull.
2. **Phase 2: Missile Salvo Protocol** (`Channeled AOE Ground Burn`) — Trigger: Health thresholds (75%, 50%, 25%).

**Wipe Signatures & Fail Mechanics**
* ⚠️ **Storm Protocol / Enrage** (Ability ID: `2045143167270912`): Lethal raid-wide missile barrage upon 6-minute enrage.

**End Conditions**
* **Victory Event:** Boss Defeat | **Target Death ID:** `1779997656219648` (SM) / `2508471354261504` (VM)

---

### Gharj — The Eternity Vault

**Encounter Overview**
* **ID:** `ev_gharj`
* **Boss Name:** Gharj
* **Operation & Location:** The Eternity Vault (Belsavis)
* **Lair Boss:** No
* **Boss Template ID:** `3725089560330240` (`npc.location.flashpoint.raid.eternity_vault.enemy.difficulty_1.boss_gharj`)

**Health Pools & Difficulty**
| Difficulty | 8-Player (8M) HP | 16-Player (16M) HP | Exclusive Mechanics / Tactical Modifiers |
|---|---|---|---|
| Story Mode (SM) | **5,900,000** | **11,500,000** | Standard platform transition |
| Veteran Mode (VM) | **15,100,000** | **30,200,000** | Molten Armor Strike `[2289642770530304]` |
| Master Mode (MM) | *N/A (Decommissioned)* | *N/A (Decommissioned)* | N/A |

**Associated Adds**
* **Cave Prowler:** Combat Log ID `2017178635206656` | Global ID `16141009352242800503`

**Encounter Phases**
1. **Phase 1: Island Platform Engagement** (`Static Tank & Spank`) — Trigger: Active island.
2. **Phase 2: Seismic Smash & Sinking Rock** (`Arena Relocation`) — Trigger: Lava rises, platform sinks.

**Wipe Signatures & Fail Mechanics**
* ⚠️ **Molten Submersion** (Ability ID: `2512280990253056`): Failure to traverse rock bridges causes rapid environmental death.

**End Conditions**
* **Victory Event:** Boss Defeat | **Target Death ID:** `3725089560330240` (SM) / `2017165750304768` (VM)

---

### The Infernal Council — The Eternity Vault

**Encounter Overview**
* **ID:** `ev_infernal_council`
* **Boss Name:** The Infernal Council
* **Operation & Location:** The Eternity Vault (Belsavis)
* **Lair Boss:** No
* **Boss Template ID:** `2290132396802048` (`npc.location.flashpoint.raid.eternity_vault.enemy.difficulty_1.temple_boss_sith_juggernaut`)

**Health Pools & Difficulty**
| Difficulty | 8-Player (8M) HP | 16-Player (16M) HP | Exclusive Mechanics / Tactical Modifiers |
|---|---|---|---|
| Story Mode (SM) | **1,250,000** *(each / 8 Lords)* | **1,250,000** *(each / 16 Lords)* | 1v1 duel assignments |
| Veteran Mode (VM) | **3,100,000** *(each / 8 Lords)* | **3,100,000** *(each / 16 Lords)* | Penalty of Destiny `[2512280990253056]` |
| Master Mode (MM) | *N/A (Decommissioned)* | *N/A (Decommissioned)* | N/A |

**Associated Adds**
* **Council Marauder / Juggernaut:** Combat Log ID `2512280990253056` / `2290132396802048`

**Encounter Phases**
1. **Phase 1: 1v1 Isolated Duels** (`Simultaneous Combat`) — Trigger: Pulling any member locks targets.

**Wipe Signatures & Fail Mechanics**
* ⚠️ **Penalty of Destiny** (Ability ID: `2512280990253056`): Cross-healing or attacking an ally's duel target causes immediate lethal raid damage.

**End Conditions**
* **Victory Event:** All Council Members Eliminated | **Target Death ID:** `2290132396802048`

---

### Soa, The Infernal One — The Eternity Vault

**Encounter Overview**
* **ID:** `ev_soa`
* **Boss Name:** Soa
* **Operation & Location:** The Eternity Vault (Belsavis)
* **Lair Boss:** No
* **Boss Template ID:** `2289823159156736` (`npc.location.flashpoint.raid.eternity_vault.enemy.difficulty_1.boss_soa`)

**Health Pools & Difficulty**
| Difficulty | 8-Player (8M) HP | 16-Player (16M) HP | Exclusive Mechanics / Tactical Modifiers |
|---|---|---|---|
| Story Mode (SM) | **8,250,000** | **16,100,000** | Standard platform descent |
| Veteran Mode (VM) | **21,500,000** | **43,000,000** | Mind Trap Multi-Chain `[2290059382358016]` |
| Master Mode (MM) | *N/A (Decommissioned)* | *N/A (Decommissioned)* | N/A |

**Associated Adds**
* **Mind Trap:** Combat Log ID `2290059382358016` | Global ID `16140950939887872856`
* **Ball Lightning:** Combat Log ID `2512280990253056` | Global ID `16141147437449122860`

**Encounter Phases**
1. **Phase 1: Platform 1** (`Shielded Burn`) — Trigger: 100% to 75% HP.
2. **Phase 2: Platform 2 & Descent** (`Descent & Mind Traps`) — Trigger: 75% to 30% HP.
3. **Phase 3: Final Floor & Pyramid Break** (`Shield Vulnerability`) — Trigger: Sub-30% HP.

**Wipe Signatures & Fail Mechanics**
* ⚠️ **Pyramid Drop Failure** (Ability ID: `2045143167270912`): Failure to smash Soa with falling pyramids keeps him immune to all damage.

**End Conditions**
* **Victory Event:** Boss Defeat | **Target Death ID:** `2289823159156736` (SM) / `3617792687341568` (VM)

---

# 2. KARAGGA'S PALACE (KP)

---

### Bonethrasher — Karagga's Palace

**Encounter Overview**
* **ID:** `kp_bonethrasher`
* **Boss Name:** Bonethrasher
* **Operation & Location:** Karagga's Palace (Hutta)
* **Lair Boss:** No
* **Boss Template ID:** `2442487771693056` (`npc.location.flashpoint.raid.hutt_palace.enemy.difficulty_1.boss_rancor`)

**Health Pools & Difficulty**
| Difficulty | 8-Player (8M) HP | 16-Player (16M) HP | Exclusive Mechanics / Tactical Modifiers |
|---|---|---|---|
| Story Mode (SM) | **6,100,000** | **11,900,000** | Random aggro target switches |
| Veteran Mode (VM) | **15,800,000** | **31,600,000** | Heavy Crushing Sweep `[2861384522006528]` |
| Master Mode (MM) | *N/A (Decommissioned)* | *N/A (Decommissioned)* | N/A |

**Associated Adds**
* **Gamorrean Guard:** Combat Log ID `515516334604288` | Global ID `16141079851507424311`

**Encounter Phases**
1. **Phase 1: Untauntable Rampage** (`Random Aggro Cleave`) — Trigger: Encounter pull.

**Wipe Signatures & Fail Mechanics**
* ⚠️ **Berserk Swat** (Ability ID: `2861384522006528`): Lethal swipe on random targets upon 5-minute hard enrage.

**End Conditions**
* **Victory Event:** Boss Defeat | **Target Death ID:** `2442487771693056` (SM) / `2861148298805248` (VM)

---

### Jarg & Sorno — Karagga's Palace

**Encounter Overview**
* **ID:** `kp_jarg_sorno`
* **Boss Name:** Jarg & Sorno
* **Operation & Location:** Karagga's Palace (Hutta)
* **Lair Boss:** No
* **Boss Template ID:** `2808827007205376` (`npc.location.flashpoint.raid.karaggas_palace.enemy.difficulty_1.boss_jarg`) / `boss_sorno`

**Health Pools & Difficulty**
| Difficulty | 8-Player (8M) HP | 16-Player (16M) HP | Exclusive Mechanics / Tactical Modifiers |
|---|---|---|---|
| Story Mode (SM) | **4,200,000** *(each)* | **8,200,000** *(each)* | Twin boss split |
| Veteran Mode (VM) | **10,900,000** *(each)* | **21,800,000** *(each)* | Uninterruptible Carbonizer `[2877701102764032]` |
| Master Mode (MM) | *N/A (Decommissioned)* | *N/A (Decommissioned)* | N/A |

**Associated Adds**
* **Scann-Drone:** Combat Log ID `840933121720320` | Global ID `16141072605861612097`

**Encounter Phases**
1. **Phase 1: Dual Combat** (`Twin Split`) — Trigger: Encounter pull.
2. **Phase 2: Rafter Bombardment** (`Channeled Ground Hazard`) — Trigger: Sorno jumps to upper rafters.

**Wipe Signatures & Fail Mechanics**
* ⚠️ **Bounty Retaliation Enrage** (Ability ID: `2877701102764032`): Leaving one boss alive for prolonged time after the other dies causes massive damage frenzy.

**End Conditions**
* **Victory Event:** Both Defeated | **Target Death ID:** `2808827007205376` (SM) / `2876459857215488` (VM)

---

### Foreman Crusher — Karagga's Palace

**Encounter Overview**
* **ID:** `kp_foreman_crusher`
* **Boss Name:** Foreman Crusher
* **Operation & Location:** Karagga's Palace (Hutta)
* **Lair Boss:** No
* **Boss Template ID:** `3725136804970496` (`npc.location.flashpoint.raid.karaggas_palace.enemy.difficulty_1.boss_foreman`)

**Health Pools & Difficulty**
| Difficulty | 8-Player (8M) HP | 16-Player (16M) HP | Exclusive Mechanics / Tactical Modifiers |
|---|---|---|---|
| Story Mode (SM) | **6,500,000** | **12,700,000** | Standard add waves |
| Veteran Mode (VM) | **16,800,000** | **33,600,000** | Crushing Frenzy Stomp `[2861384522006528]` |
| Master Mode (MM) | *N/A (Decommissioned)* | *N/A (Decommissioned)* | N/A |

**Associated Adds**
* **Gamorrean Enforcer:** Combat Log ID `515516334604288` | Global ID `16141079851507424311`

**Encounter Phases**
1. **Phase 1: Foreman Cleave** (`Standard Cleave`) — Trigger: Encounter pull.
2. **Phase 2: Gate Reinforcements** (`Add Waves & Shields`) — Trigger: Periodic intervals.

**Wipe Signatures & Fail Mechanics**
* ⚠️ **Frenzied Ground Slam** (Ability ID: `2861384522006528`): Lethal room vibrations if add packs accumulate.

**End Conditions**
* **Victory Event:** Boss Defeat | **Target Death ID:** `3725136804970496` (SM) / `3725119625101312` (VM)

---

### G4-B3 Heavy Fabricator — Karagga's Palace

**Encounter Overview**
* **ID:** `kp_g4_b3_fabricator`
* **Boss Name:** G4-B3 Heavy Fabricator
* **Operation & Location:** Karagga's Palace (Hutta)
* **Lair Boss:** No
* **Boss Template ID:** `3725149689872384` (`npc.location.flashpoint.raid.karaggas_palace.enemy.difficulty_1.boss_fabricator`)

**Health Pools & Difficulty**
| Difficulty | 8-Player (8M) HP | 16-Player (16M) HP | Exclusive Mechanics / Tactical Modifiers |
|---|---|---|---|
| Story Mode (SM) | **7,800,000** | **15,200,000** | Stacking armor buff |
| Veteran Mode (VM) | **20,400,000** | **40,800,000** | Sticky Grenade Overload `[2877701102764032]` |
| Master Mode (MM) | *N/A (Decommissioned)* | *N/A (Decommissioned)* | N/A |

**Associated Adds**
* **Heavy Security Droid:** Combat Log ID `840452085383168` | Global ID `16141115123842427538`

**Encounter Phases**
1. **Phase 1: Molten Dump Cycle** (`Armor Removal Puzzle`) — Trigger: Boss stacks 10x armor; position under lava dump.

**Wipe Signatures & Fail Mechanics**
* ⚠️ **10-Stack Armor Enrage** (Ability ID: `2877701102764032`): 99% incoming damage reduction leads to hard enrage wipe.

**End Conditions**
* **Victory Event:** Boss Defeat | **Target Death ID:** `3725149689872384` (SM) / `3725119625101312` (VM)

---

### Karagga the Unyielding — Karagga's Palace

**Encounter Overview**
* **ID:** `kp_karagga`
* **Boss Name:** Karagga the Unyielding
* **Operation & Location:** Karagga's Palace (Hutta)
* **Lair Boss:** No
* **Boss Template ID:** `3725119625101312` (`npc.location.flashpoint.raid.karaggas_palace.enemy.difficulty_1.boss_karagga`)

**Health Pools & Difficulty**
| Difficulty | 8-Player (8M) HP | 16-Player (16M) HP | Exclusive Mechanics / Tactical Modifiers |
|---|---|---|---|
| Story Mode (SM) | **8,900,000** | **17,400,000** | Mobile kiting perimeter |
| Veteran Mode (VM) | **23,200,000** | **46,400,000** | Drill Barrage Instakill `[2877701102764032]` |
| Master Mode (MM) | *N/A (Decommissioned)* | *N/A (Decommissioned)* | N/A |

**Associated Adds**
* **Cybernetic Drills:** Combat Log ID `840933121720320` | Global ID `16141072605861612097`

**Encounter Phases**
1. **Phase 1: Walker Perimeter Kite** (`Flame Trail Drops`) — Trigger: Kite boss around room edges.

**Wipe Signatures & Fail Mechanics**
* ⚠️ **Flamethrower Saturation** (Ability ID: `2861384522006528`): Oil fires across center floor tiles leave no safe ground.

**End Conditions**
* **Victory Event:** Boss Defeat | **Target Death ID:** `3725119625101312` (SM) / `3725149689872384` (VM)

---

# 3. EXPLOSIVE CONFLICT (EC)

---

### Zorn & Toth — Explosive Conflict

**Encounter Overview**
* **ID:** `ec_zorn_and_toth`
* **Boss Name:** Zorn & Toth
* **Operation & Location:** Explosive Conflict (Denova)
* **Lair Boss:** No
* **Boss Template ID:** `2788331423268864` (`npc.qtr.1x2.raid.denova.enemy.difficulty_1.boss.trolls.boss_troll_1`) / `boss_troll_2`

**Health Pools & Difficulty**
| Difficulty | 8-Player (8M) HP | 16-Player (16M) HP | Exclusive Mechanics / Tactical Modifiers |
|---|---|---|---|
| Story Mode (SM) | **4,800,000** *(each)* | **9,400,000** *(each)* | Distance split >30m |
| Veteran Mode (VM) | **13,200,000** *(each)* | **26,400,000** *(each)* | Stacking Fearful debuffs |
| Master Mode (MM) | **28,500,000** *(each)* | **57,000,000** *(each)* | Retaliation Spikes `[2877701102764032]` |

**Associated Adds**
* **Baradium Spire:** Combat Log ID `2808827007205376` | Global ID `16141154094202220775`

**Encounter Phases**
1. **Phase 1: Proximity Management** (`Twin Separation`) — Trigger: Encounter pull.
2. **Phase 2: Berserk Jump Switch** (`Tank Swap`) — Trigger: Toth leaps across room to Zorn.

**Wipe Signatures & Fail Mechanics**
* ⚠️ **Symbiotic Rage** (Ability ID: `2861384522006528`): Moving within 30m of each other gives both a 500% damage boost.

**End Conditions**
* **Victory Event:** Both Defeated | **Target Death ID:** `2788331423268864` (SM) / `2861148298805248` (VM) / `2861384522006528` (MM)

---

### Firebrand & Stormcaller — Explosive Conflict

**Encounter Overview**
* **ID:** `ec_firebrand_stormcaller`
* **Boss Name:** Firebrand & Stormcaller
* **Operation & Location:** Explosive Conflict (Denova)
* **Lair Boss:** No
* **Boss Template ID:** `2808827007205376` (`npc.qtr.1x2.raid.denova.enemy.difficulty_1.boss.tanks.tank_1`) / `tank_2`

**Health Pools & Difficulty**
| Difficulty | 8-Player (8M) HP | 16-Player (16M) HP | Exclusive Mechanics / Tactical Modifiers |
|---|---|---|---|
| Story Mode (SM) | **5,600,000** *(each)* | **10,900,000** *(each)* | Split platform defense |
| Veteran Mode (VM) | **15,400,000** *(each)* | **30,800,000** *(each)* | Yellow ground targeting circles |
| Master Mode (MM) | **33,200,000** *(each)* | **66,400,000** *(each)* | Double Incinerate `[2861384522006528]` |

**Associated Adds**
* **Shield Drone:** Combat Log ID `2861148298805248` | Global ID `16140923986115715890`

**Encounter Phases**
1. **Phase 1: Tank Platform Fire** (`Split Raid`) — Trigger: Encounter pull.
2. **Phase 2: Defensive Shield Domes** (`Orbital Shield Phase`) — Trigger: 80%, 60%, 40%, 20% HP.

**Wipe Signatures & Fail Mechanics**
* ⚠️ **Orbital Bombardment** (Ability ID: `2877701102764032`): Standing outside active protective domes during shield phase causes instant death.

**End Conditions**
* **Victory Event:** Both Destroyed | **Target Death ID:** `2808827007205376` (SM) / `2876459857215488` (VM) / `2877701102764032` (MM)

---

### Colonel Vorgath — Explosive Conflict

**Encounter Overview**
* **ID:** `ec_colonel_vorgath`
* **Boss Name:** Colonel Vorgath
* **Operation & Location:** Explosive Conflict (Denova)
* **Lair Boss:** No
* **Boss Template ID:** `2788331423268864` (`npc.location.flashpoint.raid.denova.enemy.difficulty_1.boss_vorgath`)

**Health Pools & Difficulty**
| Difficulty | 8-Player (8M) HP | 16-Player (16M) HP | Exclusive Mechanics / Tactical Modifiers |
|---|---|---|---|
| Story Mode (SM) | **4,500,000** | **8,800,000** | 4 defusal kits available |
| Veteran Mode (VM) | **12,600,000** | **25,200,000** | 1 defusal kit available |
| Master Mode (MM) | **27,200,000** | **54,400,000** | Minefield Overload `[2877701102764032]` |

**Associated Adds**
* **Demolitions Probe Droid:** Combat Log ID `2808827007205376` | Global ID `16141154094202220775`

**Encounter Phases**
1. **Phase 1: Minefield Puzzle Grid** (`Puzzle Pathing`) — Trigger: Encounter pull.
2. **Phase 2: Vorgath Combat** (`Boss Direct Burn`) — Trigger: Reaching far command deck.

**Wipe Signatures & Fail Mechanics**
* ⚠️ **Baradium Minefield Detonation** (Ability ID: `2861384522006528`): Stepping on an unassigned tile detonates the entire grid.

**End Conditions**
* **Victory Event:** Vorgath Defeated | **Target Death ID:** `2788331423268864` (SM) / `2861148298805248` (VM) / `2861384522006528` (MM)

---

### Warlord Kephess — Explosive Conflict

**Encounter Overview**
* **ID:** `ec_warlord_kephess`
* **Boss Name:** Warlord Kephess
* **Operation & Location:** Explosive Conflict (Denova)
* **Lair Boss:** No
* **Boss Template ID:** `2876459857215488` (`npc.location.flashpoint.raid.denova.enemy.difficulty_1.boss_kephess_denova`)

**Health Pools & Difficulty**
| Difficulty | 8-Player (8M) HP | 16-Player (16M) HP | Exclusive Mechanics / Tactical Modifiers |
|---|---|---|---|
| Story Mode (SM) | **6,800,000** | **13,300,000** | Standard bomb cycles |
| Veteran Mode (VM) | **18,900,000** | **37,800,000** | Accelerated pulse droid spawns |
| Master Mode (MM) | **40,500,000** | **81,000,000** | Breath of the Masters `[2877701102764032]` |

**Associated Adds**
* **Baradium Bomber:** Combat Log ID `2808827007205376` | Global ID `16141154094202220775`
* **Warstrider D-16 Walker:** Combat Log ID `2877701102764032` | Global ID `16141062101524436793`

**Encounter Phases**
1. **Phase 1: Bomber & Shield Defense** (`Shield Bombing`) — Trigger: Encounter pull.
2. **Phase 2: Warstrider Walker Burn** (`Walker Down`) — Trigger: 3 bomb drops on walker.
3. **Phase 3: Kephess Ground Assault** (`Boss Direct`) — Trigger: Walker destroyed.
4. **Phase 4: Gift of the Masters Enrage** (`Burn Phase`) — Trigger: Sub-20% HP.

**Wipe Signatures & Fail Mechanics**
* ⚠️ **Baradium Bomb Detonation** (Ability ID: `2861384522006528`): Bomber exploding among players wipes the raid.

**End Conditions**
* **Victory Event:** Boss Defeat | **Target Death ID:** `2876459857215488` (SM) / `2861148298805248` (VM) / `2861384522006528` (MM)

---

# 4. TERROR FROM BEYOND (TFB)

---

### The Writhing Horror — Terror From Beyond

**Encounter Overview**
* **ID:** `tfb_writhing_horror`
* **Boss Name:** The Writhing Horror
* **Operation & Location:** Terror From Beyond (Asation)
* **Lair Boss:** No
* **Boss Template ID:** `3025241819316224` (`npc.qtr.1x4.raid.asation.enemy.difficulty_1.boss.withering_horror`)

**Health Pools & Difficulty**
| Difficulty | 8-Player (8M) HP | 16-Player (16M) HP | Exclusive Mechanics / Tactical Modifiers |
|---|---|---|---|
| Story Mode (SM) | **5,200,000** | **10,100,000** | Green flower spore cleansing |
| Veteran Mode (VM) | **14,400,000** | **28,800,000** | Red spit dot spread acceleration |
| Master Mode (MM) | **31,000,000** | **62,000,000** | Accelerated Red Spores `[3511904563625984]` |

**Associated Adds**
* **Corrosive Slime:** Combat Log ID `3511904563625984` | Global ID `16141003399051601041`

**Encounter Phases**
1. **Phase 1: Spore Clearing** (`Flower Buff Management`) — Trigger: Encounter pull.
2. **Phase 2: Burrowing Intermission** (`Slime Adds`) — Trigger: Health thresholds.
3. **Phase 3: Soft Enrage Burn** (`DPS Race`) — Trigger: Sub-15% HP.

**Wipe Signatures & Fail Mechanics**
* ⚠️ **Corrosive Slime Dot Overload** (Ability ID: `3511904563625984`): Failure to cleanse red spit with green spores leads to exponential ticking damage.

**End Conditions**
* **Victory Event:** Boss Defeat | **Target Death ID:** `3025241819316224` (SM) / `3303551405129728` (VM) / `3458114393210880` (MM)

---

### The Dread Guard — Terror From Beyond

**Encounter Overview**
* **ID:** `tfb_dread_guard_trio`
* **Boss Name:** The Dread Guard (Heirad, Ciphas, Kel'sara)
* **Operation & Location:** Terror From Beyond (Asation)
* **Lair Boss:** No
* **Boss Template ID:** `3025241819316224` (`npc.qtr.1x4.raid.asation.enemy.difficulty_1.boss.dread_guard`)

**Health Pools & Difficulty**
| Difficulty | 8-Player (8M) HP | 16-Player (16M) HP | Exclusive Mechanics / Tactical Modifiers |
|---|---|---|---|
| Story Mode (SM) | **2,700,000** *(each)* | **5,300,000** *(each)* | Standard sequential focus |
| Veteran Mode (VM) | **7,500,000** *(each)* | **15,000,000** *(each)* | Tight Lightning Field interrupt checks |
| Master Mode (MM) | **16,200,000** *(each)* | **32,400,000** *(each)* | Mark of Death `[3511904563625984]` |

**Associated Adds**
* **Dread Tendril:** Combat Log ID `3511904563625984` | Global ID `16141003399051601041`

**Encounter Phases**
1. **Phase 1: Heirad Focus** (`Lightning Interrupts`) — Trigger: Encounter pull.
2. **Phase 2: Ciphas Shield** (`Strangler Management`) — Trigger: Heirad dead.
3. **Phase 3: Kel'sara Kiting** (`Mark of Death`) — Trigger: Ciphas dead.

**Wipe Signatures & Fail Mechanics**
* ⚠️ **Surging Chain Lightning** (Ability ID: `3458114393210880`): Missed interrupt on Heirad wipes the team in a single hit.

**End Conditions**
* **Victory Event:** All 3 Defeated | **Target Death ID:** `3025241819316224` (SM) / `3303551405129728` (VM) / `3458114393210880` (MM)

---

### Operator IX — Terror From Beyond

**Encounter Overview**
* **ID:** `tfb_operator_ix`
* **Boss Name:** Operator IX
* **Operation & Location:** Terror From Beyond (Asation)
* **Lair Boss:** No
* **Boss Template ID:** `3725136804970496` (`npc.location.flashpoint.raid.asation.enemy.difficulty_1.boss_operator_ix`)

**Health Pools & Difficulty**
| Difficulty | 8-Player (8M) HP | 16-Player (16M) HP | Exclusive Mechanics / Tactical Modifiers |
|---|---|---|---|
| Story Mode (SM) | **5,500,000** | **10,700,000** | Color rings drop core shields |
| Veteran Mode (VM) | **15,200,000** | **30,400,000** | Faster color panel cycling |
| Master Mode (MM) | **32,800,000** | **65,600,000** | Color Memory Reset `[3511904563625984]` |

**Associated Adds**
* **Regulator:** Combat Log ID `3381934558281728` | Global ID `16140997453538032015`

**Encounter Phases**
1. **Phase 1: Color Shield Puzzle** (`Terminal Deletion`) — Trigger: Step on 4 colored rings.
2. **Phase 2: Boss Extraction** (`Direct Burn`) — Trigger: Core shields deactivated.

**Wipe Signatures & Fail Mechanics**
* ⚠️ **Black Shield Protocol** (Ability ID: `3511904563625984`): Stepping on mismatched colors triggers full room deletion.

**End Conditions**
* **Victory Event:** Boss Defeat | **Target Death ID:** `3725136804970496` (SM) / `3725119625101312` (VM) / `3458114393210880` (MM)

---

### The Terror From Beyond — Terror From Beyond

**Encounter Overview**
* **ID:** `tfb_the_terror_from_beyond`
* **Boss Name:** The Terror From Beyond
* **Operation & Location:** Terror From Beyond (Asation)
* **Lair Boss:** No
* **Boss Template ID:** `3025241819316224` (`npc.qtr.1x4.raid.asation.enemy.difficulty_4.boss.hypergate_terror.hypergate_terror_inside`)

**Health Pools & Difficulty**
| Difficulty | 8-Player (8M) HP | 16-Player (16M) HP | Exclusive Mechanics / Tactical Modifiers |
|---|---|---|---|
| Story Mode (SM) | **8,400,000** | **16,400,000** | Island platform transfers |
| Veteran Mode (VM) | **23,200,000** | **46,400,000** | Acid spit floor coverage |
| Master Mode (MM) | **50,400,000** | **100,800,000** | Hypergate Collapse `[3511904563625984]` |

**Associated Adds**
* **Grasping Tentacle:** Combat Log ID `3511904563625984` | Global ID `16141003399051601041`

**Encounter Phases**
1. **Phase 1: Tentacle Clear** (`Platform Defense`) — Trigger: Encounter pull.
2. **Phase 2: Hypergate Realm** (`Hexagon Platforms`) — Trigger: 50% HP.
3. **Phase 3: Platform Destruction** (`Enrage DPS Race`) — Trigger: Sub-15% HP.

**Wipe Signatures & Fail Mechanics**
* ⚠️ **Platform Smash Void Drop** (Ability ID: `3458114393210880`): Failing to kill tentacles before all hexagon platforms are smashed drops the team into the void.

**End Conditions**
* **Victory Event:** Terror Retreats / Defeated | **Target Death ID:** `3025241819316224` (SM) / `3303551405129728` (VM) / `3458114393210880` (MM)

---

# 5. SCUM AND VILLAINY (S&V)

---

### Titan 6 — Scum and Villainy

**Encounter Overview**
* **ID:** `snv_titan_6`
* **Boss Name:** Titan 6
* **Operation & Location:** Scum and Villainy (Darvannis)
* **Lair Boss:** No
* **Boss Template ID:** `3725119625101312` (`npc.stronghold.personnel.operation.titan_6`)

**Health Pools & Difficulty**
| Difficulty | 8-Player (8M) HP | 16-Player (16M) HP | Exclusive Mechanics / Tactical Modifiers |
|---|---|---|---|
| Story Mode (SM) | **5,900,000** | **11,500,000** | Hide behind dropped rocks |
| Veteran Mode (VM) | **16,300,000** | **32,600,000** | Faster missile barrage casts |
| Master Mode (MM) | **35,000,000** | **70,000,000** | Rock Shelter Destruction `[3511904563625984]` |

**Associated Adds**
* **Air-Strike Drone:** Combat Log ID `3381934558281728` | Global ID `16140997453538032015`

**Encounter Phases**
1. **Phase 1: Ground Missiles** (`Rock LoS`) — Trigger: Encounter pull.
2. **Phase 2: Orbital Launch** (`Cataclysm Airstrike`) — Trigger: Titan launches into sky.
3. **Phase 3: Soft Enrage** (`Ground Stomp Burn`) — Trigger: Sub-20% HP.

**Wipe Signatures & Fail Mechanics**
* ⚠️ **Launch Protocol Airstrike** (Ability ID: `3458114393210880`): Failing to stand directly behind rocks during orbital launch results in complete vaporization.

**End Conditions**
* **Victory Event:** Boss Defeat | **Target Death ID:** `3725119625101312` (SM) / `3725149689872384` (VM) / `3458114393210880` (MM)

---

### Dread Master Styrak — Scum and Villainy

**Encounter Overview**
* **ID:** `snv_dread_master_styrak`
* **Boss Name:** Dread Master Styrak
* **Operation & Location:** Scum and Villainy (Darvannis)
* **Lair Boss:** No
* **Boss Template ID:** `3303551405129728` (`npc.location.flashpoint.raid.darvannis.enemy.difficulty_1.boss_styrak`)

**Health Pools & Difficulty**
| Difficulty | 8-Player (8M) HP | 16-Player (16M) HP | Exclusive Mechanics / Tactical Modifiers |
|---|---|---|---|
| Story Mode (SM) | **8,100,000** | **15,800,000** | Kell Dragon killed in P1 |
| Veteran Mode (VM) | **22,500,000** | **45,000,000** | Nightmare phantasm burst checks |
| Master Mode (MM) | **48,600,000** | **97,200,000** | Kell Dragon Resurrection `[3725119625101312]` |

**Associated Adds**
* **Kell Dragon:** Combat Log ID `3381934558281728` | Global ID `16140997453538032015`

**Encounter Phases**
1. **Phase 1: Kell Dragon Engagement** (`Pet Boss Phase`) — Trigger: Encounter pull.
2. **Phase 2: Chained Manifestation** (`Inner Ring Burn`) — Trigger: Kell Dragon dies.
3. **Phase 3: Giant Styrak Burn** (`Final DPS Race`) — Trigger: Sub-15% HP.

**Wipe Signatures & Fail Mechanics**
* ⚠️ **Chained Torment Burst** (Ability ID: `3725119625101312`): Phantasms reaching the center ring detonate the entire room.

**End Conditions**
* **Victory Event:** Boss Defeat | **Target Death ID:** `3303551405129728` (SM) / `3458114393210880` (VM) / `3511904563625984` (MM)

---

# 6. DREAD FORTRESS (DF)

---

### Nefra, Who Bars the Way — Dread Fortress

**Encounter Overview**
* **ID:** `df_nefra`
* **Boss Name:** Nefra, Who Bars the Way
* **Operation & Location:** Dread Fortress (Oricon)
* **Lair Boss:** No
* **Boss Template ID:** `3725136804970496` (`npc.stronghold.personnel.operation.nefra`)

**Health Pools & Difficulty**
| Difficulty | 8-Player (8M) HP | 16-Player (16M) HP | Exclusive Mechanics / Tactical Modifiers |
|---|---|---|---|
| Story Mode (SM) | **5,800,000** | **11,300,000** | Regular raid-wide dispels |
| Veteran Mode (VM) | **16,100,000** | **32,200,000** | Doubled bleed tick frequency |
| Master Mode (MM) | **34,800,000** | **69,600,000** | Cleansing Shock `[3511904563625984]` |

**Associated Adds**
* **None (Single Target Encounter)**

**Encounter Phases**
1. **Phase 1: Tank Cleave & Bleed Dispels** (`Frontal Cleave & Cleansing`) — Trigger: Encounter pull.

**Wipe Signatures & Fail Mechanics**
* ⚠️ **Voice of the Masters Bleed** (Ability ID: `3511904563625984`): Failure to instantly cleanse the raid-wide bleed leads to exponential wipe damage.

**End Conditions**
* **Victory Event:** Boss Defeat | **Target Death ID:** `3725136804970496` (SM) / `3303551405129728` (VM) / `3458114393210880` (MM)

---

### Dread Master Brontes — Dread Fortress

**Encounter Overview**
* **ID:** `df_dread_master_brontes`
* **Boss Name:** Dread Master Brontes
* **Operation & Location:** Dread Fortress (Oricon)
* **Lair Boss:** No
* **Boss Template ID:** `3303551405129728` (`npc.operation.oricon.fortress.enemy.difficulty_1.boss.dread_master_brontes.dread_master_brontes`)

**Health Pools & Difficulty**
| Difficulty | 8-Player (8M) HP | 16-Player (16M) HP | Exclusive Mechanics / Tactical Modifiers |
|---|---|---|---|
| Story Mode (SM) | **8,500,000** | **16,600,000** | Clock matrix rotation |
| Veteran Mode (VM) | **23,600,000** | **47,200,000** | Kephess clone add spawns |
| Master Mode (MM) | **51,000,000** | **102,000,000** | Six Finger Slam `[3725119625101312]` |

**Associated Adds**
* **Brontes Finger:** Combat Log ID `3381934558281728` | Global ID `16140997453538032015`
* **Corrupted Clone:** Combat Log ID `3511904563625984` | Global ID `16141003399051601041`

**Encounter Phases**
1. **Phase 1: Hands & Orbs** (`Orb Interception`) — Trigger: Encounter pull.
2. **Phase 2: Clock Matrix** (`Laser Rotation`) — Trigger: 50% HP.
3. **Phase 3: Six Fingers** (`Simultaneous Burst`) — Trigger: Shield break.
4. **Phase 4: Two Giant Hands** (`Slam Burn`) — Trigger: Sub-15% HP.

**Wipe Signatures & Fail Mechanics**
* ⚠️ **Clock Beam Intersection** (Ability ID: `3725119625101312`): Touching the rotating laser beam deals immediate fatal energy damage.

**End Conditions**
* **Victory Event:** Boss Defeat | **Target Death ID:** `3303551405129728` (SM) / `3458114393210880` (VM) / `3511904563625984` (MM)

---

# 7. DREAD PALACE (DP)

---

### The Dread Council — Dread Palace

**Encounter Overview**
* **ID:** `dp_dread_council`
* **Boss Name:** The Dread Council (Bestia, Tyrans, Calphayus, Raptus)
* **Operation & Location:** Dread Palace (Oricon)
* **Lair Boss:** No
* **Boss Template ID:** `3303551405129728` (`npc.operation.oricon.palace.enemy.difficulty_1.boss.dread_master_council`)

**Health Pools & Difficulty**
| Difficulty | 8-Player (8M) HP | 16-Player (16M) HP | Exclusive Mechanics / Tactical Modifiers |
|---|---|---|---|
| Story Mode (SM) | **3,100,000** *(each / 4 Masters)* | **6,050,000** *(each / 4 Masters)* | Standard pairs into convergence |
| Veteran Mode (VM) | **8,600,000** *(each / 4 Masters)* | **17,200,000** *(each / 4 Masters)* | Even 15% push requirement |
| Master Mode (MM) | **18,500,000** *(each / 4 Masters)* | **37,000,000** *(each / 4 Masters)* | Nightmare Merge `[3725119625101312]` |

**Associated Adds**
* **Dread Larva:** Combat Log ID `3381934558281728` | Global ID `16140997453538032015`

**Encounter Phases**
1. **Phase 1: Rotational Pairs** (`Bestia/Calphayus -> Tyrans/Raptus`) — Trigger: Push below 50%.
2. **Phase 2: Quad Battle** (`Simultaneous Push to 15%`) — Trigger: All 4 drop from thrones.
3. **Phase 3: Dread Crystals** (`Final DPS Race`) — Trigger: All 4 reach 15%.

**Wipe Signatures & Fail Mechanics**
* ⚠️ **Uneven Death Enrage** (Ability ID: `3725119625101312`): Killing one Master early in Phase 2 before others reach 15% buffs remaining masters to wipe the raid.

**End Conditions**
* **Victory Event:** All Masters Defeated | **Target Death ID:** `3303551405129728` (SM) / `3458114393210880` (VM) / `3511904563625984` (MM)

---

# 8. THE RAVAGERS (RAV)

---

### Coratanni & Ruugar — The Ravagers

**Encounter Overview**
* **ID:** `rav_coratanni`
* **Boss Name:** Coratanni & Ruugar
* **Operation & Location:** The Ravagers (Rishi)
* **Lair Boss:** No
* **Boss Template ID:** `npc.location.flashpoint.raid.rishi.enemy.difficulty_1.boss_coratanni` / `boss_ruugar`

**Health Pools & Difficulty**
| Difficulty | 8-Player (8M) HP | 16-Player (16M) HP | Exclusive Mechanics / Tactical Modifiers |
|---|---|---|---|
| Story Mode (SM) | **7,800,000** *(Coratanni)* | **15,200,000** *(Coratanni)* | Pearl -> Coratanni -> Ruugar |
| Veteran Mode (VM) | **21,900,000** *(Coratanni)* | **43,800,000** *(Coratanni)* | Hostage Execution `[abl.rav.ruugar.execution]` |
| Master Mode (MM) | *N/A (Not Implemented)* | *N/A (Not Implemented)* | N/A |

**Associated Adds**
* **Pearl (Pet):** Combat Log ID `3458114393210880` | Global ID `16140991054798983741`
* **Ruugar's Smuggled Droid:** Combat Log ID `3511904563625984` | Global ID `16141003399051601041`

**Encounter Phases**
1. **Phase 1: Bridge Battle** (`Pearl & Coratanni`) — Trigger: Push Coratanni to 20%.
2. **Phase 2: Escape Pod Deck** (`Ruugar Showdown`) — Trigger: Take escape pod down.

**Wipe Signatures & Fail Mechanics**
* ⚠️ **Scatter Gun Execution** (Ability ID: `abl.rav.ruugar.scatter_slam`): Failure to face Ruugar away from the hostage results in instant execution.

**End Conditions**
* **Victory Event:** Ruugar Defeated | **Target Death ID:** `npc.location.flashpoint.raid.rishi.enemy.difficulty_1.boss_ruugar`

---

# 9. TEMPLE OF SACRIFICE (TOS)

---

### The Revan Encounter — Temple of Sacrifice

**Encounter Overview**
* **ID:** `tos_revan`
* **Boss Name:** Revan
* **Operation & Location:** Temple of Sacrifice (Yavin 4)
* **Lair Boss:** No
* **Boss Template ID:** `3511904563625984` (`npc.location.flashpoint.raid.yavin4.enemy.difficulty_1.boss_revan`)

**Health Pools & Difficulty**
| Difficulty | 8-Player (8M) HP | 16-Player (16M) HP | Exclusive Mechanics / Tactical Modifiers |
|---|---|---|---|
| Story Mode (SM) | **9,400,000** | **18,300,000** | Catwalk & machine floor transitions |
| Veteran Mode (VM) | **26,200,000** | **52,400,000** | Force Aberration Cascade `[3725149689872384]` |
| Master Mode (MM) | *N/A (Not Implemented)* | *N/A (Not Implemented)* | N/A |

**Associated Adds**
* **Force Aberration:** Combat Log ID `3381934558281728` | Global ID `16140997453538032015`

**Encounter Phases**
1. **Phase 1: Platform Ground** (`Pillars`) — Trigger: 100% to 70% HP.
2. **Phase 2: Catwalk Ascension** (`Aberrations`) — Trigger: 70% to 50% HP.
3. **Phase 3: The Machine Floor** (`Heave & Floating Sabers`) — Trigger: 50% to 9% HP.
4. **Phase 4: Machine Core DPS Race** (`Sacrifice Core`) — Trigger: Sub-9% HP.

**Wipe Signatures & Fail Mechanics**
* ⚠️ **Sacrifice Core Overload** (Ability ID: `3725149689872384`): Failure to burn the central core within 30 seconds triggers the apocalypse wipe.

**End Conditions**
* **Victory Event:** Core Destroyed / Revan Vanquished | **Target Death ID:** `3511904563625984` (SM) / `3725119625101312` (VM)

---

# 10. GODS FROM THE MACHINE (GOTM)

---

### Tyth — Gods from the Machine

**Encounter Overview**
* **ID:** `gotm_tyth`
* **Boss Name:** Tyth, God of Rage
* **Operation & Location:** Gods from the Machine (Iokath)
* **Lair Boss:** No
* **Boss Template ID:** `4078427929837568` (`npc.operation.iokath.enemy.difficulty_1.boss.tyth.tyth`)

**Health Pools & Difficulty**
| Difficulty | 8-Player (8M) HP | 16-Player (16M) HP | Exclusive Mechanics / Tactical Modifiers |
|---|---|---|---|
| Story Mode (SM) | **7,100,000** | **13,850,000** | Grace droid stack management |
| Veteran Mode (VM) | **19,800,000** | **39,600,000** | Justice droid invulnerability shields |
| Master Mode (MM) | **44,500,000** | **89,000,000** | Rage Inversion Shock `[4078427929837568]` |

**Associated Adds**
* **Grace Droid:** Combat Log ID `4078427929837568` | Global ID `16141119395581720699`

**Encounter Phases**
1. **Phase 1: Rage Meter Control** (`Sweeping Slash & Cleave`) — Trigger: Kill Grace droids to prevent 100 Rage.

**Wipe Signatures & Fail Mechanics**
* ⚠️ **Rage 100 Overload Slam** (Ability ID: `4078427929837568`): Tyth reaching 100 Rage stacks unleashes an uninterruptible full-room fatal wipe.

**End Conditions**
* **Victory Event:** Boss Defeat | **Target Death ID:** `4078427929837568` (SM) / `4197677696811008` (VM) / `4282872668094464` (MM)

---

### Izax, The Destroyer — Gods from the Machine

**Encounter Overview**
* **ID:** `gotm_izax`
* **Boss Name:** Izax, The Destroyer
* **Operation & Location:** Gods from the Machine (Iokath)
* **Lair Boss:** No
* **Boss Template ID:** `4078427929837568` (`npc.operation.iokath.enemy.difficulty_1.boss.izax.izax`)

**Health Pools & Difficulty**
| Difficulty | 8-Player (8M) HP | 16-Player (16M) HP | Exclusive Mechanics / Tactical Modifiers |
|---|---|---|---|
| Story Mode (SM) | **11,200,000** | **21,800,000** | Tether cables & flying bombardment |
| Veteran Mode (VM) | **31,500,000** | **63,000,000** | Induction generator puzzle |
| Master Mode (MM) | **72,800,000** | **145,600,000** | Cataclysmic Induction `[4078427929837568]` |

**Associated Adds**
* **Anchor Drone:** Combat Log ID `4078427929837568` | Global ID `16141119395581720699`

**Encounter Phases**
1. **Phase 1: Hull Battle & Tether Hooks** (`Cables`) — Trigger: Encounter pull.
2. **Phase 2: Flying Barrage** (`Kiting Missiles`) — Trigger: 75% HP.
3. **Phase 3: Induction Generator** (`Shield Laser Reflection`) — Trigger: 45% HP.
4. **Phase 4: Final Descent** (`Deck DPS Race`) — Trigger: Sub-10% HP.

**Wipe Signatures & Fail Mechanics**
* ⚠️ **Omnidirectional Destroyer Beam** (Ability ID: `4282872668094464`): Failing to reflect the central laser beam incinerates the entire platform.

**End Conditions**
* **Victory Event:** Boss Defeat | **Target Death ID:** `4078427929837568` (SM) / `4197677696811008` (VM) / `4282872668094464` (MM)

---

# 11. THE NATURE OF PROGRESS (DXUN)

---

### Apex Vanguard — The Nature of Progress

**Encounter Overview**
* **ID:** `dxun_apex_vanguard`
* **Boss Name:** Apex Vanguard
* **Operation & Location:** The Nature of Progress (Dxun)
* **Lair Boss:** No
* **Boss Template ID:** `4282872668094464` (`npc.operation.dxun.difficulty_1.boss.hybrid_horror.hybrid_horror`)

**Health Pools & Difficulty**
| Difficulty | 8-Player (8M) HP | 16-Player (16M) HP | Exclusive Mechanics / Tactical Modifiers |
|---|---|---|---|
| Story Mode (SM) | **10,100,000** | **19,700,000** | Battery charging & acid puddle cleanses |
| Veteran Mode (VM) | **28,400,000** | **56,800,000** | High continuous DTPS on battery carrier |
| Master Mode (MM) | **60,500,000** | **121,000,000** | Photogenesis Meltdown `[4282872668094464]` |

**Associated Adds**
* **CI-TR09 Repair Droid:** Combat Log ID `4282872668094464` | Global ID `16140982803969604338`

**Encounter Phases**
1. **Phase 1: Battery Charging & Cleanse** (`Battery Carrying`) — Trigger: Encounter pull.
2. **Phase 2: Overheated Photogenesis** (`Soft Enrage DPS Phase`) — Trigger: Sub-20% HP.

**Wipe Signatures & Fail Mechanics**
* ⚠️ **Photogenesis Nuclear Burst** (Ability ID: `4282872668094464`): Failing to blind and drain the boss using charged laser stations wipes the team.

**End Conditions**
* **Victory Event:** Boss Defeat | **Target Death ID:** `4282872668094464` (SM) / `4197677696811008` (VM) / `4078427929837568` (MM)

---

# 12. R-4 ANOMALY (R-4)

*(Note: R-4 Anomaly is strictly designed for **8-Player groups only**; 16M difficulty is not available).*

---

### IP-CPT — R-4 Anomaly

**Encounter Overview**
* **ID:** `r4_ip_cpt`
* **Boss Name:** IP-CPT
* **Operation & Location:** R-4 Anomaly (Deep Space Platform)
* **Lair Boss:** No
* **Boss Template ID:** `npc.location.flashpoint.raid.r4_anomaly.enemy.difficulty_1.boss_ipcpt`

**Health Pools & Difficulty**
| Difficulty | 8-Player (8M) HP | 16-Player (16M) HP | Exclusive Mechanics / Tactical Modifiers |
|---|---|---|---|
| Story Mode (SM) | **9,800,000** | *N/A (8M Exclusive)* | Console subroutine puzzle |
| Veteran Mode (VM) | **26,400,000** | *N/A (8M Exclusive)* | Decryption Lockout `[abl.r4.ipcpt.override]` |
| Master Mode (MM) | *N/A (Not Implemented)* | *N/A (Not Implemented)* | N/A |

**Associated Adds**
* **Maintenance Probe:** Combat Log ID `npc.location.flashpoint.raid.r4_anomaly.enemy.maint_probe`

---

### Watchdog — R-4 Anomaly

**Encounter Overview**
* **ID:** `r4_watchdog`
* **Boss Name:** Watchdog
* **Operation & Location:** R-4 Anomaly (Deep Space Platform)
* **Lair Boss:** No
* **Boss Template ID:** `npc.location.flashpoint.raid.r4_anomaly.enemy.difficulty_1.boss_watchdog`

**Health Pools & Difficulty**
| Difficulty | 8-Player (8M) HP | 16-Player (16M) HP | Exclusive Mechanics / Tactical Modifiers |
|---|---|---|---|
| Story Mode (SM) | **11,200,000** | *N/A (8M Exclusive)* | Proximity mine missile targeting |
| Veteran Mode (VM) | **31,800,000** | *N/A (8M Exclusive)* | Singularity Tether `[abl.r4.watchdog.grav_crush]` |
| Master Mode (MM) | *N/A (Not Implemented)* | *N/A (Not Implemented)* | N/A |

---

### Lord Kanoth — R-4 Anomaly

**Encounter Overview**
* **ID:** `r4_lord_kanoth`
* **Boss Name:** Lord Kanoth
* **Operation & Location:** R-4 Anomaly (Deep Space Platform)
* **Lair Boss:** No
* **Boss Template ID:** `npc.location.flashpoint.raid.r4_anomaly.enemy.difficulty_1.boss_kanoth`

**Health Pools & Difficulty**
| Difficulty | 8-Player (8M) HP | 16-Player (16M) HP | Exclusive Mechanics / Tactical Modifiers |
|---|---|---|---|
| Story Mode (SM) | **12,500,000** | *N/A (8M Exclusive)* | Hot/Cold dynamic floor sectors |
| Veteran Mode (VM) | **35,200,000** | *N/A (8M Exclusive)* | Nihil Inversion `[abl.r4.kanoth.nihil_decay]` |
| Master Mode (MM) | *N/A (Not Implemented)* | *N/A (Not Implemented)* | N/A |

---

### Lady Dominique — R-4 Anomaly

**Encounter Overview**
* **ID:** `r4_lady_dominique`
* **Boss Name:** Lady Dominique
* **Operation & Location:** R-4 Anomaly (Deep Space Platform)
* **Lair Boss:** No
* **Boss Template ID:** `npc.location.flashpoint.raid.r4_anomaly.enemy.difficulty_1.boss_lady_dominique`

**Health Pools & Difficulty**
| Difficulty | 8-Player (8M) HP | 16-Player (16M) HP | Exclusive Mechanics / Tactical Modifiers |
|---|---|---|---|
| Story Mode (SM) | **14,800,000** | *N/A (8M Exclusive)* | Aria support tethers & outer ring knockbacks |
| Veteran Mode (VM) | **42,000,000** | *N/A (8M Exclusive)* | Dark Resonance `[abl.r4.dominique.dark_resonance]` |
| Master Mode (MM) | *N/A (Not Implemented)* | *N/A (Not Implemented)* | N/A |

**Associated Adds**
* **ARIA Support Unit:** Combat Log ID `npc.location.flashpoint.raid.r4_anomaly.enemy.aria_support`

**Encounter Phases**
1. **Phase 1: Upper Ring Platform** (`Aria Tethers & Add Knocks`) — Trigger: Encounter pull.
2. **Phase 2: Center Reactor Core** (`Reactor Defense Burn`) — Trigger: Sub-40% HP.

**Wipe Signatures & Fail Mechanics**
* ⚠️ **Resonance Dark Nova** (Ability ID: `abl.r4.dominique.reactor_meltdown`): Dominique's dark tether reaching 100% saturation on the central reactor detonates the station.

**End Conditions**
* **Victory Event:** Boss Defeat | **Target Death ID:** `4282872668094464` (SM) / `4197677696811008` (VM)

---

# 13. ICONIC LAIR BOSSES

---

### Golden Fury (Toborro's Courtyard) — Lair Operation

**Encounter Overview**
* **ID:** `lair_golden_fury`
* **Boss Name:** Golden Fury
* **Operation & Location:** Toborro's Courtyard (Makeb)
* **Lair Boss:** Yes
* **Boss Template ID:** `npc.location.flashpoint.raid.makeb.enemy.difficulty_1.boss_golden_fury`

**Health Pools & Difficulty**
| Difficulty | 8-Player (8M) HP | 16-Player (16M) HP | Exclusive Mechanics / Tactical Modifiers |
|---|---|---|---|
| Story Mode (SM) | **5,800,000** | **11,300,000** | Radiation puddle drops |
| Veteran Mode (VM) | **16,100,000** | **32,200,000** | Isotope-5 Meltdown `[abl.lair.gold.meltdown]` |
| Master Mode (MM) | *N/A (Not Implemented)* | *N/A (Not Implemented)* | N/A |

**Associated Adds**
* **Isotope-5 Containment Droid:** Combat Log ID `npc.location.flashpoint.raid.makeb.enemy.gold_containment_droid`

---

### Colossal Monolith — Lair Operation

**Encounter Overview**
* **ID:** `lair_colossal_monolith`
* **Boss Name:** Colossal Monolith
* **Operation & Location:** Valley of the Machine Gods (Ziost)
* **Lair Boss:** Yes
* **Boss Template ID:** `npc.location.flashpoint.raid.ziost.enemy.difficulty_1.boss_monolith`

**Health Pools & Difficulty**
| Difficulty | 8-Player (8M) HP | 16-Player (16M) HP | Exclusive Mechanics / Tactical Modifiers |
|---|---|---|---|
| Story Mode (SM) | **6,900,000** | **13,500,000** | Colored curse rift sealing |
| Veteran Mode (VM) | **19,200,000** | **38,400,000** | Devouring Rift `[abl.lair.monolith.rift]` |
| Master Mode (MM) | *N/A (Not Implemented)* | *N/A (Not Implemented)* | N/A |

**Associated Adds**
* **Rift Anomaly:** Combat Log ID `npc.location.flashpoint.raid.ziost.enemy.monolith_rift_anomaly`

---

### Mutated Geonosian Queen (Hive of the Mountain Queen) — Lair Operation

**Encounter Overview**
* **ID:** `lair_hive_mountain_queen`
* **Boss Name:** Mutated Geonosian Queen
* **Operation & Location:** Hive of the Mountain Queen (Ossus)
* **Lair Boss:** Yes
* **Boss Template ID:** `4197677696811008` (`npc.operation.ossus_lair.enemy.difficulty_1.boss_queen`)

**Health Pools & Difficulty**
| Difficulty | 8-Player (8M) HP | 16-Player (16M) HP | Exclusive Mechanics / Tactical Modifiers |
|---|---|---|---|
| Story Mode (SM) | **7,800,000** | **15,200,000** | Egg crushing & Royal Guard split |
| Veteran Mode (VM) | **21,900,000** | **43,800,000** | Royal Slaughter `[4078427929837568]` |
| Master Mode (MM) | *N/A (Not Implemented)* | *N/A (Not Implemented)* | N/A |

**Associated Adds**
* **Geonosian Royal Guard:** Combat Log ID `4197677696811008` | Global ID `16141176766905048555`

**Encounter Phases**
1. **Phase 1: Egg Stomp & Off-Tanking** (`Egg Management`) — Trigger: Encounter pull.
2. **Phase 2: Caustic Scream & Submersion** (`Acid Floor`) — Trigger: Sub-40% HP.

**Wipe Signatures & Fail Mechanics**
* ⚠️ **Royal Guard Enrage** (Ability ID: `4078427929837568`): Failing to eliminate guards within their timer window causes an enrage that one-shots tanks.

**End Conditions**
* **Victory Event:** Boss Defeat | **Target Death ID:** `4197677696811008` (SM) / `4282872668094464` (VM)