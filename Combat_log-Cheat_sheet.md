# SWTOR Combat Log Specification & Parser Cheat Sheet

This cheat sheet is a complete technical reference for the raw combat log file format in *Star Wars: The Old Republic*. It details file mechanics, line grammar, token anatomy, mitigation flags, event types, and parser edge cases.

---

# 1. File Mechanics & OS Specifications

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ FILE SYSTEM METADATA                                                                             │
├───────────────────┬──────────────────────────────────────────────────────────────────────────────┤
│ Default Path      │ %USERPROFILE%\Documents\Star Wars - The Old Republic\CombatLogs\             │
│ File Name Pattern │ combat_YYYY-MM-DD_HHMMSS_xxxxxx.txt                                          │
│ Encoding          │ UTF-8 (without BOM) or ANSI / ASCII (platform-dependent)                     │
│ Line Terminators  │ Windows CRLF (\r\n)                                                          │
│ Rotation Policy   │ A new file is created on game startup, zone transition, or UI reload (/reloadui)│
│ File Locking      │ Game holds an active write lock. Parsers must open with FileShare.ReadWrite  │
└───────────────────┴──────────────────────────────────────────────────────────────────────────────┘
```

---

# 2. Universal Line Anatomy & Token Grammar

Every combat log line contains **7 standard positional fields** delimited by brackets `[...]` and parentheses `(...)`.

```
[Timestamp] [Source] [Target] [Ability] [Event Type / Action] (Value / Mitigation / Threat)
```

```
[04:12.180] [@DarthTank] [Stim Probe {2876541461594112}:1048578] [Retaliation {804291884029440}] [Event::Damage {836045448945476}: Kinetic {836045448945500}] (14250* kinetic <3200 absorbed> {836045448940300} (28500 threat))
 └───┬───┘   └───┬────┘  └───────────────────┬──────────────────┘ └──────────────┬───────────────┘ └────────────────────────┬───────────────────────┘ └───────────────────────────────┬──────────────────────────────┘
     │           │                           │                                   │                                          │                                                           │
 (1) Time    (2) Source                 (3) Target                          (4) Ability                                (5) Event Type                                              (6) Value & Mitigation Details
```

### Regular Expression for Line Tokenization
```regex
^\[(?<timestamp>[^\]]+)\]\s+\[(?<source>[^\]]*)\]\s+\[(?<target>[^\]]*)\]\s+\[(?<ability>[^\]]*)\]\s+\[(?<event>[^\]]+)\]\s+\((?<details>.*)\)$
```

---

# 3. Field 1 to 4: Entity & Ability Token Syntax

## Fields 2 & 3: Source and Target Formats

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ ENTITY TOKEN STRUCTURES                                                                          │
├─────────────────────┬────────────────────────────────────────────┬───────────────────────────────┤
│ Entity Type         │ Raw Log Pattern                            │ Example                       │
├─────────────────────┼────────────────────────────────────────────┼───────────────────────────────┤
│ Player Character    │ [@CharacterName] or [@CharacterName#GUID]  │ [@DarthTank]                  │
│ Companion           │ [CompanionName {TypeID}:InstanceID]        │ [Lana Beniko {803456...}:104] │
│ Boss / Add / NPC    │ [NPC Name {TypeID}:InstanceID]             │ [Apex Vanguard {2876...}:101] │
│ Environment / World │ [] or [Unknown] or [#world]                │ []                            │
└─────────────────────┴────────────────────────────────────────────┴───────────────────────────────┘
```

* **`TypeID` (inside `{...}`):** Static global database archetype ID. Shared by all instances of that mob type.
* **`InstanceID` (after the `:`):** Unique runtime spawn GUID. Differentiates separate mobs sharing the same name.

---

## Field 4: Ability Token Format
```text
[Ability Name {Ability_ID}]
```
* Examples: `[Retaliation {804291884029440}]`, `[Kolto Injection {804893179412480}]`, `[Basic Attack {802914178301952}]`.
* If the event is passive, environmental, or an intrinsic proc, the ability name may be empty: `[]` or match the sub-effect name.

---

# 4. Field 5: Core Event Types Reference (`Event::*`)

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ EVENT TYPE CLASSIFICATIONS                                                                       │
├──────────────────────────┬───────────────────────────────────────────────────────────────────────┤
│ Event Token Identifier   │ Description & Purpose                                                 │
├──────────────────────────┼───────────────────────────────────────────────────────────────────────┤
│ Event::Damage            │ Direct damage, DoT tick, reflect, or environmental damage packet.     │
│ Event::Heal              │ Direct heal, HoT tick, or passive health regeneration packet.         │
│ Event::ApplyEffect       │ Buff or Debuff applied to target (DCDs, DoTs, Shields, Vulnerabilities)│
│ Event::RemoveEffect      │ Buff or Debuff expired, cancelled, purged, or cleansed.               │
│ Event::SpendResource     │ Class energy resource consumed (Heat, Energy, Rage, Force).           │
│ Event::RestoreResource   │ Class energy resource restored via passive or active abilities.       │
│ Event::Death             │ Entity health reached 0 and died.                                     │
│ Event::Revive            │ Entity was resurrected (Combat Rez, Medical Probe, Respawn).          │
│ Event::Interrupt         │ An active ability cast or channel was successfully interrupted.       │
│ Event::AbilityActivate   │ Player pressed an ability (instant execution or cast start).          │
└──────────────────────────┴───────────────────────────────────────────────────────────────────────┘
```

---

# 5. Field 6: Value, Mitigation, Threat & Flag Syntax

The details parentheses `(...)` hold numerical amounts, damage types, mitigation rolls, and threat.

```
( [Value][*] [Damage/Heal Type] <[Mitigation Value] [Mitigation Type]> {[Effect ID]} ([Threat Value] threat) )
```

---

## 5.1 Value Modifiers & Critical Strikes

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ NUMERICAL VALUE MODIFIERS                                                                        │
├───────────────────┬───────────────────────────┬──────────────────────────────────────────────────┤
│ Indicator         │ Raw Log Example           │ Meaning                                          │
├───────────────────┼───────────────────────────┼──────────────────────────────────────────────────┤
│ Standard Hit      │ (14250 kinetic ...)       │ Non-critical damage or heal.                     │
│ Critical Strike   │ (28500* kinetic ...)      │ Asterisk (*) marks a critical hit / critical heal│
│ Zero Value Hit    │ (0 energy <deflected> ...)│ Attack fully avoided or immune.                  │
│ Overhealing       │ (4200* ~1800 heal ...)    │ Total heal 4200 (1800 was wasted overheal).      │
└───────────────────┴───────────────────────────┴──────────────────────────────────────────────────┘
```

---

## 5.2 Mitigation Flags (Angle Brackets `<...>`)

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ MITIGATION & DEFENSE TAXONOMY                                                                    │
├───────────────────┬───────────────────────────┬──────────────────────────────────────────────────┤
│ Defense Type      │ Raw Log Example           │ Mechanics Explanation                            │
├───────────────────┼───────────────────────────┼──────────────────────────────────────────────────┤
│ Absorbed (Shield) │ <3200 absorbed>           │ Mitigated by static shield (Force Armor, Bubble).│
│ Shielded (Stat)   │ <4500 shielded>           │ Tank rolled a successful Shield Chance check.    │
│ Deflected         │ <deflected>               │ Ranged attack defended by defense chance roll.   │
│ Parried           │ <parried>                 │ Melee attack parried by defense chance roll.     │
│ Dodged            │ <dodged>                  │ Melee/Ranged attack dodged by defense roll.      │
│ Resisted          │ <resisted>                │ Force/Tech attack resisted (100% Force/Tech DR). │
│ Missed            │ <missed>                  │ Attacker failed accuracy check (< 100% Accuracy).│
│ Immune            │ <immune>                  │ Target is invulnerable to this damage profile.   │
│ Cover Avoidance   │ <covered>                 │ Damage avoided via natural/portable cover stance.│
└───────────────────┴───────────────────────────┴──────────────────────────────────────────────────┘
```

---

## 5.3 Damage Types

* **`kinetic`**: Physical damage; mitigated by Armor Rating and Shield rolls.
* **`energy`**: Energy damage; mitigated by Armor Rating and Shield rolls.
* **`internal`**: Internal damage; **bypasses Armor Rating**, mitigated by internal DR.
* **`elemental`**: Elemental damage; **bypasses Armor Rating**, mitigated by elemental DR.

---

# 6. Concrete Raw Log Line Reference Examples

### Direct Critical Melee Damage (with Threat)
```text
[21:04:12.180] [@DarthTank] [Apex Vanguard {2876541461594112}:101] [Retaliation {804291884029440}] [Event::Damage {836045448945476}: Kinetic {836045448945500}] (18450* kinetic (36900 threat))
```

### Partially Absorbed Damage (Static Shield Active)
```text
[21:04:14.320] [Apex Vanguard {2876541461594112}:101] [@DarthTank] [Acid Wave {809452145678900}] [Event::Damage {836045448945476}: Energy {836045448945500}] (24500 energy <12000 absorbed> (24500 threat))
```

### Fully Defended / Dodged Attack
```text
[21:04:16.100] [Stim Probe {2876541461594112}:1048578] [@DarthTank] [Slash {802914178301952}] [Event::Damage {836045448945476}: Kinetic {836045448945500}] (0 kinetic <dodged> (0 threat))
```

### Direct Critical Heal with Overheal
```text
[21:04:18.450] [@DocHealer] [@DarthTank] [Kolto Injection {804893179412480}] [Event::Heal {836045448945477}: Heal {836045448945501}] (32000* ~8500 heal (11750 threat))
```
* *Effective Heal:* $32,000 - 8,500 = 23,500$. Overhealing was $8,500$.

### Defensive Cooldown Buff Application
```text
[21:04:20.000] [@DarthTank] [@DarthTank] [Saber Ward {804123456789012}] [Event::ApplyEffect {836045448945472}: Saber Ward {804123456789012}] ()
```

### Debuff Cleanse / Removal
```text
[21:04:22.150] [@DocHealer] [@DarthTank] [Toxin Scan {804987654321000}] [Event::RemoveEffect {836045448945473}: Acid Burn {809112233445566}] ()
```

### Resource Consumption (Rage / Energy / Heat / Force)
```text
[21:04:24.010] [@DarthTank] [@DarthTank] [Smash {804334455667788}] [Event::SpendResource {836045448945478}: Rage {836045448945502}] (3 rage)
```

### Spell Interrupt
```text
[21:04:26.500] [@VornSniper] [Scyva {281474976710656}:201] [Distraction {808123456789000}] [Event::Interrupt {836045448945482}: Ignite Protocol {809778899001122}] ()
```

### Player Death
```text
[21:04:30.800] [Apex Vanguard {2876541461594112}:101] [@DarthTank] [] [Event::Death {836045448945480}: Death] ()
```

---

# 7. Combat State & Session Delimiters

SWTOR combat logs do not have explicit `<start>` or `<end>` XML tags. State changes must be inferred deterministically:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ COMBAT LIFECYCLE DETECTION RULES                                                                 │
├─────────────────────┬────────────────────────────────────────────────────────────────────────────┤
│ Lifecycle State     │ Parser Trigger Condition                                                   │
├─────────────────────┼────────────────────────────────────────────────────────────────────────────┤
│ Combat Start (Pull) │ First non-zero damage/heal event between a raid player and an NPC.        │
│                     │ Reset sliding timers and set encounter_state = 'IN_COMBAT'.                │
├─────────────────────┼────────────────────────────────────────────────────────────────────────────┤
│ Combat End (Wipe)   │ All logged raid members have received Event::Death OR zero hostile events  │
│                     │ occur for >= 6.0 continuous seconds.                                       │
├─────────────────────┼────────────────────────────────────────────────────────────────────────────┤
│ Combat End (Kill)   │ Encounter target boss NPC receives Event::Death OR boss reaches 0.0% HP    │
│                     │ and switches to friendly/cutscene NPC state.                               │
├─────────────────────┼────────────────────────────────────────────────────────────────────────────┤
│ Area Transition     │ File tail stream halts, or encounter Zone ID / Player Sub-Zone ID changes. │
└─────────────────────┴────────────────────────────────────────────────────────────────────────────┘
```

---

# 8. Parser Edge Cases & Implementation Gotchas

1. **System Time vs UTC Drift:**
   * Log timestamps use the local client machine clock: `[HH:MM:SS.mmm]` or `[MM/DD/YYYY HH:MM:SS.mmm]`.
   * *Solution:* Have the parser normalize local timestamps to UTC ISO-8601 strings upon streaming to the API.
2. **Asynchronous Multi-Threaded File Access:**
   * The SWTOR game engine flushes buffers to disk periodically.
   * *Solution:* The file tailer must open the log with read/write sharing permissions and read line-by-line without waiting for an EOF marker.
3. **Empty Brackets `[]`:**
   * Environmental effects, fall damage, world fatigue, and certain passive procs omit Source or Ability names.
   * *Solution:* Regex patterns must allow empty bracket capture groups: `\[(?<ability>[^\]]*)\]`.
4. **Negative Threat Values:**
   * Threat drops (e.g., *Force Camouflage*, *Threat Dump*, *Cloud Mind*) generate negative values: `(-15000 threat)`.
   * *Solution:* Parser threat casting must support signed 64-bit integers (`int64`).
5. **Overkill & Negative Health:**
   * Damage packets often exceed remaining health. The log does not clamp to zero.
   * *Solution:* Maintain an in-memory entity HP state tracker to compute true overkill damage percentages.