# System Architecture & Technical Reference Manual
**SWTOR Operation Progression, Real-Time Parsing, Roster Management & Gamification Platform**

---

# 1. Awards, Achievements & Gamification Engine

The Awards Engine operates as an asynchronous pipeline. When a combat encounter concludes (flagged by an out-of-combat state or encounter end event in the combat log), the API ingests the batch metrics, calculates deterministic triggers, and mints badges.

```
[ Combat Log File ] ──(Local Parser Tail)──► [ WebSocket Stream ]
                                                    │
                                                    ▼
                                          [ Ingestion API ]
                                                    │
                             ┌──────────────────────┴──────────────────────┐
                             ▼                                             ▼
                   [ Session Aggregator ]                        [ Live Event Bus ]
                             │                                             │
                             ▼                                             ▼
                 [ Metric Normalization ]                       [ Discord Live State ]
                             │
                             ▼
               [ Rule Engine / Badge Evaluator ]
                             │
            ┌────────────────┼────────────────┐
            ▼                ▼                ▼
     [ Guild Firsts ]  [ Role Mastery ]  [ Meme / Shame ]
            │                │                │
            └────────────────┼────────────────┘
                             │
                             ▼
               [ Database Persistence & Minting ]
                             │
                             ▼
            [ Discord Announcement Webhook ]
```

---

## 1.1 Progression & Encounter Milestones

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ BADGE ID: PROG_FIRST_CLEAR                                                                                               │
├─────────────────┬────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Name            │ Hand of the Emperor / Council's Vanguard                                                               │
│ Category        │ Guild Progression                                                                                      │
│ Scope           │ Guild-Wide & Character Account                                                                         │
│ Encounter       │ Any Master Mode (NiM) Operation Final Encounter (e.g., Izax, Apex Vanguard, IP-CPT)                     │
│ Trigger Logic   │ IF event == "ENCOUNTER_END" AND encounter_id == FINAL_BOSS AND difficulty == "Master"                   │
│                 │ AND guild_encounter_kill_count == 1                                                                    │
│ Metrics         │ boss_hp_percentage == 0.0, encounter_duration > 0                                                        │
│ Verification    │ Ensure log contains minimum 8 unique player GUIDs matching current guild roster.                       │
└─────────────────┴────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ BADGE ID: PROG_DEATHLESS_RUN                                                                                             │
├─────────────────┬────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Name            │ The Untouchables                                                                                       │
│ Category        │ Operational Flawlessness                                                                               │
│ Scope           │ Active Roster (8-man / 16-man)                                                                          │
│ Encounter       │ Full Operation Run (Veteran or Master Mode)                                                            │
│ Trigger Logic   │ COUNT(player_death_events) == 0 WHERE difficulty IN ('Veteran', 'Master')                              │
│                 │ AND operations_bosses_defeated == total_operation_bosses                                               │
│ Metrics         │ Sum of revive counts (Combat Rezzes + Stealth Rezzes) == 0. Total deaths across log session == 0.       │
│ Verification    │ Parse consecutive encounter timestamps within the same operation instance lock; maximum allowable gap  │
│                 │ between bosses: 20 minutes (prevents stitching segmented sessions).                                   │
└─────────────────┴────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ BADGE ID: PROG_CLUTCH_EXECUTE                                                                                            │
├─────────────────┬────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Name            │ Sparks in the Dark                                                                                     │
│ Category        │ Progression Moments                                                                                    │
│ Scope           │ Surviving Players                                                                                      │
│ Encounter       │ Any Veteran / Master Mode Encounter                                                                    │
│ Trigger Logic   │ IF boss_died == TRUE AND (alive_players_at_kill / total_raid_members) <= 0.25                          │
│ Metrics         │ Calculate alive player state at timestamp T(boss_death). For an 8-man group: alive_players <= 2.        │
│ Edge Cases      │ Disregard self-resurrections or post-kill suicide mechanics. Alive status is determined precisely at   │
│                 │ `event.timestamp == boss.death_timestamp`.                                                             │
└─────────────────┴────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ BADGE ID: PROG_WALL_BREAKER                                                                                              │
├─────────────────┬────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Name            │ Overcoming the Inevitable                                                                              │
│ Category        │ Tenacity                                                                                               │
│ Scope           │ Active Roster                                                                                          │
│ Encounter       │ Any Master Mode Progression Boss                                                                       │
│ Trigger Logic   │ COUNT(wipes_on_encounter) >= 50 AND current_pull_result == 'KILL'                                      │
│ Metrics         │ Historical wipe counter query linked to the specific encounter_id for the current guild season.        │
│ Verification    │ Pull duration must exceed 60 seconds per wipe attempt to prevent intentional rapid-reset exploitation. │
└─────────────────┴────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 1.2 Role-Specific Performance Badges

### Damage Dealers (DPS)

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ BADGE ID: DPS_TOP_PERCENTILE                                                                                             │
├─────────────────┬────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Name            │ Unlimited Power!                                                                                       │
│ Category        │ DPS Mastery                                                                                            │
│ Discipline      │ All Damage Disciplines                                                                                 │
│ Trigger Logic   │ calculate_percentile(player_dps, encounter_id, discipline_id) >= 0.99                                  │
│ Formula         │ DPS = total_damage_dealt / encounter_duration_seconds                                                   │
│ Validation      │ Log must be parsed against standard encounter duration (must not be an early enrage burn exploit).    │
│                 │ Database must contain a baseline of >= 100 historical logs for that specific discipline & encounter.   │
└─────────────────┴────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ BADGE ID: DPS_PRIORITY_BURST                                                                                             │
├─────────────────┬────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Name            │ Priority Assassin                                                                                      │
│ Category        │ Mechanical Execution                                                                                   │
│ Target Adds     │ E.g., Nahut's Stealth Turrets, Apex Vanguard Stim Probes, Brontes Hands, Master & Blaster Mines         │
│ Trigger Logic   │ (damage_to_add_by_player / total_add_hp) >= 0.40                                                         │
│                 │ AND add_time_to_death <= target_kill_window_seconds                                                    │
│ Filter          │ Damage done specifically within window [Add_Spawn_Timestamp, Add_Death_Timestamp].                      │
└─────────────────┴────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ BADGE ID: DPS_EXECUTE_SPECIALIST                                                                                         │
├─────────────────┬────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Name            │ The Final Reckoning                                                                                    │
│ Category        │ DPS Execution                                                                                          │
│ Trigger Logic   │ player_burn_dps >= (player_overall_dps * 1.35)                                                         │
│ Window          │ Boss HP between 15% and 0%                                                                              │
│ Formula         │ Burn_DPS = damage_dealt_in_burn_phase / burn_phase_duration_seconds                                    │
└─────────────────┴────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### Healers

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ BADGE ID: HEAL_CLEANSE_MASTER                                                                                            │
├─────────────────┬────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Name            │ Cleanse Maestro                                                                                        │
│ Category        │ Dispel Efficiency                                                                                      │
│ Trigger Logic   │ cleansable_debuffs_applied > 10                                                                        │
│                 │ AND (successful_cleanses / total_cleansable_debuffs_on_group) >= 0.90                                  │
│                 │ AND avg_cleanse_reaction_time <= 1.50_seconds                                                          │
│ Formula         │ Reaction_Time = Timestamp(RemoveEffectByDispel) - Timestamp(ApplyEffect)                               │
│ Edge Cases      │ Debuffs removed via self-cleansing abilities (e.g., Force Barrier, Shroud) are credited to that player  │
│                 │ or excluded from the healer's denominator.                                                             │
└─────────────────┴────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ BADGE ID: HEAL_CLUTCH_SAVE                                                                                               │
├─────────────────┬────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Name            │ Defying the Force                                                                                      │
│ Category        │ Emergency Healing                                                                                      │
│ Trigger Logic   │ Target player HP drops <= 0.05 (5%) AND target receives healing from healer >= 0.80 (80% Max HP)       │
│                 │ within 3.0 seconds WITHOUT the target dying.                                                           │
│ Metric          │ Parse health state transitions in rolling 3000ms sliding windows per raid member.                      │
└─────────────────┴────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ BADGE ID: HEAL_HPS_CEILING                                                                                               │
├─────────────────┬────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Name            │ Kolto Fountain                                                                                         │
│ Category        │ Output Performance                                                                                     │
│ Trigger Logic   │ effective_hps >= target_hps_threshold_for_encounter                                                    │
│                 │ AND (overheal_amount / (effective_heal_amount + overheal_amount)) <= 0.25                              │
│ Formula         │ EHPS = sum(effective_healing) / encounter_duration_seconds                                             │
└─────────────────┴────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### Tanks

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ BADGE ID: TANK_MITIGATION_GOD                                                                                            │
├─────────────────┬────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Name            │ The Immovable Object                                                                                   │
│ Category        │ Defensive Execution                                                                                    │
│ Trigger Logic   │ Identify high-threat spike mechanics via Effect IDs (e.g., Brutal Strike, Demolishing Blast).          │
│                 │ For all identified spike events: active_dcd_flag == TRUE                                               │
│                 │ AND unmitigated_damage_spike_count == 0                                                                │
│ Verification    │ Cross-reference combat log `ApplyEffect` timestamps of DCDs (e.g., Saber Ward, Warded/Invincible,      │
│                 │ Oil Slick, Explosive Fuel with defensive utilities) with the damage packet timestamp.                 │
└─────────────────┴────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ BADGE ID: TANK_SWAP_PRECISION                                                                                            │
├─────────────────┬────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Name            │ Clockwork Taunt                                                                                        │
│ Category        │ Tank Mechanics                                                                                         │
│ Trigger Logic   │ Tank swap mechanics triggered by stack counts (e.g., 3 stacks of Incinerate).                          │
│                 │ Co-tank executes Taunt (`Taunt` or `Threatening Scream`/AOE Taunt) within 0.8 seconds of threshold     │
│                 │ stack application.                                                                                     │
│ Metric          │ Reaction Delta = Timestamp(TauntEvent) - Timestamp(TargetStackCountMet)                                │
└─────────────────┴────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 1.3 Gamified & Meme Badges (Hall of Shame)

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ BADGE ID: MEME_FLOOR_TANK                                                                                                │
├─────────────────┬────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Name            │ Floor Inspector First Class                                                                            │
│ Trigger Logic   │ (time_dead_in_encounter / encounter_duration) >= 0.50                                                  │
│                 │ AND encounter_result == "KILL"                                                                         │
│ Formula         │ Dead_Time = Timestamp(Encounter_End) - Timestamp(Player_Death)                                         │
└─────────────────┴────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ BADGE ID: MEME_RED_CIRCLE                                                                                               │
├─────────────────┬────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Name            │ Environmental Magnet                                                                                   │
│ Trigger Logic   │ player_avoidable_damage_taken == MAX(raid_members_avoidable_damage_taken)                              │
│                 │ AND player_avoidable_damage_taken >= (total_raid_avoidable_damage * 0.40)                              │
│ Mechanism       │ Match damage instances against a database of known avoidable hazard Effect IDs (e.g., fire traps,      │
│                 │ void zones, cross-hazards, dropping mines).                                                            │
└─────────────────┴────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ BADGE ID: MEME_EARLY_PULL                                                                                                │
├─────────────────┬────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Name            │ Leeroy's Heritage                                                                                      │
│ Trigger Logic   │ pull_event_initiator == player_id                                                                      │
│                 │ AND (Timestamp(Pull) - Timestamp(Ready_Check_Finish)) < 0                                              │
│                 │ AND wipe_occurred == TRUE AND encounter_duration <= 30_seconds                                         │
└─────────────────┴────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ BADGE ID: MEME_HOARDER                                                                                                  │
├─────────────────┬────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Name            │ Medpac Collector                                                                                       │
│ Trigger Logic   │ player_status == DEAD                                                                                  │
│                 │ AND medpac_used_in_encounter == FALSE                                                                  │
│                 │ AND major_dcd_used_in_encounter == FALSE                                                               │
│                 │ AND (damage_packet_that_killed - current_player_hp) <= max_medpac_heal_value                           │
└─────────────────┴────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

# 2. Web Portal Architecture & UX/UI Specifications

## 2.1 Information Architecture & Site Map

```
├── / (Public/Member Overview)
│   ├── /dashboard (Personal stats, scheduled raids, alerts)
│   ├── /characters (Character claiming, build configurations, combat bios)
│   └── /leaderboards (Guild parse ladders, badge trophy showcase)
├── /raids (Raid Management System)
│   ├── /calendar (Monthly/weekly view, operation sign-ups)
│   ├── /view/:id (Raid details, confirmed roster, reserve bench, strategy notes)
│   └── /builder/:id [OFFICER] (Interactive drag-and-drop roster and synergy solver)
├── /progression (Progression Analytics Engine)
│   ├── /operations/:id (Encounter matrices: SM / VM / MM kill tracking)
│   ├── /encounters/:id/analytics (Wipe progression curves, fail forensics)
│   └── /live (Real-time live streaming telemetry dashboard)
└── /admin [OFFICER/ADMIN]
    ├── /roster-manager (Guild member role mapping, alt management)
    ├── /badge-manager (Custom badge definitions, manual pinning)
    └── /bot-config (Discord webhook endpoints, channel assignments)
```

---

## 2.2 Member View: Dashboard & Character Profile

### Dashboard Interface Layout
```
+----------------------------------------------------------------------------------------------------+
|  [AVATAR] Darth Malgus (Officer)                             [Active Session: R-4 MM Progression]   |
+----------------------------------------------------------------------------------------------------+
|  MY SIGNED-UP RAIDS                     |  RECENT TROPHIES EARNED                                  |
|  -------------------------------------  |  ------------------------------------------------------  |
|  * Tue 20:00 - Gods MM (Confirmed)     |  * [TROPHY] Unlimited Power (Apex Vanguard - 32.4k DPS)  |
|    Role: Sniper (Marksmanship)          |  * [TROPHY] Cleanse Maestro (IP-CPT - 100% / 0.8s avg)   |
|  * Thu 20:00 - Dxun MM (Pending)        |  * [SHAME]  Floor Inspector (Trandoshans - 62% dead)     |
|    Role: Mercenary (Bodyguard)          |                                                          |
+----------------------------------------------------------------------------------------------------+
|  CHARACTER COMBAT BIO & PROGRESSION SNAPSHOT                                                       |
|  Selected: "Xal-cor" - Sith Assassin (Darkness) | Gear Rating: 344 | Augments: 340 Gold           |
|                                                                                                    |
|  Damage Taken / Min (DTPM)   Avg Shield Efficiency    Cleanse Reaction Time    Floor Time Index    |
|  [ 3,840 DTPM ]              [ 48.2% Absorb/Shield ]  [ 1.12 Seconds ]         [ 1.8% (Elite) ]    |
|                                                                                                    |
|  Master Mode Kill Matrix:                                                                          |
|  EV [X]  KP [X]  EC [X]  TFB [X]  S&V [X]  DF [X]  DP [X]  ToS [X]  Rav [X]  GotM [4/5] Dxun [X]  R-4 [1/4]|
+----------------------------------------------------------------------------------------------------+
```

---

## 2.3 Officer Suite: Raid Builder & Strategy Canvas

```
+----------------------------------------------------------------------------------------------------+
|  ROSTER BUILDER: Gods from the Machine (Master Mode) - Scyva Progression                           |
+----------------------------------------------------------------------------------------------------+
|  AVAILABLE POOL (SIGN-UPS)    |  CONFIRMED ROSTER (8-MAN)             |  SYNERGY & UTILITY METRICS |
|  ---------------------------  |  -----------------------------------  |  ------------------------- |
|  [Tank]   Vanguard (Plasmatech)|  T1: [Assassin] Nox (Darkness)        |  Synergy Score: 96 / 100   |
|  [DPS]    Operative (Conceal) |  T2: [Jugg]     Vorn (Immortal)       |  [✔] Armor Debuff (Jugg)   |
|  [DPS]    Sorcerer (Madness)  |  H1: [Operative]Doc (Medicine)        |  [✔] Tech Vuln (Operative) |
|  [Heal]   Mercenary (Bodyg)   |  H2: [Mercenary]Mako (Bodyguard)      |  [✔] Force Vuln (Assassin) |
|  [DPS]    Marauder (Carnage)  |  D1: [Sniper]   Gault (Virulence)     |  [✔] Bloodthirst / Insp    |
|                               |  D2: [Marauder] Malavai (Annihil)     |  [✔] 2x Combat Rezzes      |
|  BENCH / ALTERNATES (2)       |  D3: [Mercenary]Torian (Innovative)   |  [✔] Raid Speed (Predation)|
|  * [DPS] Lana (Lightning)     |  D4: [Powertech]Blizz (Pyrotech)      |  [!] Missing: Force Barrier|
|  * [Heal] Talos (Corruption)  +--------------------------------------------------------------------+
|                               |  MECHANIC ASSIGNMENTS                                              |
|  ACTIONS:                     |  * Ignite Protocol Kick Rotation: [ D1 -> D2 -> D4 ]               |
|  [ AUTO-FILL OPTIMAL COMP ]   |  * Red Sphere Kiting:             [ T1 (Force Shroud Active) ]     |
|  [ PUBLISH ROSTER TO DISCORD ]|  * Extinction Protocol Defense:   [ H1 (Group Stealth/Shield) ]    |
+----------------------------------------------------------------------------------------------------+
```

---

## 2.4 Progression Analytics: Wipe Forensics & Encounter Dashboard

```
+----------------------------------------------------------------------------------------------------+
|  ENCOUNTER RUN: Apex Vanguard (Master Mode) | Pull Count: 24 | Date: 2026-08-15                   |
+----------------------------------------------------------------------------------------------------+
|  PULL PROGRESSION CURVE (Lowest Boss HP % per Attempt)                                            |
|                                                                                                    |
| 100% | *  *                                                                                        |
|  80% |       *  *     *                                                                            |
|  60% |             *     *  *                                                                      |
|  40% |                         *  *     *                                                          |
|  20% |                                     *  *  *  *  *  *  *  *  *  * (Best: 4.2% - Pull 22)    |
|   0% +------------------------------------------------------------------------------------         |
|     P1  P3  P5  P7  P9  P11 P13 P15 P17 P19 P21 P23                                                |
+----------------------------------------------------------------------------------------------------+
|  WIPE ROOT-CAUSE BREAKDOWN                    |  LAST 5 SECONDS DAMAGE SPIKE BEFORE WIPE           |
|  -------------------------------------------  |  ------------------------------------------------  |
|  1. Acid Deluge Misplacement       (11 Wipes) |  Timestamp: 04:12.850                              |
|  2. Stim Probe Enrage Check Failed  (7 Wipes) |  * Tank1 took 185,400 (Acid Wave - Unmitigated)    |
|  3. Target Dropout / Tank Death     (4 Wipes) |  * Heal2 took 142,000 (Targeted Blast)             |
|  4. Photogenesis Blind Overlap      (2 Wipes) |  * DPS3 took 98,000 (Environmental Splatter)       |
+----------------------------------------------------------------------------------------------------+
```

---

# 3. Smart Composition & Raid Suggestion Engine

The Smart Composition Engine evaluates combinations of signed-up characters to select a roster that maximizes team-wide output and satisfies encounter-specific mechanics.

```
                    ┌────────────────────────────┐
                    │ Sign-up Roster Candidates  │
                    └─────────────┬──────────────┘
                                  │
                                  ▼
                    ┌────────────────────────────┐
                    │   Phase 1: Hard Filter     │
                    │   Role Slots Validation    │
                    │  (e.g., 2 Tank, 2 H, 4 D)  │
                    └─────────────┬──────────────┘
                                  │
                                  ▼
                    ┌────────────────────────────┐
                    │  Phase 2: Mechanics Matrix │
                    │ Required Mechanics Check   │
                    │ (Stealth, Rezzes, Pushes)  │
                    └─────────────┬──────────────┘
                                  │
                                  ▼
                    ┌────────────────────────────┐
                    │ Phase 3: Synergy Evaluator │
                    │  Buff/Debuff Coverage +    │
                    │  Historical Player Weight  │
                    └─────────────┬──────────────┘
                                  │
                                  ▼
                    ┌────────────────────────────┐
                    │ Highest Ranked Composition │
                    └────────────────────────────┘
```

## 3.1 Formal SWTOR Synergy & Vulnerability Matrix

To achieve optimal DPS output, a raid composition must cover the primary damage categories: **Force, Tech, Melee, Ranged, Internal/Elemental, and Armor Reduction**.

| Class / Discipline | Primary Raid Buff (Group-Wide) | Target Debuff / Vulnerability Applied | Essential Raid Utilities Provided |
| :--- | :--- | :--- | :--- |
| **Sith Juggernaut / Jedi Guardian** | *None* | **Armor Reduction (-20% Armor)** | Intercede/Guardian Leap, Saber Reflect, Push, Awe/Intimidating Roar |
| **Sith Marauder / Jedi Sentinel** | **Bloodthirst / Inspiration (+20% Dmg/Heal)** | **Internal/Elemental (+7%)** | Predation/Transcendence (+80% Speed), Group Camouflage |
| **Sith Assassin / Jedi Shadow** | *None* | **Force Vulnerability (+5%)** | Combat Stealth (Stealth Rez), Phase Walk, Mass Mind Control (DR) |
| **Sith Sorcerer / Jedi Sage** | **Unlimited Power (+10% Stats)** | **Force Vulnerability (+5%)** | Extrication/Rescue (Pull), Phase Walk, Force Barrier (Immunity) |
| **Powertech / Vanguard** | *None* | **Tech Vulnerability (+5%)** | Sonic Rebounder (AoE Reflect), Hydraulic Overrides (Knockback Immunity), Pull |
| **Mercenary / Commando** | **Supercharged Celerity (+10% Alacrity)** | **Ranged / Armor Reduction** | Combat Resurrection, Responsive Safeguards (Reflect), Hydro/Hydraulics |
| **Operative / Scoundrel** | *None* | **Tech Vulnerability (+5%)** | Tactical Stealth (Stealth Rez), Toxic Cloud / Group Shield, Roll Immunity |
| **Sniper / Gunslinger** | *None* | **Internal/Elemental (+7%) & Armor (-20%)** | Ballistic Shield (-20% Group Dmg Taken), Cover Pulse (AoE Push/Root) |

---

## 3.2 Composition Scoring Algorithm

The total composition score $S(R)$ for a candidate roster $R$ of 8 players is defined as:

$$S(R) = w_B \cdot B(R) + w_V \cdot V(R) + w_U \cdot U(R, E) + w_P \cdot P(R, E) - M(R, E)$$

Where:
* $B(R)$: **Raid Buff Score** (Normalized $\in [0, 1]$). Sum of distinct operation buffs (Bloodthirst, Inspiration, Unlimited Power, Supercharged Celerity).
* $V(R)$: **Vulnerability Coverage Score** (Normalized $\in [0, 1]$). Proportion of total group damage types matched by applied debuffs.
* $U(R, E)$: **Utility Score for Encounter $E$** (Normalized $\in [0, 1]$). Matches required mechanics (e.g., knockbacks on Styrak, stealth rezzes, speed boosts).
* $P(R, E)$: **Historical Player Performance Index** on encounter $E$. Derived from historical survival rate and parse percentiles.
* $M(R, E)$: **Mechanical Constraint Penalty** (e.g., deducting 50 points if a fight requires 2 combat rezzes and the comp contains 0).
* Default weights: $w_B = 25, w_V = 25, w_U = 30, w_P = 20$.

---

## 3.3 Composition Optimization Implementation

```python
from dataclasses import dataclass
from typing import List, Dict, Set
from itertools import combinations

@dataclass
class PlayerCandidate:
    id: str
    name: str
    role: str  # 'TANK', 'HEALER', 'DPS'
    discipline: str
    raid_buffs: Set[str]
    debuffs_provided: Set[str]
    utilities: Set[str]
    historical_clear_rate: float
    historical_dps_percentile: float

@dataclass
class EncounterRequirements:
    name: str
    tanks_needed: int
    healers_needed: int
    dps_needed: int
    mandatory_utilities: Set[str]
    preferred_debuffs: Set[str]

class RosterOptimizer:
    def __init__(self, candidates: List[PlayerCandidate], requirements: EncounterRequirements):
        self.candidates = candidates
        self.req = requirements

    def evaluate_roster(self, roster: List[PlayerCandidate]) -> float:
        score = 0.0
        
        # 1. Raid Buff Coverage (Max 25 pts)
        unique_buffs = set().union(*[p.raid_buffs for p in roster])
        score += len(unique_buffs) * 6.25  # Max 4 unique buffs = 25 pts
        
        # 2. Debuff / Vulnerability Synergy (Max 25 pts)
        provided_debuffs = set().union(*[p.debuffs_provided for p in roster])
        matched_debuffs = provided_debuffs.intersection(self.req.preferred_debuffs)
        if self.req.preferred_debuffs:
            score += (len(matched_debuffs) / len(self.req.preferred_debuffs)) * 25.0
            
        # 3. Mandatory Utility Compliance (Max 30 pts)
        group_utilities = set().union(*[p.utilities for p in roster])
        missing_mandatory = self.req.mandatory_utilities - group_utilities
        if missing_mandatory:
            score -= len(missing_mandatory) * 20.0  # Heavy penalty for missing essential utilities
        else:
            score += 30.0

        # 4. Performance & Reliability Metric (Max 20 pts)
        avg_perf = sum(p.historical_dps_percentile for p in roster) / len(roster)
        avg_clear = sum(p.historical_clear_rate for p in roster) / len(roster)
        score += ((avg_perf * 0.5) + (avg_clear * 0.5)) * 20.0

        return max(score, 0.0)

    def find_optimal_roster(self) -> List[PlayerCandidate]:
        tanks = [p for p in self.candidates if p.role == 'TANK']
        healers = [p for p in self.candidates if p.role == 'HEALER']
        dps = [p for p in self.candidates if p.role == 'DPS']
        
        best_roster = None
        best_score = -1.0
        
        for t_comb in combinations(tanks, self.req.tanks_needed):
            for h_comb in combinations(healers, self.req.healers_needed):
                for d_comb in combinations(dps, self.req.dps_needed):
                    candidate_roster = list(t_comb + h_comb + d_comb)
                    roster_score = self.evaluate_roster(candidate_roster)
                    
                    if roster_score > best_score:
                        best_score = roster_score
                        best_roster = candidate_roster
                        
        return best_roster
```

---

# 4. Real-Time Integration & Pipeline Architecture

```
                                      COMMUNICATION TOPOLOGY
                                      
  [SWTOR Client Engine]
           │
           │ Writes to Disk (%LOCALAPPDATA%/.../CombatLogs/CombatLog_YYYY-MM-DD_HHMMSS.txt)
           ▼
  [Windows Parsing Client]
           │
           │ (1) File Tailer Engine (0-latency async I/O)
           │ (2) Line Tokenizer & Protobuf Serializer
           │ (3) TLS WebSocket Client (wss://api.guilddomain.com/v1/stream)
           ▼
    [Load Balancer / Reverse Proxy]
           │
           ▼
  [Web API Parsing Service] ───► [Redis Stream Engine]
           │                              │
           │                              ├──► [Live Session Evaluator] ──► [Web Portal Live Socket]
           │                              │
           │                              └──► [Discord Bot Event Bus]  ──► [Discord Live Thread Update]
           ▼
  [PostgreSQL / TimescaleDB Engine]
```

---

## 4.1 Windows Parser Streaming Protocol

The client tails the latest active `.txt` combat log in real time, batches lines every 250 milliseconds, serializes to JSON or Protobuf, and emits them over a secure WebSocket channel.

### Ingestion Event Payload Schema
```json
{
  "client_version": "2.4.1",
  "auth_token": "jwt_token_here",
  "session_id": "8f3b145a-6058-45b0-9494-b25867f7fa20",
  "batch_sequence": 1042,
  "events": [
    {
      "timestamp": "2026-08-17T05:22:31.842Z",
      "source_guid": "281474976710656",
      "source_name": "Darth Tank",
      "target_guid": "281474978891230",
      "target_name": "Apex Vanguard",
      "action_type": "Event::Damage",
      "ability_id": "804291884029440",
      "ability_name": "Retaliation",
      "effect_id": "804291884029441",
      "effect_name": "Energy Damage",
      "value": 14250,
      "mitigated_value": 3200,
      "threat_value": 28500,
      "is_critical": false,
      "defense_type": "Shielded"
    }
  ]
}
```

---

## 4.2 Discord Bot Command & Live Event Pipeline

The Discord bot serves as both an interactive booking agent and a real-time event broadcaster.

```
                    ┌───────────────────────────────────────────────┐
                    │               API Event Bus                   │
                    └───────┬───────────────────────────────┬───────┘
                            │                               │
                            ▼                               ▼
               ┌────────────────────────┐      ┌────────────────────────┐
               │ Roster Lifecycle Event │      │ Live Pull Metric Event │
               └────────────┬───────────┘      └────────────┬───────────┘
                            │                               │
                            ▼                               ▼
               ┌────────────────────────┐      ┌────────────────────────┐
               │ Update / Post Embed to │      │ Update Live Raid Embed │
               │ #raid-signups Channel  │      │ (Throttle: 1 req/3.5s) │
               └────────────────────────┘      └────────────────────────┘
```

### Discord Bot Command Map
* `/raid create [operation] [difficulty] [datetime] [tanks] [healers] [dps]` — Opens an interactive event card with buttons.
* `/raid roster [raid_id]` — Displays the assigned main group and waitlist/bench.
* `/raid bench-swap [raid_id] [player_in] [player_out]` — Performs an administrative swap and alerts both users via DM.
* `/parse live` — Generates a dynamic link to the web portal's low-latency stream view for the current active raid.
* `/awards check [character_name]` — Returns an embed showcasing earned badges, percentiles, and clear statuses.

---

### Live Raid Progress Discord Embed Layout
```
+----------------------------------------------------------------------+
| 🔴 LIVE RAID PROGRESSION: Gods from the Machine (Master Mode)        |
+----------------------------------------------------------------------+
| Current Boss: Nahut (The Son of Shadow)                              |
| Attempt Number: #14 | Current Boss HP: [ 24.8% ]                     |
| Pull Duration: 05:42 | Active Raid DPS: 148,290                      |
|                                                                      |
| Roster Status:                                                       |
| 🟢 Tank: Darth Tank (Jugg)     | 🟢 DPS: Vorn (Sniper) - 31.4k       |
| 🟢 Tank: Nox (Assassin)        | 🟢 DPS: Gault (Merc)  - 29.8k       |
| 🟢 Heal: Doc (Operative)       | 💀 DPS: Blizz (PT)    - DIED (P2)   |
| 🟢 Heal: Mako (Mercenary)      | 🟢 DPS: Torian (Mara) - 28.1k       |
|                                                                      |
| Real-Time Stream: https://guildportal.gg/live/stream-gods-nim        |
+----------------------------------------------------------------------+
| Updated automatically • Latency: 280ms                               |
+----------------------------------------------------------------------+
```

---

# 5. Production Database Schema (PostgreSQL DDL)

Below is the complete database structure designed to support historical logs, high-performance querying, and audit integrity.

```sql
-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enums
CREATE TYPE user_role_enum AS ENUM ('MEMBER', 'RAIDER', 'OFFICER', 'ADMIN');
CREATE TYPE class_role_enum AS ENUM ('TANK', 'HEALER', 'DPS');
CREATE TYPE op_difficulty_enum AS ENUM ('STORY', 'VETERAN', 'MASTER');
CREATE TYPE raid_status_enum AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
CREATE TYPE signup_status_enum AS ENUM ('SIGNED_UP', 'CONFIRMED', 'BENCH', 'DECLINED', 'TENTATIVE');
CREATE TYPE badge_category_enum AS ENUM ('PROGRESSION', 'ROLE_DPS', 'ROLE_HEAL', 'ROLE_TANK', 'MEME');

-- 1. Users & Profiles
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    discord_id VARCHAR(32) UNIQUE NOT NULL,
    username VARCHAR(64) NOT NULL,
    avatar_hash VARCHAR(128),
    role user_role_enum DEFAULT 'MEMBER',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. In-Game Characters (Synced via Windows Parser)
CREATE TABLE characters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    name VARCHAR(64) NOT NULL,
    server VARCHAR(32) NOT NULL DEFAULT 'Darth Malgus',
    faction VARCHAR(16) NOT NULL, -- 'Empire', 'Republic'
    class_name VARCHAR(32) NOT NULL, -- e.g., 'Sith Assassin', 'Jedi Shadow'
    discipline VARCHAR(32) NOT NULL, -- e.g., 'Darkness', 'Kinetic Combat'
    default_role class_role_enum NOT NULL,
    item_rating INT DEFAULT 0,
    claim_verification_code VARCHAR(8),
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_character_server UNIQUE(name, server)
);

-- 3. Operations & Encounter Metadata
CREATE TABLE operations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(64) UNIQUE NOT NULL,
    short_code VARCHAR(8) UNIQUE NOT NULL, -- 'GotM', 'Dxun', 'R-4'
    tier INT NOT NULL
);

CREATE TABLE encounters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operation_id UUID REFERENCES operations(id) ON DELETE CASCADE,
    name VARCHAR(64) NOT NULL,
    encounter_order INT NOT NULL,
    has_stealth_check BOOLEAN DEFAULT FALSE,
    has_burst_check BOOLEAN DEFAULT FALSE,
    mandatory_interrupts BOOLEAN DEFAULT FALSE,
    enrage_timer_seconds INT,
    CONSTRAINT unique_operation_encounter UNIQUE(operation_id, encounter_order)
);

-- 4. Raids & Scheduling
CREATE TABLE raid_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operation_id UUID REFERENCES operations(id),
    title VARCHAR(128) NOT NULL,
    difficulty op_difficulty_enum NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    estimated_duration_minutes INT DEFAULT 120,
    created_by UUID REFERENCES users(id),
    status raid_status_enum DEFAULT 'SCHEDULED',
    discord_message_id VARCHAR(32),
    discord_thread_id VARCHAR(32),
    strategy_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE raid_signups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    raid_id UUID REFERENCES raid_events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    character_id UUID REFERENCES characters(id) ON DELETE SET NULL,
    role_requested class_role_enum NOT NULL,
    status signup_status_enum DEFAULT 'SIGNED_UP',
    bench_priority INT DEFAULT 0,
    signup_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_user_raid_signup UNIQUE(raid_id, user_id)
);

CREATE TABLE raid_mechanic_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    raid_id UUID REFERENCES raid_events(id) ON DELETE CASCADE,
    encounter_id UUID REFERENCES encounters(id) ON DELETE CASCADE,
    character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
    task_description VARCHAR(128) NOT NULL -- e.g., 'First Interrupt on Left Add'
);

-- 5. Combat Log Sessions & Telemetry
CREATE TABLE combat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    raid_id UUID REFERENCES raid_events(id) ON DELETE SET NULL,
    encounter_id UUID REFERENCES encounters(id),
    difficulty op_difficulty_enum NOT NULL,
    session_start TIMESTAMP WITH TIME ZONE NOT NULL,
    session_end TIMESTAMP WITH TIME ZONE,
    duration_seconds NUMERIC(8, 2),
    is_kill BOOLEAN DEFAULT FALSE,
    lowest_boss_hp_percent NUMERIC(5, 2),
    wipe_root_cause TEXT
);

CREATE TABLE player_combat_performances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES combat_sessions(id) ON DELETE CASCADE,
    character_id UUID REFERENCES characters(id),
    dps NUMERIC(10, 2) NOT NULL,
    ehps NUMERIC(10, 2) NOT NULL,
    dtpm NUMERIC(10, 2) NOT NULL,
    aps NUMERIC(5, 2) NOT NULL, -- Actions Per Minute
    damage_mitigated_percent NUMERIC(5, 2),
    cleanse_count INT DEFAULT 0,
    death_timestamp TIMESTAMP WITH TIME ZONE,
    time_alive_seconds NUMERIC(8, 2) NOT NULL,
    died_to_ability VARCHAR(64)
);

-- 6. Gamification: Badges & Awards
CREATE TABLE badges (
    id VARCHAR(64) PRIMARY KEY, -- 'DPS_TOP_PERCENTILE', 'MEME_FLOOR_TANK'
    name VARCHAR(64) NOT NULL,
    description TEXT NOT NULL,
    category badge_category_enum NOT NULL,
    icon_url VARCHAR(256) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE character_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
    badge_id VARCHAR(64) REFERENCES badges(id) ON DELETE CASCADE,
    awarded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    session_id UUID REFERENCES combat_sessions(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}'::jsonb -- Stores contextual stats like DPS value
);

-- Performance Indexes
CREATE INDEX idx_characters_user ON characters(user_id);
CREATE INDEX idx_raid_signups_raid ON raid_signups(raid_id);
CREATE INDEX idx_raid_events_start ON raid_events(start_time);
CREATE INDEX idx_player_perf_session ON player_combat_performances(session_id);
CREATE INDEX idx_player_perf_char ON player_combat_performances(character_id);
CREATE INDEX idx_char_badges_char ON character_badges(character_id);
CREATE INDEX idx_combat_sessions_enc ON combat_sessions(encounter_id);
```

---

# 6. Implementation Roadmap & Milestones

```
PHASE 1: Core Stream Protocol & Parser Handshake
┌────────────────────────────────────────────────────────┐
│ • Parser file tailing engine & auth verification       │
│ • Web API streaming WebSocket endpoint                 │
│ • Database baseline schema deployment                  │
└──────────────────────────┬─────────────────────────────┘
                           │
PHASE 2: Roster Management & Scheduler Hub
┌──────────────────────────▼─────────────────────────────┐
│ • Member/Officer portal views                          │
│ • Discord bot slash commands & interactive signups     │
│ • Bidirectional Discord-Web sync                       │
└──────────────────────────┬─────────────────────────────┘
                           │
PHASE 3: Smart Composition & Synergy Engine
┌──────────────────────────▼─────────────────────────────┐
│ • Buff/debuff/utility rule solver                      │
│ • Auto-assign roster optimizer & mechanics canvas      │
└──────────────────────────┬─────────────────────────────┘
                           │
PHASE 4: Awards Engine & Live Dashboard
┌──────────────────────────▼─────────────────────────────┐
│ • Real-time telemetry ingestion and parse percentiles  │
│ • Badge evaluation engine on combat termination        │
│ • Discord trophy webhooks and live pull embeds         │
└──────────────────────────┬─────────────────────────────┘
                           │
PHASE 5: Deep Progression Analytics & Forensics
┌──────────────────────────▼─────────────────────────────┐
│ • Wipe curve visualizations & fail-point forensic trees│
│ • Full platform load testing and production deployment │
└────────────────────────────────────────────────────────┘
```

### Detailed Phase Deliverables

#### Phase 1: Core Stream Protocol & Character Ingestion
* Build the local file tailer in the Windows client. It targets `%USERPROFILE%/Documents/Star Wars - The Old Republic/CombatLogs/`.
* Implement the character handshake: client parses character name and discipline from log initialization headers, displays a 6-digit cryptographic TOTP, and validates it against the Web Portal for instant claiming.
* Deploy the foundational PostgreSQL schema with indexes on log sessions and character links.

#### Phase 2: Raid Hub, Scheduling & Discord Synchronization
* Construct the Next.js/React frontend with Tailwind/Shadcn UI components.
* Build the raid creation modal with customizable composition templates (2T / 2H / 4D for 8-man, 2T / 4H / 10D for 16-man).
* Implement Discord Bot interactions with interactive signup buttons that update the web interface in real time via WebSockets.

#### Phase 3: Smart Composition & Mechanics Engine
* Implement the composition evaluation algorithm with the full SWTOR 7.0+ vulnerability, class buff, and utility matrix.
* Add the officer Drag-and-Drop Roster Builder with real-time synergy score feedback.
* Add encounter mechanic configuration sheets (assigning kick rotations, interrupt chains, and priority mechanics).

#### Phase 4: Progression Engine, Live Stream & Badge Pipeline
* Build the asynchronous badge evaluation engine triggered on the `ENCOUNTER_END` log event.
* Deploy real-time telemetry streaming from the ingestion engine to both the web dashboard and a throttled Discord live embed.
* Implement the automated badge announcement webhook system targeting the guild's `#achievements` channel.

#### Phase 5: Deep Analytics, Forensics & Production Hardening
* Construct historical progression graphs (wipe progression curves, execution percentiles, damage spikes prior to wipes).
* Build the fail-point forensic view aggregating last-second damage taken, unmitigated damage spikes, and missed cleanses.
* Conduct load testing with simulated simultaneous 16-man parses streaming to the ingestion API under full database load. Run end-to-end user acceptance tests with guild officers.