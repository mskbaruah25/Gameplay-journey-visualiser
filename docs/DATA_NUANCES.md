# Data nuances and attention points

The reviewed findings and decisions remain in this document. Supporting notebook and CSV evidence is versioned in the [exploration folder](../rough%20work/README.md). Historical notebook interpretations do not override the accepted decisions recorded here.

Reviewed on **5 November 2026**. This report consolidates the earlier exploration and the executed focused final pass (exploration: [focused_final_pass.ipynb](../rough%20work/notebooks/focused_final_pass.ipynb)).

**This is an evidence report and working decision log, not a list of proven gameplay bugs.** The current-status section records the user's approved handling rules. Historical suggested handling in the detailed sections is superseded wherever it conflicts with those rules. No database migration is performed by documenting a rule.

The original files remain the source of truth. No source files were edited or removed. The original `rough work/notebooks/exp.ipynb` remains separate. The focused pass uses Spark for event-level analysis, PyArrow for source inspection and independent selected-match counts, and small local tables and charts for review.

## Current status after the executive decisions

**The four original concerns are handled for this project. The 17 sections below are a technical evidence register, not 17 unresolved nuances.** This status section supersedes earlier unresolved-policy wording in the historical detail.

- **Seconds accepted:** all 796 recorded match spans were checked; minimum 13 seconds, median 6:22, maximum 14:50. All ten sub-minute recordings contain `BotKilled`. The available playback timelines are practically plausible when interpreted as seconds. Full per-match validation (exploration: [match_seconds_validation.csv](../rough%20work/analysis/focused_final_pass/match_seconds_validation.csv)).
- **Kill credit accepted:** credit kill-labelled rows to the recorded actor ID, whether human or bot. Bot-versus-bot combat is an accepted interpretation. No opponent-ID inference is required for this convention.
- **Repeated loot accepted:** each `Loot` row counts as one looted item, even when visible payloads repeat. The payload-collapse diagnostic is not a production loot-counting policy.
- **Supplied recordings accepted:** plot them as provided, including the 743 one-recorded-ID matches. Additional records are not required for the project to proceed.

**Four of the five additional attention points now have handling decisions. Only repeated combat-row counting remains undecided.**

| Attention point | Specific evidence | Approved handling / current status |
|---|---|---|
| Whole-file content copy | The same 88-row file appears in two date folders | Keep the first copy, from February 10; exclude the later February 11 copy from processed data |
| Repeated combat rows | 34 extra BotKill and two BotKilled payload rows after file-copy exclusion | Counting rule still undecided; explanation and actual examples below |
| Long recording gaps | Up to 518 seconds between positions | Advance directly between distinct recorded timestamps, applying simultaneous rows together; no interpolated positions or real-time wait through gaps |
| Final post-death updates | 105 broader death cases have changed later coordinates | Plot all recorded positions as supplied, including these updates; document the observation and handling in the final project document |
| Folder date versus inferred UTC date | 436 supplied rows fall on the UTC day before the folder date | Put each processed row in its timestamp's date partition and use that date for filters; UTC is the explicit working convention |

These decisions are saved for implementation and the final project/architecture document. Source files remain unchanged in this documentation step. The first-copy rule yields 89,016 processed input rows; it does not remove repeated combat or loot rows within the retained files. Record-level date partitioning can split a file across days. The 436-row finding is a raw-source comparison, not a newly computed post-processing count.

### Repeated combat rows, explained with actual records

This is a different issue from the whole copied file. These repetitions occur inside retained source recordings. A repeated group has the same match, actor ID, map, timestamp, event label, and X/Y/Z coordinates in every row.

For example, the human actor `eaedd8e2-bf74-49f5-9f7c-ceac5586c75d` in Lockdown match `3808ffb2-a392-4792-940e-51552999e7b4.nakama-0` has the following three rows **2 minutes 33 seconds after the first available match record**:

| Source row index (zero-based) | Event | Raw timestamp, treated as seconds | X | Y | Z |
|---|---|---:|---:|---:|---:|
| 29 | BotKill | 1770738102 | 177.263718 | 36.608051 | 83.115425 |
| 30 | BotKill | 1770738102 | 177.263718 | 36.608051 | 83.115425 |
| 31 | BotKill | 1770738102 | 177.263718 | 36.608051 | 83.115425 |

The source fields are exactly equal; coordinates above are rounded only for readability. Two explanations are compatible with these rows: three separate kills recorded in the same second from the same location, or fewer actions whose records were repeated. The data has no target ID or unique action ID that tells those explanations apart. Seconds are the accepted timestamp scale; records within one second need not represent one action.

There are **31 repeated BotKill groups containing 65 rows**. Keeping one row per group would leave 31 and remove 34; that is what **34 extra rows** means. It does not mean 34 total BotKill rows or 34 proven erroneous kills. There are also **two repeated BotKilled groups containing four rows**, hence two rows beyond one per group.

An actual death-label example is human actor `688cb2e4-2215-4b3b-9af1-a6ee71d17636` in match `0954f788-ba35-4227-b6d4-a1172dd87d71.nakama-0`: source row indices 3 and 7 both contain `BotKilled` at `1770739575`, with exactly the same coordinates, 32 seconds after the recording begins. This does not establish two distinct deaths or a respawn. It shows two identical death-labelled records.

Counting every retained row gives 2,410 BotKill and 699 BotKilled rows. Collapsing identical combat payloads would instead give 2,376 and 697. Neither cleanup nor a new combat-counting rule is authorized by the loot-specific decision. Retain the source evidence while that rule is discussed. The full 33-group list is repeated_combat_payloads.csv (exploration: [repeated_combat_payloads.csv](../rough%20work/analysis/focused_final_pass/repeated_combat_payloads.csv)).

Known implementation work—using real image dimensions, decoding bytes, sorting records, choosing event primary keys, and scoping bot IDs by match—is not counted as additional unresolved data uncertainty. Missing optional metadata is not a new project blocker. No gameplay-data cleanup, integration, or schema migration was performed by this decision update.

## What this final pass added

1. It confirmed that the two source files for one journey are **byte-identical 88-row copies**, not different portions of a journey.
2. It measured exactly what remains after excluding that extra file copy: **1,417 repeated payload rows**, including **34 BotKill**, **2 BotKilled**, **1,234 Loot**, and **147 Position** rows beyond the first identical payload.
3. It showed how alternative counting policies change reported metrics and collection-day totals.
4. It inspected the largest movement gaps and apparent jumps against their source records. A **518-unit gap** has endpoints only **7.67 world units apart**; the intervening route and occupancy are unknown.
5. It independently checked all event-label counts in three selected matches. PyArrow/Python and Spark agreed in every comparison.
6. It reproduced the earlier combat investigation while keeping **candidate pairings** separate from **all death moments**.

These results refine known risks. The jump review did not establish a teleport, an impossible speed, or a new coordinate corruption issue.

## Evidence and counting rules

The supplied dataset has **1,243 files**, **89,104 rows**, **796 match IDs**, **1,242 recorded match/user journeys**, and **339 raw actor IDs**. Those actor IDs comprise **245 human UUIDs** and **94 numeric bot IDs**. A number of IDs is not automatically a number of persistent agents or complete lobby participants.

The focused notebook compares three views. These are alternatives, not quantities to add together:

| Diagnostic view | Event rows | Kill-labelled rows | Loot rows |
|---|---:|---:|---:|
| All supplied files and rows | 89,104 | 2,418 | 12,885 |
| One copy per byte-identical file | 89,016 | 2,413 | 12,866 |
| One copy per identical eight-field event payload | 87,599 | 2,379 | 11,632 |

“Kill-labelled rows” means `Kill` plus `BotKill`; repeated combat rows remain a separate counting question. Under the approved project convention, each recorded `Loot` row counts as one item. The file-copy comparison keeps the alphabetically first source path for each hash only to make the comparison reproducible; this does not establish the true collection or gameplay date.

### Structural checks that passed

All files were readable and shared one source schema. The new pass found zero null required fields, NaN/infinite coordinates, unknown map or event labels, unrecognized actor ID formats, filename/record identity disagreements, UTF-8 round-trip failures, missing map configurations, or coordinates outside the documented normalized bounds. Independent counts agreed for all three selected matches.

These structural checks are separate from the executive decisions above. The current handling rules and sole remaining combat-counting question are listed at the top of this report.

## 1. Timestamp values disagree with their declared meaning

**Current project status: handled. Seconds are accepted after checking all 796 recorded match spans.** The original source-type discrepancy is retained below as provenance. Evidence: focused notebook section 5 and the complete per-match validation.

The source Arrow type is `timestamp[ms]`, and the README describes match-context milliseconds. Its integers actually range from `1770681535` to `1771081300`. Reading those integers as Unix seconds puts them near the documented February 2026 collection dates. The median recorded match span is 382 raw units: 382 seconds under that interpretation, but only 0.382 seconds if the declared millisecond unit is used literally.

**Why this matters:** an incorrect conversion changes playback speed and duration by a factor of 1,000. An earliest recorded event is also not a verified real match start.

**Suggested handling:** retain the stored value and declared unit. Keep any inferred seconds-based time as a separate, documented transformation. Use a shared recording baseline per match and describe the duration as recorded coverage. Do not present the producer's intended clock as confirmed.

## 2. Folder date, inferred event date, and collection coverage are different

**Status: verified differences; cause and collection timezone are unknown.** Evidence: sections 4–5 and the README.

Under the seconds interpretation, 436 rows have a UTC date before the day in their folder name. A copied file also occurs in two folders. The folder date therefore cannot simply be treated as a verified event occurrence date. February 14 is explicitly a partial day.

**Why this matters:** a date filter can move records between days depending on interpretation. Fewer events on the final day do not establish a decline in player activity or a design improvement.

**Suggested handling:** preserve source-folder date and inferred event date separately. Document which date drives the UI. Preserve all source-path observations when handling file copies. Do not compare partial-day totals as if collection coverage were equal.

## 3. One entire source recording is copied into two day folders

**Status: confirmed byte-identical file copy.** Evidence: section 2 and file inventory (exploration: [file_inventory.csv](../rough%20work/analysis/focused_final_pass/file_inventory.csv)).

The journey for human `cfa03e9f-81f6-41ef-a0fa-30c7e830f4ed` in match `ac049b28-8116-4ff1-9e60-4be0537b8cc9.nakama-0` has the same filename and SHA-256 in February 10 and February 11. Each copy contains 88 rows.

**Why this matters:** blindly importing both repeats that recording. Choosing the earlier versus later path also changes the collection-day totals. This does not demonstrate that the journey itself continued across two days.

**Suggested handling:** make repeated file content detectable, retain its original paths, and agree a logical-file/import policy. Distinguish file-content repetition from separate event rows. The diagnostic one-copy count is 89,016; it is not silently substituted for the supplied 89,104-row count.

## 4. Event payload repetition remains after that copied file is excluded

**Current project status: repeated loot is handled as one item per row. Whole-file copies and repeated combat labels remain separate attention points.** Evidence: section 4 and policy comparison (exploration: [duplicate_policy_event_counts.csv](../rough%20work/analysis/focused_final_pass/duplicate_policy_event_counts.csv)).

The raw data has 1,360 repeated-payload groups and 1,505 rows beyond the first identical payload. The copied-file contribution of 88 is already included in that 1,505. Excluding only the copied file leaves 1,278 repeated groups and 1,417 extra rows:

| Event | Extra identical payload rows after file-copy exclusion | Largest copies of one payload |
|---|---:|---:|
| Loot | 1,234 | 7 |
| Position | 147 | 2 |
| BotKill | 34 | 3 |
| BotKilled | 2 | 2 |

The remaining repetitions are not all loot and are not explained by the copied file. A target ID, item ID, or action ID might distinguish real same-time actions, but those fields are absent.

**Why this matters:** removing every repeated payload may erase genuine actions; counting every row as a unique real-world action may overstate activity.

**Current handling:** preserve source rows and their provenance. Apply the executive convention of one Loot row per item, including repeated payloads. Decide the whole-file-copy and repeated-combat-row policies separately; do not apply the payload-collapse diagnostic to remove accepted loot items.

## 5. A player, match, timestamp, and event label do not form a unique event key

**Status: confirmed key collisions.** Evidence: section 5.

Even after the copied file is excluded, this candidate key has 1,355 collision groups and 1,503 rows beyond the first. Identical-payload cleanup does not make the key unique either: 87,599 payload-distinct rows still exceed the 87,513 distinct key combinations by 86. Different coordinate payloads can share a key.

**Why this matters:** an upsert or dictionary keyed only this way can overwrite source events. Two equal timestamps do not establish the exact within-timestamp action order.

**Suggested handling:** retain a stable source-content/file identity and original row ordinal, with an appropriate surrogate event ID. Preserve simultaneous records. Do not use Spark partition-dependent numbering as a permanent ingest identity or pretend a deterministic tie-break establishes gameplay causality.

## 6. Three files are not in chronological source-row order

**Status: confirmed ordering irregularity.** Evidence: section 2.

Each of three files has at least one timestamp going backwards relative to the preceding source row.

**Why this matters:** replaying file order can move the clock backwards or place a marker in the wrong sequence.

**Suggested handling:** sort by match, actor, and time for playback while retaining original source order for provenance. Preserve ties without inventing a true cross-player order.

## 7. Numeric bot IDs recur across matches

**Status: confirmed reuse; global bot identity is unknown.** Evidence: section 5.

Eighty-one of the 94 numeric IDs appear in more than one match. IDs `1429` and `1448` each appear in 17 matches. No supplied field establishes whether such IDs represent persistent agents or reusable match entities.

**Why this matters:** joining trajectories across matches on bot ID alone can combine unrelated journeys. “94 bot IDs” does not prove there were exactly 94 globally distinct bots.

**Suggested handling:** identify a recorded participant within its match. Keep source IDs as strings; human UUIDs and numeric bot strings share the column. The source match ID also includes a server suffix and is not itself a bare UUID.

## 8. Event names do not reliably identify human or bot actors

**Current project status: handled by the recorded-actor convention, including bot-versus-bot combat.** The source cross-tab and documentation differences are retained as evidence. Evidence: section 11 and the earlier actor/event table.

Numeric bot IDs have 636 `Position` rows and 115 `Loot` rows. Both `BotKill` and `BotKilled` occur under human and bot IDs. This conflicts with a simple reading of parts of the README.

**Why this matters:** counting or coloring participants by event prefix produces inconsistent classifications. Combat totals based on presumed ownership can imply relationships not present in the source.

**Suggested handling:** classify the recorded actor by the documented ID format, retain the raw event label, and keep any interpretation of the opponent separate. Do not invent a target ID from the event name.

## 9. Recorded actor coverage is not a verified lobby population

**Current project status: handled. Plot the supplied recordings, including the one-recorded-ID matches.** Evidence: sections 5 and 8.

There are 743 match IDs whose rows contain one human ID. This counts identities represented in the files, not an authoritative `total_players = 1` field. Those records can still contain combat and loot labels. The largest recorded match has one human and 15 bots.

**Why this matters:** a replay can only draw the journeys it has. Metrics such as complete-lobby survival or all-participant route coverage need information beyond these records.

**Suggested handling:** describe counts as recorded humans, bots, or participants. Do not assert that an unrecorded opponent did or did not exist. Use the supplied recordings fully without fabricating trajectories.

## 10. Position snapshots have large gaps

**Status: measured sampling gaps; cause is unknown.** Evidence: sections 6–7 and largest gaps (exploration: [largest_position_gaps.csv](../rough%20work/analysis/focused_final_pass/largest_position_gaps.csv)).

The median positive sampling gap is five raw units for both actor types. The maximum is 302 for humans and 518 for bots. There are 1,537 positive intervals longer than the exploratory 15-unit threshold. No different X/Y/Z coordinates were found for one actor at the same timestamp in the movement subset; exact repeated positions can be distinguished from that type of conflict.

In the longest-gap example, bot `1441` in match `92b5d106…` has endpoints only about 7.67 world units apart despite 518 raw time units between them. The missing period does not tell us whether the bot stayed nearby, travelled and returned, or simply had interrupted logging.

**Why this matters:** smooth interpolation across a long gap invents an intervening route. Holding the last position throughout the gap invents occupancy at that location.

**Suggested handling:** display recording gaps and choose a documented rendering policy. Do not treat “no sample” as measured stillness, death, extraction, or zero activity.

## 11. Large displacements are not automatically teleports or impossible speeds

**Status: measured extremes; gameplay validity is unconfirmed.** Evidence: section 7 and apparent speed examples (exploration: [highest_apparent_speeds.csv](../rough%20work/analysis/focused_final_pass/highest_apparent_speeds.csv)).

The largest X/Z displacement is about 63.57 world units over 25 raw time units. The highest apparent speed is about 12.65 world units per raw unit, from a different 63.26-unit displacement over five units. The source records around these examples were inspected.

**Why this matters:** world-distance units, intended clock units, movement modes, and allowed speeds are not established. Labeling a point an error or a teleport based only on a statistical tail would be an unsupported conclusion.

**Suggested handling:** keep these cases reviewable. Apply no corrective snapping, speed cap, or deletion unless a documented gameplay rule justifies it. The focused pass did not confirm a new impossible-movement defect.

## 12. Recorded sample density is not a measured time-spent heatmap

**Status: measurement-definition uncertainty.** Evidence: section 6.

After identical-file and identical-position handling for interval analysis, there are 72,849 distinct positions and 71,607 positive-time intervals. None has exactly unchanged X/Z. This does not prove players never stand still or that stationary logging is suppressed; logging behavior and precision remain unknown.

**Why this matters:** counting points, counting journeys visiting a cell, and estimating time spent are different measurements. Long gaps make naive time weighting especially unreliable. An empty cell does not establish that players ignore playable terrain; no playable-area geometry is supplied.

**Suggested handling:** name heatmaps by their actual measure, such as recorded movement samples or recorded journeys visiting cells. Document any time-estimation or cross-map normalization method separately. Keep human/bot filters and sample coverage visible.

## 13. Native minimap sizes differ from the README

**Status: verified asset discrepancy and required coordinate handling.** Evidence: section 9.

| Map | Actual image size |
|---|---|
| Ambrose Valley | 4320 × 4320 |
| Grand Rift | 2160 × 2158 |
| Lockdown | 9000 × 9000 |

The README says 1024×1024. World X/Z are the horizontal coordinates; Y is elevation. Each map has its own origin and scale, and the image vertical axis must be flipped. All supplied points fit the documented normalized bounds; the README example gives approximately `(78, 890)` on its reference image.

**Why this matters:** hardcoded native pixel dimensions, X/Y plotting, or a missing vertical flip misplaces journeys and heatmaps. Grand Rift is not perfectly square.

**Suggested handling:** retain normalized map coordinates, use rendered width and height separately, preserve elevation, and verify visual alignment. A bounds pass is not a playable-terrain or collision-geometry validation.

## 14. Killer–victim relationships are inferred, not explicitly stored

**Status: missing relationship fields; exploratory associations only.** Evidence: section 10 and the detailed investigation in `rough work/notebooks/exp.ipynb`.

The exact-time, same-match, different-ID query gives 82 candidate pairings across 34 matches. Some simultaneous labels have more than one possible counterpart. A shared timestamp and a movement ending cannot independently prove which actor caused a death.

There are no identified two-human pairings at equal timestamps. The three `Kill` rows and three `Killed` rows each coincide under the same human ID, without a second human ID. This is not treated as evidence of self-kills.

**Suggested handling:** keep candidate evidence and verified source events distinct. Do not present the candidate list as 82 unique verified kills or populate a source-verified opponent relationship from it.

## 15. Position logging after death has two different scopes

**Status: measured follow-ups; explanation remains unresolved.** Evidence: section 10.

**Do not mix these results:**

| Check | Counting unit | Result |
|---|---|---|
| Exact-time distinct-ID paired check | 82 possible pairings, representing 80 distinct death moments | 80 pairings have no later positions; two have final positions exactly at the death location; none has changed victim coordinates afterward |
| All combat death labels, even without a paired opposing ID | 700 distinct actor/match/time/label death moments | 550 have no later positions; 45 have later positions at the death location; 105 have changed coordinates afterward |

The 105 broader cases did not qualify for the paired check; they are not exceptions inside its 82 pairings. Their changed updates extend at most six raw units after the death label and contain at most two distinct later samples. Their median maximum X/Z change is about 0.16 world units; the overall maximum is about 1.65.

**Why this matters:** an unchanged final update is different from a changed one, and both differ from having no later records. None alone proves resurrection, continued live control, a particular networking cause, or an established universal death rule.

**Suggested handling:** retain the observed records and state the scope of every claim. Any animation rule that removes an actor at a death label must be an explicit playback decision, not a claim that all later source records are invalid. Do not introduce tolerances merely to force a hypothesis to pass.

## 16. Missing item, extraction, storm, and match-boundary metadata limits conclusions

**Status: source-information limitations.** Evidence: the eight-column schema and eight-event inventory, section 11.

No item identity, quantity, value, extraction event/outcome, actual storm-front geometry, explicit opponent link, or verified match-start/end marker is provided. The earliest and latest observed events are recording bounds, not confirmed session bounds. No map-version field is supplied either.

**Why this matters:** the project counts one Loot row as one item by executive convention; item identity and value remain absent. A journey ending is not automatically extraction or death, and storm-death points cannot reconstruct the moving storm. Future records using changed map assets would need an explicit configuration/version convention rather than an assumption that the current transform always applies.

**Suggested handling:** calculate only supported metrics, label recording bounds honestly, and retain these limitations in the architecture explanation. Do not draw invented storm fronts or infer extraction success from an event log ending.

## 17. Files and binary labels need explicit parsing

**Status: required handling, not an observed corruption issue.** Evidence: sections 2–3.

Files use `.nakama-0` names but contain valid Parquet. Event names are UTF-8 byte values. All labels decoded and round-tripped without loss in this pass.

**Why this matters:** looking only for `*.parquet` misses the dataset. Comparing decoded strings against undecoded binary values can silently produce empty filters or zero counts.

**Suggested handling:** identify the supplied file format correctly, decode labels consistently, preserve original values and provenance, and surface import failures instead of silently skipping files.

## Follow-through after the decisions

The four original concerns and four of the five additional points now have handling decisions. **Repeated combat-row counting is the only undecided data-handling point from those lists.** The historical sections retain observations even when their handling is settled.

Implementation should follow the accepted seconds, recorded-actor credit, one-Loot-row-per-item, supplied-recordings, first-file-copy, timestamp-step playback, plot-all-positions, and event-date-partition conventions. The final project/architecture document must state the observed nuances and how each was handled, particularly the post-death position updates. Normal engineering work still includes decoding bytes, using actual image dimensions, sorting by time, retaining simultaneous events, using stable event IDs, and scoping numeric bot IDs to matches. These are known requirements, not further unresolved data questions.

## Reproduce and inspect the evidence

Install `rough work/requirements.txt` if needed and run from the project root:

```bash
.venv/bin/python "rough work/scripts/execute_notebook.py" focused_final_pass.ipynb
```

- Executed notebook (exploration: [focused_final_pass.ipynb](../rough%20work/notebooks/focused_final_pass.ipynb)): each check explains what it checks, what it prints, and what it found.
- Machine-readable summary (exploration: [pass_summary.json](../rough%20work/analysis/focused_final_pass/pass_summary.json)): measured counts used in this report.
- File inventory (exploration: [file_inventory.csv](../rough%20work/analysis/focused_final_pass/file_inventory.csv)): source paths, hashes, row counts, schema, and row-order checks.
- Duplicate-policy comparison (exploration: [duplicate_policy_event_counts.csv](../rough%20work/analysis/focused_final_pass/duplicate_policy_event_counts.csv)): event counts under each diagnostic view.
- Repeated combat groups (exploration: [repeated_combat_payloads.csv](../rough%20work/analysis/focused_final_pass/repeated_combat_payloads.csv)): all 33 repeated groups after first-file-copy handling, with counts, source paths, and original row indices.
- Movement gaps (exploration: [largest_position_gaps.csv](../rough%20work/analysis/focused_final_pass/largest_position_gaps.csv)) and apparent speeds (exploration: [highest_apparent_speeds.csv](../rough%20work/analysis/focused_final_pass/highest_apparent_speeds.csv)): ranked review candidates.
- Sampling-gap distribution (exploration: [sampling_gap_histogram.csv](../rough%20work/analysis/focused_final_pass/sampling_gap_histogram.csv)): the aggregate counts behind the notebook's gap chart.
- Independent match checks (exploration: [representative_match_checks.csv](../rough%20work/analysis/focused_final_pass/representative_match_checks.csv)): Spark versus PyArrow/Python counts for all event labels in three selected matches.
- Largest post-death coordinate changes (exploration: [largest_post_death_coordinate_changes.csv](../rough%20work/analysis/focused_final_pass/largest_post_death_coordinate_changes.csv)): a review sample from the broader 105 cases.
- [Earlier audit](DATA_AUDIT.md): historical checks and detailed combat query results.

**Final status:** the focused pass completed without execution errors and the independent match counts agreed. No source cleanup, schema migration, live data integration, or production rendering policy was applied by this pass.
