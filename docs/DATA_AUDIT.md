# Supplied data review

The findings in this document remain part of the project documentation. Supporting notebooks, experimental SQL, and exported investigation tables are versioned in the [exploration folder](../rough%20work/README.md). Backup files, rough drafts, and verbose execution output remain local.

The consolidated attention-point report is [DATA_NUANCES.md](DATA_NUANCES.md). A separate executed focused final pass (exploration: [focused_final_pass.ipynb](../rough%20work/notebooks/focused_final_pass.ipynb)), completed on 5 November 2026, documents its checks, labelled outputs, and findings. The historical investigation below is retained so that earlier counts and scope changes remain traceable.

**Current project status, 5 November 2026:** the user has closed the four original concerns through explicit working decisions. Seconds are accepted after checking all 796 recorded match spans; kill credit follows the recorded actor, including bot-versus-bot cases; each Loot row counts as one item even when rows repeat; all supplied recordings are plotted as provided. Four additional handling decisions are now saved: keep the first whole-file copy, advance playback between recorded timestamps, plot final post-death position updates unchanged, and partition/filter rows by timestamp date (UTC working convention). Only repeated combat-row counting remains undecided. Earlier investigation text below is historical evidence, not a reopening of those decisions. Current rules and actual repeated-combat examples are in `PRODUCT_BRIEF.md` and at the top of `DATA_NUANCES.md`. Source files were not rewritten by this documentation update.

Reviewed on 3 November 2026 to confirm the playback requirement and whether the supplied data supports it. This is an inspection report, not implementation or a set of game-design insights.

## Materials inspected

- Original assignment in Downloads, retained DOCX, and full extracted assignment text. Original and retained files have the same SHA-256: `0e7e353f288b6ab79d3646787ec6fa6d2a2fe4ea1872f8ed5ff85632f52a40ed`.
- Full `player_data/README.md`.
- All 1,243 files in the five collection-day folders, read as Parquet, with all rows loaded. No read failures.
- Dimensions and formats of all three supplied minimaps.
- Project reference files, dependency list, ignore file, and the empty experimental notebook.

## Requirement conclusion

The assignment's core requirements explicitly include: “Timeline/playback to watch a match unfold over time”. Its submission checklist also says: “Timeline or playback shows match progression”. Therefore a time-based match exploration feature is required. A scrubber meets the timeline aspect; play/pause is the recommended simple playback experience. Playback speeds and sophisticated replay controls are optional design choices.

The README explains that files sharing a `match_id` can be combined and ordered by `ts`. The supplied data supports a two-dimensional replay of recorded participant positions and events on the minimap. It does not justify claiming a complete reconstruction of every participant's match.

## Verified dataset counts

| Measure | Observed value |
| --- | ---: |
| Parquet files | 1,243 |
| Event rows | 89,104 |
| Distinct match IDs | 796 |
| Distinct participant IDs, including numeric bot IDs | 339 |
| Matches with one recorded participant | 743 |
| Matches with multiple recorded participants | 53 |
| Largest recorded participant count in a match | 16 |
| Match IDs represented in two day folders | 1 |
| Match IDs represented on multiple maps | 0 |
| Files whose timestamps need sorting | 3 |

All files share the documented eight-column schema, with no null values observed in those fields. Counts describe the supplied recordings, not complete lobbies. Participant IDs, especially bot IDs, should not automatically be treated as globally distinct people or persistent agents.

## Events in the 743 matches with one recorded participant

A direct Spark join of the event rows to matches with exactly one distinct `user_id` confirms that all 743 contain one recorded human ID and no separate bot-ID recording. They contain 62,993 event rows across 238 distinct human IDs. A single recorded actor does not imply the absence of combat labels: the event schema records one actor ID per row and has no explicit opposing-participant ID.

| Event label | Rows in these matches | Matches containing the label |
| --- | ---: | ---: |
| Position | 48,256 | 743 |
| Loot | 12,194 | 692 |
| BotKill | 2,119 | 556 |
| BotKilled | 379 | 378 |
| Kill | 3 | 3 |
| Killed | 3 | 3 |
| KilledByStorm | 39 | 39 |

In total, 556 of these matches have `Kill` or `BotKill` rows, and 692 have `Loot` rows. For example, `b3550292-8f80-493a-a422-95c4e70f0a5e.nakama-0` contains one recorded human ID, 136 `Position` rows, 38 `BotKill` rows, and 43 `Loot` rows. These are supplied label counts, without inferring additional participants or deduplicating gameplay incidents. This analysis is retained in the notebook immediately after the match-coverage tables.

## Timing ambiguity

The stored Arrow type is `timestamp[ms]`, but its raw integer values range from `1770681535` to `1771081300`. Interpreting those values as Unix seconds gives dates around the documented collection period. The median positive interval between movement samples for the same participant in the same match is 5 raw units; the median observed match span is 382 raw units, with a maximum of 890.

These observations strongly suggest seconds-valued timestamps stored under a millisecond schema, rather than the match-relative milliseconds described in the README. This is a data interpretation to document explicitly, not silently treat as settled source documentation. Validate this interpretation when building playback. A naive millisecond conversion would make a typical recorded match span only 0.382 seconds.

When interpreted as Unix seconds in UTC, 436 event dates fall on the day before their collection folder. The cause and collection timezone are unverified. Preserve collection folders for the initial date filter; do not silently replace their dates with inferred event dates.

Use a shared match time baseline across its available recordings and sort before replaying. Label the time as relative to the recording if the actual match start is unknown. Do not invent movement across large sampling gaps or keep absent participants visible indefinitely.

## Event attribution ambiguity

Actor type here is classified by participant ID shape, following the README's numeric-bot / UUID-human rule. Observed event counts include:

| Event | Numeric IDs | UUID IDs |
| --- | ---: | ---: |
| Position | 636 | 50,711 |
| BotPosition | 21,712 | 0 |
| BotKill | 183 | 2,232 |
| BotKilled | 297 | 403 |
| Loot | 115 | 12,770 |
| Kill | 0 | 3 |
| Killed | 0 | 3 |
| KilledByStorm | 0 | 39 |

Bot-related combat events occur under both actor types. Numeric IDs also have some `Position` and `Loot` records. Do not infer participant identity solely from the event name or silently rely on the README's conflicting combat descriptions when deriving kill/death counts.

The notebook's explicit metric summary counts 73,059 movement samples (`Position` plus `BotPosition`), 2,418 kill-labelled rows (`Kill` plus `BotKill`), and 12,885 loot-event rows. Loot rows split into 12,770 under human IDs and 115 under bot IDs. Movement samples split into 50,711 under human IDs and 22,348 under bot IDs. Consecutive movement samples form 71,817 within-journey intervals, of which 71,607 have a positive time difference and 210 share a timestamp. The dataset does not record physical footsteps.

Under the README's human-event interpretation only, 403 human-ID `BotKilled` rows are a proxy for humans killed by bots, and 2,232 human-ID `BotKill` rows are a proxy for bots killed by humans. These are not verified distinct victims or unique combat incidents. The 297 bot-ID `BotKilled` rows and 183 bot-ID `BotKill` rows are shown separately and must not be added to those proxies without resolving attribution and overlap. All these metrics retain repeated source payloads.

## Actual minimap dimensions

| Map image | Actual dimensions |
| --- | --- |
| AmbroseValley_Minimap.png | 4320 × 4320 |
| GrandRift_Minimap.png | 2160 × 2158 |
| Lockdown_Minimap.jpg | 9000 × 9000 |

These differ from the README's statement that the images are 1024 × 1024. Use normalized map coordinates and the rendered image dimensions, preserving the documented X/Z mapping and vertical flip. Do not hardcode the native image dimensions to 1024.

## Reproducible Spark exploration

`rough work/notebooks/exp.ipynb` contains an exploration of every source file, with a separate focused follow-up in `rough work/notebooks/focused_final_pass.ipynb`. The rewritten analysis uses ordinary Spark DataFrame operations for aggregation, joins, window functions, candidate-key checks, and spatial binning. Each cell asks one question and names its intermediate results; there are no custom query/display wrappers. PyArrow inspects file metadata and original timestamp order; bounded summaries and plotting samples are collected locally. Rerun with the project's `.venv` IDE kernel or `.venv/bin/python "rough work/scripts/execute_notebook.py"` from the project root. The notebook retains raw values, documents interpretation assumptions, and separates selected-match paths from its recorded-event timeline. It leaves Spark available for further IDE queries; an optional final line stops the session. It creates no production database.

Additional observed findings from that run:

- The 1,243 files contain 1,242 distinct `(match_id, user_id)` journeys: one human journey has two files across two collection days. Model source files separately from journeys.
- The 339 raw participant IDs comprise 245 UUID human IDs and 94 numeric bot IDs. Of the numeric IDs, 81 occur across multiple matches. An interval self-join found no overlapping recorded intervals for the same raw ID; this does not prove global bot identity.
- Grouping by all eight source payload fields gives 1,360 repeated-payload groups and 1,505 rows beyond the first identical payload. Of these groups, 85 occur across source files. Identical loot records could represent separate pickups without distinguishing item metadata; no deduplication was performed or justified solely by these counts.
- `(match_id, user_id, raw_ts, event)` has 1,437 collision groups and 1,591 rows beyond the first. It is not a valid unique event key. Stable source-file identity plus original row ordinal and a surrogate event key are proposed for future ingestion.
- Each of the three `Kill` rows has a `Killed` row under the same recorded actor at the same raw time and coordinates. This further limits confident combat attribution.
- There are 175 movement rows on 172 human journeys after a first death-labelled event, using `Killed`, `BotKilled`, and `KilledByStorm` as diagnostic labels. This is not proof of respawning or a validated terminal-state model.
- No out-of-bounds normalized coordinates, nonfinite coordinates, unknown actor ID formats, unknown event labels, or filename/record identity disagreements were found.
- Source Parquet files total 8,371,211 bytes and each contains one row group. The mean file size is about 6.7 KB. Consider compact serving assets; this scale does not itself establish a need for a production Spark cluster.

## Proximity and recording-end check, 5 November 2026

The user proposed inferring a victim by finding other participants close to a kill event whose movement stops afterward. This was tested in Spark across all 53 matches with multiple recorded IDs. The notebook retains the calculations, threshold sensitivity, full example records, and counterexamples.

These matches contain 296 source `BotKill` rows across 49 matches. Grouping identical actor/time/location payloads gives 285 observations; grouping only match/actor/time/label gives 284 groups. No plain `Kill` rows occur in these matches. Counts below describe observations, not verified distinct combat incidents.

The main test uses each participant's latest recorded movement position at or before the kill, no older than 10 raw timestamp units, within 25 X/Z world units of the event. Future positions are not used to establish proximity. Distances are not assumed to be metres; the seconds-valued time interpretation remains an assumption. Elevation differences are retained. A sensitivity table varies lookback from 5 to 20 raw units and radius from 5 to 50 world units.

- 111 kill observations have another recorded participant nearby, and 108 also have the event actor's own recent position nearby.
- 54 have a nearby participant with no later movement. Allowing a final sample up to five raw units afterward increases this to 58.
- Requiring both participants near the kill, no later candidate movement, continued event-actor movement, and at least 30 raw units of remaining match recording gives 52 observations across 28 matches.
- Every one of those 52 has at least one nearby candidate with a `Killed` or `BotKilled` label at the exact same raw timestamp. There are 49 observations with one such supported candidate and three with two. This provides strong candidate associations in some cases while preserving unresolved alternatives.
- Nearby participants sometimes continue moving: one candidate only about 2.56 world units from a kill location has movement continuing 595 raw units later. Proximity alone cannot identify a victim.

Concrete example: match `17aed7ff-ffdb-44eb-acf3-0e8d163b5123.nakama-0`, human `b3340cc5-c9fa-4108-b56d-0728bc978a22`, and bot `1428`. At raw timestamp `1770898512`, the human has `Position` and `BotKill`, and the bot has `BotPosition` and `BotKilled`. Their recorded positions are about 2.58 X/Z world units apart, and the kill/death event locations about 0.61 units apart. Bot `1428` has no later record. The human loots six raw units later, moves 15 units later, and has movement up to 186 units later; the overall recording continues 548 units beyond the event. The evidence strongly supports the human killing bot `1428`; the source schema still does not explicitly encode that relationship.

Any inferred association must retain its method, thresholds, supporting records, and uncertainty. Do not replace original labels or populate a verified killer/victim relationship solely from a recording ending. Candidate death labels, multiple nearby participants, recording endpoints, sampling gaps, extraction, and potentially repeated event payloads must be considered.

## Exact-timestamp query without proximity, 5 November 2026

The user requested an additional query with no distance requirement, to allow ranged combat. Its rules are: different user IDs in the same match; a `Kill`/`BotKill` label and a `Killed`/`BotKilled` label at exactly the same stored timestamp value; and no later `Position` or `BotPosition` rows for the death-labelled ID anywhere later in that match. Movement at the death timestamp is allowed. This query does not require the killer to continue moving or the overall recording to continue, and does not apply the previous lookback, five-unit allowance, radius, or elevation rules. Storm deaths are excluded from combat matching.

The SQL is retained in `rough work/queries/same_timestamp_kill_candidates.sql`, executed against the notebook's decoded `events` DataFrame registered as the `player_events` temporary view. The full result, with last-position endpoints and counterpart counts, is saved in `rough work/analysis/same_timestamp_kill_candidates.csv` and printed in the notebook. Equality uses raw stored values rather than an inferred wall-clock conversion.

The query returns 80 distinct candidate ID/time/label pairs across 34 matches, comprising 74 killer/time/label groups and 78 victim/time/label groups. All matched label pairs are `BotKill`/`BotKilled`. Candidate ID types split into 28 human-to-bot, three bot-to-human, and 49 bot-to-bot pairs. There are 68 pairs with one possible counterpart ID in each direction; the other 12 have multiple possible counterparts. Two victim/time groups each match two potential killer IDs. All alternatives are retained instead of assigning a verified relationship. Every listed candidate victim's last movement timestamp is at or before the matching event timestamp.

`SELECT DISTINCT` makes this a list of compatible ID/time/label combinations; it is not a declaration that repeated source events are invalid or that the result is a verified unique kill count. The no-distance query is a separate analysis from the earlier proximity experiment, not a replacement of source event semantics or a finalized database rule.

## Unfiltered hypothesis validation and player-versus-player check

The user required testing every same-time kill/death pairing before treating movement ending as an established rule, and explicitly requested human-versus-human coverage. The earlier 80-pair selection cannot validate a universal rule because it excludes pairs with later victim positions by construction. A separate unfiltered query is retained in `rough work/queries/audit_simultaneous_kill_death.sql` and executed in the notebook.

Before imposing any movement-ending condition, there are 82 distinct-ID same-match same-timestamp candidate pairs, in 75 timestamp groups across 34 matches. Actor-type counts are 28 human-to-bot, five bot-to-human, 49 bot-to-bot, and zero human-to-human pairs. Eighty pairs have no later victim positions. Two pairs have later positions for both actors, and each belongs to a timestamp group with only one possible killer and victim, so these are not merely alternative cross-pairings of a simultaneous encounter.

However, checking the coordinates changes the interpretation of those two cases:

- Match `413b9011-a43d-4957-a485-261668c9857b.nakama-0`, bot `1418` and human `77f3a15f-815a-47c0-9cf2-337e9c8946b1`, raw time `1770706108`: the human has a final `Position` at +1 with X/Y/Z exactly equal to the `BotKilled` location. The bot's position records continue up to +358.
- Match `fc797a67-e443-4f70-8813-5d2f30317e79.nakama-0`, bot `1435` and human `db454a35-d216-4379-b140-2931160c7d8a`, raw time `1770834920`: the human has a final `Position` at +5 with coordinates exactly equal to the `BotKilled` location. The bot's position records continue up to +166. Repeated source payloads are retained.

Thus the strict “no later position records” rule has two counterexamples, while the coordinate-based “no changed victim location after death” rule has no counterexamples among these 82 matched pairs. This supports a hypothesis within this subset; it does not establish verified identities, unique kills, or a universal rule for every combat type. The full unfiltered audit is exported to `rough work/analysis/all_same_timestamp_kill_death_audit.csv`, the strict-record exceptions to `rough work/analysis/same_timestamp_movement_exceptions.csv`, and the coordinate-aware paired audit to `rough work/analysis/same_timestamp_coordinate_audit.csv`.

Human-versus-human coverage cannot be validated as a two-ID relationship: there are three `Kill` rows and three `Killed` rows, but each matching label pair is under the same human ID at the same timestamp. There is no second identified human in those cases. One of these death-labelled IDs has no later position; the other two have a final position equal to their death location. These same-ID coincidences are not treated as self-kills or inferred links between two humans.

For a broader check, 700 distinct observed combat-death ID/time/label groups were examined even when there is no identified opposing ID. Of these, 550 have no later positions, 45 have later positions exactly at the death location, and 105 have changed post-death coordinates. The 105 changed cases are all human-ID `BotKilled` groups and are outside the matched 82-pair result. Their existence prevents generalizing the paired-subset consistency to all death records without further interpretation. No time grace or coordinate tolerance was added to force agreement.

## Focused final pass, 5 November 2026

The new `rough work/notebooks/focused_final_pass.ipynb` is independent of the earlier notebook and was executed across all supplied files. Source files and `rough work/notebooks/exp.ipynb` were not changed. It checks copied-file versus event-payload repetition, candidate keys and dates, sampling gaps and apparent jumps, map mechanics, the separate combat-study scopes, and independent source counts for three representative matches. Evidence and measured summary values are retained under `rough work/analysis/focused_final_pass/`.

The cross-day journey files are now confirmed byte-identical, each with 88 rows. This refines the earlier observation of one journey in two files: they are copies, not two different portions of a journey. A diagnostic one-copy-per-identical-file view has 89,016 rows; a separate identical-payload-collapse view has 87,599. Neither policy was silently applied to source data or the application.

After excluding only the extra copied file, 1,417 repeated-payload rows remain: 1,234 Loot, 147 Position, 34 BotKill, and two BotKilled rows beyond the first. These are not all established logging mistakes. The event metrics differ under the policies; the full comparison is in `rough work/analysis/focused_final_pass/duplicate_policy_event_counts.csv`.

Independent PyArrow/Python counts agreed with Spark for every label in matches `b3550292…`, `fbbc5d02…`, and `ac049b28…`, both with all files and with the copied-file comparison. The last example has 359 supplied rows or 271 with one identical file copy retained.

The movement review found no conflicting same-time movement coordinates, a median positive gap of five raw units, and largest gaps of 302 for humans and 518 for bots. The largest gap's endpoints are only about 7.67 world units apart; route and occupancy during that interval are unknown. The largest displacement is about 63.57 world units over 25 raw units; the highest apparent speed is about 12.65 world units per raw unit over an interval of five. Without confirmed units and gameplay limits these are review candidates, not proven teleports or impossible speeds.

The comprehensive findings and recommended handling are in `DATA_NUANCES.md`. The notebook's ten finding blocks are plain-English snapshots of this supplied dataset, backed by its executed outputs and `rough work/analysis/focused_final_pass/pass_summary.json`.

The notebook proposes logical entities, provenance rules, timestamp handling, and query-driven index candidates. These remain analysis recommendations; see `PRODUCT_BRIEF.md` for current product and stack decisions made in other planning discussions.

## All-match seconds validation after the executive decision

Every one of the 796 match IDs was checked using latest minus earliest recorded raw timestamp. Treating the integers as seconds gives a minimum of 13 seconds, exact median 382 seconds (6:22), and maximum 890 seconds (14:50). There are no zero/negative spans and none above 15 minutes. The duration buckets contain 10 sub-minute recordings, 289 from one to under five minutes, 304 from five to under ten minutes, and 193 from ten to fifteen minutes. All ten sub-minute recordings contain BotKilled; the shortest consists of a position and a BotKilled 13 seconds later. This supports practical seconds-scaled recorded journeys. It does not invent a full-lobby start/end time or an official 15-minute game limit.

The complete per-match table is `rough work/analysis/focused_final_pass/match_seconds_validation.csv`; the executed check and project decision are in section 5 of `rough work/notebooks/focused_final_pass.ipynb`. The independent PyArrow source scan and Spark results agree. Seconds are accepted for this project under the user's decision.
