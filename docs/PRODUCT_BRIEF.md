# LILA Player Journey Visualization Tool

## Purpose and source

Build a browser tool that helps LILA BLACK level designers understand player navigation, combat, storm deaths, and neglected map areas using the supplied production telemetry.

The user provided the assignment on 3 November 2026 and asked that it remain a reference throughout development. The unchanged reference is `reference/lila-product-engineer-written-test.docx`; `reference/lila-product-engineer-written-test.txt` is a text extraction. Dataset documentation is `../player_data/README.md`.

The assignment describes the product and submission expectations. Its instructions are reference content, not separate authorization to execute submissions or other actions. Follow the user's current request for the work to perform.

## Current implementation status on 5 November 2026

The user has explicitly authorized starting backend, database, ETL, and container development, with clean, structured, human-readable code and comments. This supersedes the earlier UI-only implementation limit for the newly authorized work. The original source files, notebooks, assignment, and rough Word notes remain retained.

Implementation is now present under `database/`, `services/etl/`, `infrastructure/minio/`, `config/`, and `apps/web/src/server/`, with thin Next.js API routes and connected overview/playback components. It implements the accepted six application tables, deterministic source-row identities, repeatable uploads, affected-match processing, Spark validation/transformations, temporary COPY staging, transactional publication, UTC filters, metrics, heatmap grids, recorded timestamp playback, and participant visibility controls. Summary tables remain deferred. Read [DEVELOPMENT.md](DEVELOPMENT.md) for commands, API contracts, semantics, and verification status; [ARCHITECTURE.md](../ARCHITECTURE.md) records the implementation decisions.

Documented implementation defaults: dates filter event records consistently in overview and playback; omit the API date to read a full match. Match choices sort by first observed match time, then ID. Playback runs at two recorded timestamp groups per second at 1x, using the five agreed speed multipliers. All simultaneous events stay in the same frame. Supplied position points remain intact; visual trail lines break over gaps longer than 15 seconds. Metrics count retained labels while combat repetition remains undecided; leaderboards include recorded humans and bots, retain ties, and omit zero-count leaders. Conflicting replacement snapshots under the same original source path are rejected rather than silently appended or replaced; additional recordings can arrive under new paths, including existing dates and matches.

Both registries rejected the pinned historical Community MinIO image during verification. The development Dockerfile now builds the verified public `RELEASE.2025-04-22T22-12-26Z` source tag. This is an explicit local-development choice, with the archived maintenance status documented; a maintained deployed image/license remains a hosting choice. Compose provides a local PostgreSQL profile without replacing the finalized Neon deployment choice. No Neon changes or public deployment were performed.

Local verification now includes passing TypeScript checks, a production Next.js build, all four ETL tests including PostgreSQL/MinIO integration, all eight API tests, and browser checks on all three maps. The full import published 89,016 retained events across 796 matches and 1,242 recorded participants; an unchanged rerun processed zero rows. Docker recovered from the earlier disk-full error. All three images built successfully, full Compose startup and the ETL/API test suites passed in the container setup, and storage restarts followed by unchanged uploads/imports preserved the data without duplication. A gitignored local `.env` uses web port 3101 and MinIO ports 19002/19003 to avoid existing services. See [verification evidence](analysis/backend_verification/README.md). Earlier statements below saying implementation has not started are historical planning context and are superseded by this section.

## Connection work requested on 5 November 2026

The user has now explicitly requested the database connection work. The development preview on port 3000 had no database URL and returned 503; it is now connected to the existing local PostgreSQL container through a gitignored `apps/web/.env.local`. The Docker application remains available on port 3101.

Neon connection preparation separates the pooled web URL (`DATABASE_URL`) from the direct migration/ETL URL (`DATABASE_URL_UNPOOLED`). Ingestion rejects a Neon pooled endpoint because its session advisory lock requires a persistent connection. Web reads use transaction-local timeouts. The Neon integration was offered, but account authentication and project selection remain pending; no Neon database has been created, migrated, or loaded. Public hosting remains outstanding.

The user chose to use an existing Neon project rather than create a new project. The exact project and branch still need to be identified after account access is connected. The integration is not yet installed/authenticated, and the attempted Chrome fallback did not establish account access. The working local database remains the active target.

## Spark-only ETL refactor on 6 November 2026

On 6 November 2026, the user requested replacing PyArrow with Spark throughout the ETL. The reader now uses one batch of original Parquet files, physical Parquet row indexes for stable event identity, and `unix_millis` to recover the supplied timestamp integers. Test recordings are also written with Spark. The extra converted staging file and ETL PyArrow dependency are removed. The original exploration notebooks retain their historical code. Rule version `2026-11-06-v2` causes a full revalidation on upgrade; gameplay counting and handling decisions remain the same. The full dataset has been reprocessed in a PyArrow-free container with identical event IDs and stored values. A local 512-MB driver default and a temporary Spark-written CSV handoff to PostgreSQL avoid the Docker memory failure observed with Python row collection. The original six-table schema and atomic publication remain intact.

## Landing ingestion decision on 6 November 2026

The user requested that object storage be the starting point for ingestion, before the immutable Raw archive. Uploaders place original Parquet files in date folders under `landing/`, preserving the supplied date-oriented structure. The local upload command is an optional demo loader; ETL no longer depends on local `player_data/` or the Compose seed service.

Before archiving a new Landing object, Spark samples its first non-null physical timestamp and compares its UTC event date with the date folder. This follows the user's one-date-per-incoming-file contract; it is a sample check, not a guarantee about every row's date. Recover the original integer and apply the accepted seconds interpretation. ISO date folders are preferred; the original `February_10` folders remain supported using `DATASET_YEAR`.

Mismatches are warnings recorded with both dates and the object path, not grounds to discard the supplied historical data. Original bytes and paths are preserved in `raw/<sha256>/<source-path>`. The existing row-level UTC partition/filter rule remains authoritative after transformation, including cross-midnight recordings. Empty files or files with no usable timestamp fail visibly. A bucket-local manifest records checked object versions so unchanged runs need not start Spark. Existing Raw-only archives remain usable; this change does not alter serving rules or event identities.

Compose treats the supplied-data seed as optional. A fresh empty installation can start successfully and receive Landing uploads later. Authentication, hosting, and the other mandatory visualization capabilities remain in scope as described below.

Verification passed 10 ETL tests and eight API checks. All 1,243 supplied files are now present in Landing; 11 sampled file dates differ from their folder dates and are reported without rejection. The next run reused every check without starting Spark. Event IDs and complete event-value checksums remain unchanged for the 89,016 published events. See [Landing verification](analysis/landing_ingestion/README.md).

## Hosting budget, 7 November 2026

The user requires free hosting. Evaluate the web application, PostgreSQL, object storage, and Spark ingestion together against their free-plan limits. Vercel remains the web-hosting preference and Neon remains the finalized PostgreSQL choice. The cloud object-storage provider, ingestion runtime, and final hosting configuration are still proposals under review; no hosting provider has been changed or deployment performed in this discussion.

The user subsequently authorized deployment after pushing initial commit `721bf71` to `mskbaruah25/Gameplay-journey-visualiser`, then explicitly authorized a new Neon project in any suitable region provided hosting remains free. The connected Neon account was new and empty, superseding the earlier existing-project preference. Vercel Hobby hosts Next.js on Node.js 22, with `apps/web` as the project root. Neon Free hosts the dedicated PostgreSQL 17 database and private S3-compatible storage in Singapore; the Vercel function is also in Singapore. UTC event-date handling is unchanged. The public production domain is `https://gameplay-journey-visualiser.vercel.app`. The web app uses a read-only pooled database role; migrations and ETL use a direct owner connection, with credentials outside Git.

Cloud ingestion uses the existing Docker ETL as a manual job; no scheduled cloud Spark service or GitHub Actions ingestion workflow is configured. All 1,243 supplied originals have been uploaded to cloud Landing. The MinIO client was verified against Neon Object Storage before import. A bounded pool of eight threads overlaps original-file transfers while preserving Spark transformation rules and deterministic IDs. Ten ETL tests passed, including transfer-failure rollback. The [deployment evidence](analysis/cloud_deployment/README.md) records reconciliation and public application checks. The hosted interface does not depend on the local containers remaining running. Historical statements above about pending connections or hosting describe earlier stages.

The cloud import succeeded with 89,016 retained events, 796 matches, and 1,242 match-scoped participants. Every event ID, complete stored event value, and event-type count matches the verified local database. An unchanged cloud rerun processed zero rows and reused every Landing check without Spark. All eight API tests passed against the anonymous public URL, and browser checks passed for all maps, heatmap selection, playback controls, and participant visibility with no console errors. This completes hosting of the current visualization implementation on the selected free plans.

## Repository organization, 7 November 2026

The user requested a `rough work/` folder before the initial Git commit, then chose to publish a curated investigation so assessors can inspect the work. The two maintained notebooks, experimental SQL, supporting tables, execution helper, exploration requirements, and a reading guide are included in Git. The earlier backup notebook, duplicate exploratory Python, unfinished Word journal, detailed logs, and development screenshots remain local and ignored. The entire folder remains excluded from Docker builds. Saved notebook outputs and archived binary files are preserved; maintained notebook/helper paths resolve the source dataset and write analysis results within this folder.

Application code, tests, source data, assignment references, reviewed findings, verification summaries, and selected import/reconciliation reports remain in their existing folders. The root requirements file covers ETL development and optional minimap regeneration; the full exploration environment remains reproducible from its separate requirements. Published documentation links to the curated investigation while identifying excluded evidence as local-only. The user will create a GitHub repository and provide its name before a push. Adding files to the staging area does not create a commit.

## Fullscreen controls, 7 November 2026

The user requested usable controls while the map is fullscreen. Overview now
includes a compact, collapsible panel with the same heatmap layers, opacity, and
reset controls as the sidebar, plus a legend for selected colours and relative
density. Both instances share the current selection. Playback keeps its recorded
timestamp scrubber, play/pause, restart, and all five speed choices inside the
fullscreen container. Controls sit outside the draggable map canvas; entering or
leaving fullscreen retains the selected layers and current playback state. These
are requested UX additions; gameplay data and counting rules are unchanged.

## Map legends and timeline labels, 7 November 2026

The user requested an on-map legend in both Overview and Playback, also
available in fullscreen. Overview explains the heatmap colours and relative
density; Playback explains human/bot markers, solid/dashed trails, and the
actual kill, death, loot, and storm symbols. Legends can collapse to reveal the
map. Fullscreen Overview reuses its heatmap panel's legend.

The scrubber handle now has a persistent elapsed `mm:ss` label that follows
its position. The counter reads `Event x of y`, replacing `Step x of y`.
This is a display label: one timeline event still groups all records at the
same timestamp. Simultaneous events remain together, and raw event totals are
unchanged. The user authorized a local commit and explicitly prohibited pushing
this update to GitHub until requested.

## Match search

The user requested a search bar within match selection and a commit afterward.
The field filters the complete loaded list for the selected map and UTC date by
match number, displayed label, or any part of the full match ID, ignoring case
and surrounding whitespace. Match numbering remains tied to the original list.
Searching does not change the active recording: if it falls outside the results,
it remains explicitly available under "Currently selected". The field shows
result counts, a no-results message, and a clear button. Changing map or date
clears the search; switching Overview/Playback retains it. This extends the UX
without changing API contracts or telemetry rules. The earlier no-push instruction
remains in effect; this work is for a local commit.

## Required product capabilities

| Assignment requirement | Expected user experience |
| --- | --- |
| Load and parse supplied Parquet files | The provided gameplay data is available to explore. |
| Correct minimap and coordinate transformation | Player journeys and events appear at the correct locations on each of the three maps. |
| Visually distinguish humans and bots | Designers can tell human and bot activity apart. |
| Distinct event markers | Kills, deaths, loot pickups, and storm deaths are identifiable. |
| Filtering | The requirements say map, date, and/or match; the final checklist expects map/date/match. Plan for all three. |
| Timeline or playback | Designers can watch a selected match unfold over time. |
| Heatmap overlays | The final checklist explicitly calls for kill zones, death zones, and traffic. |
| Hosted tool | A shareable URL opens a working tool without assistance. |

Movement, combat, deaths, and loot are useful analysis categories. The prior conversational simplification to only movement, deaths, and loot is incomplete against the assignment. Loot markers are required; a separate loot heatmap is a possible enhancement rather than an explicit requirement.

## Confirmed overview decisions and proposed product shape

On 4 November 2026, the user supplied `reference/gameplay-portal-ui-overview.docx` with the initial overview-screen decisions. The original is retained unchanged and extracted text is beside it. These decisions supersede conflicting defaults in the earlier illustrative mockups:

- After login, open the overview screen on the Ambrose Valley basemap, initially empty of activity overlays.
- Provide map, date, and match dropdowns. Default to the first available date and the first match for that date; the ordering rule for "first match" still needs definition.
- The match dropdown has no "all matches / overview" option.
- Keep the heatmap controls.
- Add a Playback button above the map that switches to the match playback screen.
- Remove the mid-left Map Overview explanation section and the top LILA Player Journey Explorer heading.

The initial-overview instruction is interpreted as the basemap remaining visible, with no heatmap, paths, or event markers initially drawn. The exact initial heatmap-control state and whether all overview heatmaps follow the selected match should be specified before implementation; they are not explicitly defined in the supplied text. Preserve map/date/match selection when switching modes as a proposed interaction.

The user also decided that the UI will connect to a backend with a database. On 4 November 2026, the user finalized Next.js for the web application and backend/API layer, with Neon PostgreSQL as the database. Specific API conventions, database access tooling, and deployment configuration remain open. Preprocessing and precomputed summaries may still support that backend.

The user subsequently requested that the portal be available publicly on the internet and expressed a preference for Vercel because of prior deployment experience. Vercel remains a hosting preference rather than a finalized deployment decision or authorization to deploy. Whether visitors can explore anonymously or must sign in remains unspecified; public hosting and authentication are separate choices. Next.js and Neon are finalized.

On 4 November 2026, the user authorized coding the overview page and creating an appropriate folder structure. The user then explicitly limited this first implementation to UI only: do not bring in gameplay data yet; database design decisions will come later. The overview uses the supplied minimaps as visual assets, clearly labeled sample date/match choices, blank statistic values, and local control state. Layer controls preview selection and opacity settings without drawing invented heatmaps. The first overview iteration left Playback disabled; the subsequent playback UI iteration enables it as described below. No authentication, telemetry loading, database schema, Neon connection, ETL, or deployment is included in these UI steps. Match ordering and data-dependent filter rules remain open; the sample option order does not settle them.

The user accepted the overall overview UI and authorized the playback screen, still strictly UI only. Clicking Playback switches screens and removes the heatmap controls and any selected heatmap layers. The playback bar includes play/pause, seeking, restart, and exactly five speeds: 1x, 1.25x, 1.5x, 1.75x, and 2x. The implementation preserves map/date/match selection between screens; returning to Overview starts with cleared heatmap controls. An explicitly labeled eight-minute sample timeline demonstrates the controls without drawing synthetic journeys or events. Recorded participants remain an empty state, with human/bot and event-marker legends as UI placeholders. Local implementation defaults: playback starts paused at zero, changing a sample map/date/match resets the preview clock, and leaving playback disposes of its timer. These defaults and the sample duration are UI behavior, not verified gameplay semantics or database decisions.

The user also plans an ETL pipeline that ingests new match information from additional dates into the database. This extends the fixed supplied-dataset assignment. Design date/match discovery from stored metadata rather than hardcoded original dates, preserve source-file provenance, make retries safe, support late-arriving records, publish consistent data and summaries, and define cache freshness after successful imports. The serving stack is Next.js with Neon PostgreSQL, with Vercel preferred for application hosting; a separately scheduled Python ingestion job is the current recommendation, not a finalized choice. ETL hosting, source location, cadence, future volume, and retention are not yet specified.

On 5 November 2026, the user accepted the proposed ETL action sequence: version the handling rules; discover and register files; exclude later identical whole-file copies; read and validate Parquet with source-row identity; decode/classify records; interpret seconds and assign UTC event dates; make imports repeatable without collapsing distinct source rows; preserve undecided combat repetitions; calculate normalized map coordinates; prepare match/participant metadata, timestamp-step playback, metrics, and heatmaps; reconcile results; load through staging and publish consistent events/summaries; support incremental arrivals and report each run. Repeated combat-row counting remains undecided. This accepts the pipeline responsibilities, not an implemented ETL, physical database schema, orchestration service, or publication/versioning implementation.

The user subsequently accepted starting with six PostgreSQL tables: `maps`, `matches`, `match_participants`, `events`, `source_files`, and `etl_runs`. `participant_daily_stats` and `heatmap_cells` are deferred performance options; initially calculate statistics and heatmaps from events. This settles the initial logical table set. Exact columns, constraints, migration tooling, API contracts, and the implementation remain to be developed. The user's subsequent readiness question asks for an assessment of whether backend development can begin; it does not itself authorize implementing the backend or connecting to/deploying an external service.

The user has now specified containerizing the application and ingestion setup, with MinIO starting alongside the stack, and supplied the [stock-market pipeline reference](https://github.com/darshilparmar/DataVidhya-Data-Engineering-Course-Resources/tree/main/6.%20Apache%20Kafka%20for%20Data%20Engineering/code/stockmarketdatapipeline). This supersedes the earlier recommendation to default to managed object storage. The intended storage is containerized MinIO using an S3-compatible interface; the specific supported server edition/image and pinned version remain to be selected. As checked on 5 November 2026, the [original MinIO community repository](https://github.com/minio/minio) is archived and [the vendor states the original OSS edition is no longer maintained](https://www.min.io/pricing); its active offering is AIStor, including a free standalone tier. The referenced `minio/minio:latest` image is an example configuration, not an approved image choice.

The reference was read through the GitHub connector: Compose configuration, bucket setup, batch consumer upload, Spark batch read/write, orchestration DAG, and object-existence check. It uses separate MinIO and bucket-initialization services, host persistence at `/data`, API port 9000, console port 9001, the internal `minio:9000` endpoint, raw/processed object prefixes, and Spark S3A access. It also uses a fixed startup sleep, hardcoded demo credentials, a public-policy command, and unpinned MinIO images; these are not accepted defaults for this project. The batch processor currently defaults to today's date rather than consuming the supplied CLI date, so its stock-specific date flow must not be copied into historical gameplay processing.

Recommended container structure: a Next.js web/API service, a MinIO service backed by a persistent named volume, an idempotent one-shot bucket-initialization service that waits for MinIO readiness and fails on real errors, and a Python/Spark ETL job that waits for bucket setup. Keep the bucket private, configure credentials/endpoints externally, upload the original Parquet files without conversion to CSV, retain source objects for reruns, write processed records by accepted UTC event date, and retain run reports. Match Spark/Hadoop/S3A dependencies to the selected runtime. The six-table plan remains unchanged apart from adding bucket/object identity to `source_files`. Container restarts must not delete objects or duplicate imported events. The tutorial's Kafka, ZooKeeper, Airflow, and distributed Spark services are reference context, not newly accepted project requirements; one Spark ETL container is the initial recommendation.

Neon PostgreSQL remains the finalized database service. An optional local PostgreSQL container would be a development convenience, not a silent replacement for Neon. Exact local/deployed topology and the earlier Vercel preference must be reconciled when choosing hosting; a deployed MinIO instance requires persistent storage. No container stack, bucket, or infrastructure was created or started during this review.

In the subsequent database-design discussion, the user specified these product directions, with no coding authorized yet:

- Add selected-match metrics below the overview map. Requested examples include total kills, the player with the highest kills, human and bot counts, loot counts, and the player with the highest loot. The final metric set, tie handling, human-versus-bot leaderboard scope, and definitions remain under discussion. Combat and loot totals now follow the 5 November executive decisions below: credit kill labels to their recorded actor and count each Loot row as one item. Item value is not supplied.
- ETL must support additional recordings on existing collection dates as well as new dates, including more data for existing matches. Transform imported files into PostgreSQL records suitable for overview metrics, heatmaps, and playback.
- Gameplay exploration is read-only. Users do not edit gameplay records through the visualization UI. Ingestion remains a separate write operation; whether users initiate it through a dedicated import UI, CLI, or scheduled workflow is still unspecified.
- The user proposed a match-specific, timestamp-ordered collection of X/Y/Z coordinates and events for playback, with movement dots distinguished by human/bot colors and distinct symbols for kills, storm deaths, and loot. This is a conceptual proposal being evaluated, not an approved physical table-per-match schema. The implementation must also identify each recorded participant, preserve simultaneous events, use X/Z for the top-down map, and retain Y as elevation. The assignment additionally requires death markers.

The initial six database relations are accepted as described above. Physical schema details, publication/versioning rules, and replay details beyond the executive rules below remain to be developed. Prepared metric/heatmap summary tables are deferred unless query performance justifies them. No database schema, ETL, metrics UI, or gameplay-data integration is implemented by this planning discussion.

The two connected experiences are an overview with map controls and a selected match, and a playback screen with recorded participant journeys and distinct event markers over time. Authentication implementation itself has not been specified by the overview-page document.

An area inspector connecting aggregate hotspots to recorded matches is a useful proposed interaction, but it is not explicitly mandated. The conversation mockup uses the real minimap with illustrative overlays and a synthetic journey; it provides no evidence for game insights.

## Executive data decisions, 5 November 2026

These decisions close the four original concerns for this project. Earlier audits retain the original observations but must not be read as reopening these working rules.

1. **Time units:** use the original integer timestamp values as seconds for elapsed-time calculations and playback. The complete check covered all 796 match IDs: recorded spans are 13–890 seconds, with exact median 382 seconds. All ten sub-minute recordings contain `BotKilled`, consistent with short recorded journeys. All available spans are practically plausible at this scale. These are recorded bounds, not invented whole-lobby start/end markers. Keep raw source values and declared type for provenance. The additional date decision below sets the filtering convention.
2. **Kill attribution convention:** credit `Kill` and `BotKill` rows to the ID under which the event is recorded. Humans and bots may both produce `BotKill`; bot-versus-bot kills are accepted as a valid interpretation. This event-credit convention is handled, rather than an open blocker. It does not require identifying an opponent ID that the source does not explicitly provide.
3. **Loot multiplicity:** each `Loot` row counts as one looted item. Repeated identical `Loot` rows count as multiple items; do not collapse them merely because their visible payloads are equal. This is an explicit project convention despite absent item metadata.
4. **Supplied recordings:** plot every provided recording, including the 743 match IDs represented by one human ID. Do not wait for, invent, or require additional participant records.

### Additional handling decisions, 5 November 2026

The user has now handled four of the five additional attention points. **Only repeated combat-row counting remains undecided.** These are processing and playback rules to implement; this documentation update does not perform an ETL import or rewrite the supplied source files.

1. **Whole-file copies:** retain the first copy and exclude the later identical copy from processed data. For the known 88-row file, keep `February_10/cfa03e9f-81f6-41ef-a0fa-30c7e830f4ed_ac049b28-8116-4ff1-9e60-4be0537b8cc9.nakama-0` and exclude the identically named file in `February_11`. Use chronological source-folder order, then source path for a deterministic tie-break. This removes 88 repeated rows from the processed input, leaving 89,016 before other decisions. It does not collapse repeated rows within a retained file.
2. **Repeated combat rows — explanation pending a counting decision:** after whole-file exclusion, 31 repeated `BotKill` groups contain 65 rows: 34 beyond one row per group. Two repeated `BotKilled` groups contain four rows: two beyond one per group. All eight visible event fields match within each group. Same-second kills could be different actions; the schema has no target or unique action ID to distinguish them from repeated logging. Do not silently deduplicate these rows. Full examples are retained in `rough work/analysis/focused_final_pass/repeated_combat_payloads.csv` and `DATA_NUANCES.md`.
3. **Playback advances by recorded timestamps:** sort the distinct match timestamps and advance directly from one recorded timestamp to the next. Apply all rows at the same timestamp together, retaining every actor and simultaneous event. A long timestamp gap is one step; do not wait through the gap in real time or generate intermediate coordinates. Playback speed controls affect progression through recorded steps. The current sample UI clock has not yet been replaced by this data-backed behavior.
4. **Positions after a death label:** plot the supplied positions as recorded, including the 105 cases with small changed-coordinate updates after death labels. Do not stop or discard positions solely because a death label appeared. Retain the death marker and document the observed follow-up positions and this handling in the final project/architecture document. Their cause remains unverified; no respawn or survival is inferred.
5. **Date placement and filtering:** place each processed record in the date partition/folder corresponding to its timestamp, rather than its original collection-folder date. Use UTC as the explicit working convention for the accepted epoch-seconds interpretation, since no other timezone was supplied. A record whose UTC date is February 10 belongs only to February 10 even if supplied in `February_11`. Partition at row level because one source file may cross midnight. Use the same event date for filtering. Keep the source path as provenance, not as a second logical event. The earlier 436-row difference describes all supplied rows before whole-file exclusion; source-folder counts must not be presented as the newly partitioned totals.

**Final-document reminder:** include each observed nuance, the handling decision, and its effect or limitation. In particular, explicitly mention timestamp-step playback and plotting post-death position updates unchanged. The working decision log is `DATA_NUANCES.md`; the final submission document has not been authored by this update.

The user requested a rough Word document to collect important points, experiments, findings, and executive decisions before a later refined write-up. The working document is LILA experiments and decisions rough notes (local archive: `rough work/notes/LILA_experiments_and_decisions_rough_notes.docx`). It includes the full sequence of killer/victim inference experiments and distinguishes the matched-pair results from the separate 105 changed-coordinate death cases. Keep it as rough supporting notes, rather than treating it as the final one-page architecture document.

Image dimensions, byte decoding, source ordering, event primary keys, and match-scoped bot IDs are implementation requirements with known handling. They are not additional open data mysteries. The earlier inferred killer/victim investigation remains historical exploratory evidence, not a required source of opponent identities for the accepted event-credit convention.

## Data details to honor

- According to the supplied README, the dataset covers 10–14 February 2026, with a partial final day, across AmbroseValley, GrandRift, and Lockdown.
- Files are Parquet despite lacking a `.parquet` extension; each file represents a player or bot in a match.
- Event values may be bytes and require decoding.
- UUID user IDs represent humans; numeric IDs represent bots. Validate classifications against actual records.
- Use world `x` and `z` for the top-down map; world `y` is elevation.
- With each map's documented origin and scale: `u = (x - origin_x) / scale`, `v = (z - origin_z) / scale`; image coordinates are `u * image_width` and `(1 - v) * image_height`.
- The source declares milliseconds, but the project now uses the original integer values as seconds after validating all 796 recorded match spans. Preserve the original representation and use a shared recording baseline. Partition/filter processed rows by their UTC event date and advance playback by distinct recorded timestamps, following the additional decisions above.
- Follow the executive event-credit convention: Kill/BotKill is attributed to the recorded actor ID, including bot-versus-bot cases. Exact opponent-ID inference is not required to count or plot these events.
- Count each Loot row as one looted item, including repeated identical rows, by executive decision. Loot availability, extraction outcomes, storm geometry, item identity, and item value are not supplied; do not invent them.
- Plot all supplied journeys as given. One-recorded-ID matches are supported project inputs and do not block replay. Retain recorded human/bot counts without inventing additional trajectories.

## Submission expectations

The assignment asks for one GitHub repository link containing:

- All source code and a working deployment URL.
- A project README explaining the stack, setup, environment variables, and how to use the tool.
- A one-page `ARCHITECTURE.md`: stack rationale, data flow, coordinate mapping, assumptions, and major tradeoffs.
- `INSIGHTS.md` with three evidence-backed game insights. For each: observation, concrete evidence, why a level designer should care, and any supported actionable changes and affected metrics.

The final checklist mentions a walkthrough covering major features, but does not specify its format. Keep that ambiguity visible when preparing the submission.

The stated deadline is five days from receiving the assignment, with an expected 10–15 hours of focused work. The receipt date has not been established, so no calendar deadline is inferred here.

## Design priorities and open decisions

The evaluation covers system design, data accuracy and edge cases, end-to-end execution, usefulness to level designers, code organization, and clear explanation of tradeoffs. Polish the required experience before adding features. The assignment leaves stack, UX, pipeline, and hosting choices open.

Finalized stack: Next.js for the web application and backend/API layer, with Neon PostgreSQL for the database. Still to decide: database access tooling, API conventions, preprocessing strategy, rendering approach, hosting configuration, technical build sequence, and playback details beyond the accepted timestamp-step rule. Initial overview layout and defaults are specified above; initial layer state, heatmap scope, match ordering, and invalid-selection handling still need precise rules. The four original data concerns and four of the five additional concerns have handling decisions. Repeated combat-row counting is the sole remaining undecided data-handling point in that list. Historical observations remain in `DATA_AUDIT.md`.

On 3 November 2026, rechecking the original assignment confirmed that a time-based match view is required: the core section asks for timeline/playback and the checklist accepts a timeline or playback showing match progression. A scrubber with play/pause is the recommended scope; extra playback controls remain optional. Detailed evidence is retained in `DATA_AUDIT.md`.
