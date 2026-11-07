# Data Analysis and Gameplay Insights

Before we follow a player across the map, let’s understand the records behind that journey. We began by checking what the files could tell us, tested a few explanations, and used the results to shape the tool.

## 1. The Data Analysis

We worked through two notebooks:

1. **[Initial exploration — exp.ipynb](rough%20work/notebooks/exp.ipynb):** schema, coverage, event counts, timestamps, movement, map alignment, and the killer–victim investigation.
2. **[Focused final pass](rough%20work/notebooks/focused_final_pass.ipynb):** a separate check of copied files, repeated rows, event identity, sampling gaps, and the earlier combat findings. Independent counters also checked three representative matches.

All **1,243 files** were readable Parquet, despite their `.nakama-0` names. We decoded the byte-valued event labels and checked the expected fields. The source contained **89,104 rows across 796 matches and 1,242 recorded journeys**. Keeping one copy of an identical file leaves **89,016 events** for the application.

Saved notebook outputs retain their original counting scope. February 14 is a partial collection day; daily totals do not establish a change in player activity.

## 2. Data Nuances

These nuances mattered because each could change what a designer sees or concludes.

| Data nuance | What we checked and decided |
| --- | --- |
| **The timestamp label and values disagree.** | We tested the integers as seconds across all 796 matches. Recorded spans were 13–890 seconds, with a median of 6:22. We accepted seconds and UTC event dates. **436 source rows** differ from their folder’s date, so folder names remain provenance, not the filtering rule. |
| **A copied file and repeated event rows are different problems.** | Hashes confirmed one identical **88-row file** in two folders. After excluding its later copy, **1,417 extra identical-payload rows** remain. We preserve those rows: each Loot row counts as one item; repeated combat still has no verified unique-incident interpretation. |
| **The apparent event key is not unique.** | Even after file-copy exclusion, match/actor/time/label has **1,355 collision groups**. We use file identity and original row number for event IDs, preserving simultaneous records. |
| **Recorded coverage is incomplete, and IDs need context.** | **743 matches have one recorded human**, while **81 numeric bot IDs recur across matches**. Bots also have Position and Loot labels. We classify actors by ID format, scope identities to matches, and display the supplied recordings without inventing missing participants. |
| **Missing samples do not reveal the route between them.** | Position gaps have a median of five seconds but reach **518 seconds**. We advance between recorded timestamps, break trails across gaps over 15 seconds, and measure traffic as sample counts. |
| **The supplied minimaps are not all 1024×1024.** | We checked actual dimensions and plotted transformed positions. The tool uses world X/Z, each map’s origin/scale, a vertical flip, and the actual image aspect ratio. Y stays as elevation. |

The [data nuances report](docs/DATA_NUANCES.md) retains the detailed checks and counting scopes.

## 3. Kill Attribution Experiments

We wanted to connect a kill marker to a victim’s journey. That would help us follow an encounter, but the source provides no explicit opponent ID. We therefore treated the idea as a hypothesis.

1. **Start with proximity.** We compared recent positions near kill labels and looked for another actor whose movement ended. A selective check found **52 observations across 28 matches**, supported by same-time death labels. Some observations had multiple candidates; proximity alone also produced counterexamples.
2. **Allow for ranged attacks.** We removed the distance condition and matched different IDs in the same match at exactly the same timestamp. Requiring no later victim positions produced **80 candidate pairs**.
3. **Check what that condition excluded.** Testing all same-time pairs first produced **82 candidates across 34 matches**. Eighty had no later victim positions; two had final updates at exactly the death location. None had changed coordinates afterward within this subset. These remain candidates, not 82 verified kills.
4. **Widen the check.** Across **700 distinct combat-death moments**, **105 had changed positions afterward**. **These 105 cases are outside the paired subset.** We also found no same-time pairing identifying two different human IDs; the three Kill/Killed coincidences belong to the same actor, without establishing self-kills.

**Our decision:** credit kill labels to their recorded actor, preserve the original labels, and leave opponents unidentified. Retain post-death positions unchanged; their cause is unverified. The inspector shows the recorded actor and supporting details.

The [experimental SQL](rough%20work/queries/) and notebook outputs preserve how we reached that decision.

## 4. System Design Decisions

We could now build around what the records support:

- **Storage and ETL:** keep originals and source/import history. Version the handling rules, make reruns repeatable, and publish affected-match rebuilds together when new recordings arrive.
- **Database:** separate files, matches, participants, and events. Stable event IDs preserve repetitions; participant identity stays within its match.
- **Playback:** sort timestamp groups, apply simultaneous records together, and retain observed positions. Human/bot markers, participant controls, and event inspection make individual journeys reviewable.
- **Overview:** count retained labels and position samples. Heatmaps show recorded density; they do not claim occupancy, complete lobby coverage, or extraction success.

The [architecture document](ARCHITECTURE.md) follows this flow from ingestion to the browser.

## 5. Gameplay Insights

Now that our interpretation is explicit, we can look for patterns a level designer can investigate. The observations below use the retained-file policy. **Suggested actions are experiments to try; their effects have not been measured.**

### 1. Recurring Human Traffic in Ambrose Valley

- **What we found:** in Ambrose Valley, notebook grid cell **(16,17)** contains samples from **109 human journeys across 109 matches**, out of 554 recorded human journeys. Its world bounds are approximately **X 80–108, Z −79 to −51**. This is repeat visitation across recordings, which makes the area worth reviewing.
- **Why a designer should care:** the highest-sample cell is elsewhere, **(11,27)**: 693 samples from 96 journeys. Sample brightness and the number of journeys reaching an area answer different questions.
- **What we could test:** inspect cover, sightlines, and approaches around this area. If playback confirms a problematic convergence, trial a layout change. Track **journey visit share** and **nearby combat-label counts per visiting journey**.

These are zero-based cells on the notebook’s **32×32 grid**, not the interface’s letter/number grid. They do not establish a chokepoint or show that unrecorded terrain is unused.

### 2. Storm Death Timing

- **What we found:** all **39 storm-death labels**, across 39 matches, occur **10:55–14:47 after the first available match record**. The median is **12:19**; 27 occur at or after 12 minutes.
- **Why a designer should care:** this gives us a concrete period to inspect for route pressure, long detours, or unclear navigation.
- **What we could test:** replay the final approach to these locations, then trial clearer route cues where a problem is confirmed. Track **storm-death labels per recorded human journey**, split by map and observed time.

Our clock starts at the first supplied record, not a verified match start. The data does not reveal the storm boundary or extraction outcomes, so this does not establish a storm schedule or an extraction-failure rate.

### 3. Loot Concentration in the Example Match

- **What we found:** open **Ambrose Valley → 12 Feb 2026**, search `fbbc5d02`, and select **Match 114 · 1 human · 15 bots**. All seven Loot rows belong to **Bot 1429**. Six occur at **01:30–01:54**, within **X −55 to −40, Z −360 to −350**.
- **Why a designer should care:** this pickup activity falls inside Ambrose Valley’s highest-sample human traffic cell from the first observation. We can inspect how the recorded loot sequence relates spatially to a frequently traversed area.
- **What we could test:** compare Loot pickups and Player traffic, then check other recordings and the actual loot configuration before changing placement or nearby cover. Track **distinct looting journeys per cell**, **Loot rows per journey**, and **nearby combat labels**.

This is one recording, not a map-wide loot-balance conclusion. Repeated pickups do not identify spawn points or item value, and spatial overlap does not establish causation.

## 6. Evidence and Reproducibility

The traffic analysis follows section 13 of the initial notebook. For this write-up, we also [recomputed the three observations](rough%20work/scripts/build_insight_evidence.py) against the retained source files and checked event totals against the focused pass.

Supporting tables: [traffic cells](rough%20work/analysis/submission_insights/traffic_cells.csv), [storm-death times](rough%20work/analysis/submission_insights/storm_deaths.csv), [example loot sequence](rough%20work/analysis/submission_insights/example_loot.csv), and [calculation summary](rough%20work/analysis/submission_insights/summary.json).
