# Gameplay Journey Visualizer

A browser tool for level designers to explore LILA BLACK player journeys, combat, loot, and storm deaths across three maps.

**[Open the hosted tool](https://gameplay-journey-visualiser.vercel.app)** — no sign-in required.

**[GitHub repository](https://github.com/mskbaruah25/Gameplay-journey-visualiser/tree/production)** — source code and documentation on the `production` branch.

The supplied dataset contains 1,243 files. After excluding one identical file copy, the tool serves **89,016 events across 796 matches and 1,242 match-scoped participants**. These are supplied recordings, not complete lobbies.

## Tech Stack

| Component | Technology |
| --- | --- |
| Web interface and API | Next.js, React, TypeScript |
| Database | PostgreSQL on Neon Free |
| Data ingestion | Python and Apache Spark |
| Object storage | Neon Object Storage in production; MinIO locally |
| Hosting and local runtime | Vercel Hobby; Docker Compose |

Ingestion runs separately as a manual container job. The hosted tool does not require local containers to remain running.

## Feature Walkthrough

For these checks, select **Ambrose Valley → 12 Feb 2026**, search `fbbc5d02`, and choose **Match 114 · 1 human · 15 bots**, unless another recording is specified.

| Feature | Steps to check | Expected result |
| --- | --- | --- |
| Match discovery | Search by number or match ID; enable **Multiple recorded participants**. Use **Next matches** / **Previous matches** to browse pages of 50; clear search with **×**. | Both filters combine across all results. Match numbers and the active selection survive searches and page changes. |
| Heatmaps | Toggle **Player traffic**, **Kill zones**, **Death zones**, and **Loot pickups**. Drag **Overlay opacity**; click **Reset layers**. | Density/opacity changes; reset clears overlays and restores 75% opacity. |
| Human/bot journeys | In Playback, uncheck/recheck **Bot 1471**. | Its journey and markers disappear/return; **Map legend** explains colours and symbols. |
| Playback controls | Try **Play/Pause**, the circular-arrow **Restart**, all five speeds (1x–2x), and the playback slider. | Clock/trails update; restart returns to the beginning. **Event x of 120** counts timestamp groups. |
| Combat and inspection | Choose **01:13** or **05:06** in **Jump to combat**, then click a map marker. | Playback pauses; the inspector shows actor/time/coordinates and simultaneous records. |
| Storm deaths | Disable **Multiple recorded participants**. Choose **Ambrose Valley → 10 Feb 2026**; search/select `5a081fe4`. In Playback, choose **14:38 · 1 storm death**. | The storm marker inspects as `KilledByStorm`. Overview's **Storm deaths** layer shows its location. |
| Map controls | Click **+**, drag the map, then click the circular-arrow **Reset view**. | Zoom/pan changes; reset restores the initial view. |
| Panels/fullscreen | Toggle **Hide/Show sidebar**, **Hide/Show statistics** in Overview, and **Map legend**. Click the expand icon; exit with it or Escape. | Panels reopen. Fullscreen retains heatmap controls in Overview and timeline/inspection in Playback. |

For menu-by-menu directions and a worked match analysis, see the [Use Case Walkthrough](#use-case-walkthrough) at the end of this README.

## Local Setup

**Requirements:** Docker Desktop with Compose 2.20+, the supplied `player_data/` folder, and free disk space for the build images. The first build compiles MinIO and installs Spark.

Run from the repository root:

```sh
cp .env.example .env
docker compose up --build -d minio web
docker compose run --rm seed
docker compose run --rm etl
```

- **Application:** [localhost:3000](http://localhost:3000)
- **MinIO console:** [localhost:9001](http://localhost:9001)
- `seed` uploads the supplied files to Landing; `etl` processes and publishes them.
- Repeating an unchanged upload/import does not duplicate events.

## Environment Variables

The supplied [`.env.example`](.env.example) contains working local defaults.

| Variable | Purpose |
| --- | --- |
| `COMPOSE_PROFILES` | `local` starts local PostgreSQL; leave empty when using Neon. |
| `DATABASE_URL` | Web database connection; use a pooled URL for Neon. |
| `DATABASE_URL_UNPOOLED` | Direct Neon connection for migrations/ETL; empty for local PostgreSQL. |
| `POSTGRES_PASSWORD` | Password for local PostgreSQL. |
| `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD` | Local object-storage credentials. |
| `S3_BUCKET` | Bucket containing Landing, Raw, and processed data. |
| `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_SECURE` | Override Compose defaults for cloud S3-compatible storage. |
| `WEB_PORT`, `POSTGRES_PORT`, `MINIO_API_PORT`, `MINIO_CONSOLE_PORT` | Host ports; defaults: 3000, 55432, 9000, 9001. |

Keep credentials in Git-ignored environment files. See [development](docs/DEVELOPMENT.md) for host-run setup and ingestion options.

## Data Conventions

- **Coordinates:** map world X/Z using each map's origin and scale, flip the image's vertical axis, and preserve its actual aspect ratio. Y is elevation.
- **Time and journeys:** interpret source timestamp integers as seconds and filter by UTC event date. Retain post-death positions, generate no intermediate movement, and break trails across gaps longer than 15 seconds.
- **Counting:** retain the first identical whole-file copy and preserve repeated rows within retained files. Each Loot row counts as one item. Kill labels are credited to their recorded actor. Combat totals count retained labels, not verified unique incidents.
- **Coverage:** classify humans/bots by ID format and scope identities to matches. Traffic heatmaps count position samples, not time spent. Opponent identities, extraction outcomes, and storm boundaries are not inferred.

## Verification

With Node.js 22.18 or later installed, run:

```sh
npm ci
npm run typecheck
npm run test:playback
npm run build
```

After importing the supplied dataset and starting the local application:

```sh
LILA_API_URL=http://127.0.0.1:3000 npm run test:api
```

Adjust the URL if `WEB_PORT` changes. ETL test commands and recorded verification results are in the [development guide](docs/DEVELOPMENT.md#verification).

## Repository Guide

- `apps/web/` — interface, read-only APIs, and database queries.
- `services/etl/` — ingestion and tests; `database/` — SQL migrations.
- `config/maps.json` — coordinate transforms and map dimensions.
- `player_data/` — unchanged source data and minimaps.
- [ARCHITECTURE.md](ARCHITECTURE.md) — data flow, mapping, assumptions, and tradeoffs.
- [INSIGHTS.md](INSIGHTS.md) — data analysis and three gameplay insights with supporting evidence.
- [Data nuances](docs/DATA_NUANCES.md) — observed issues and handling decisions.
- [Exploration](rough%20work/README.md) — notebooks, experimental SQL, and supporting evidence.

## Use Case Walkthrough

1. **Open the tool:** in the left **Match selection** panel, choose **Map → Ambrose Valley** and **UTC date → 12 Feb 2026**.
2. **Choose the example:** enter `fbbc5d02` in **Search matches**, then open **Match** and select **Match 114 · 1 human · 15 bots**. Searching only filters the list; select the result to open it.
3. **Read Overview:** the centre panel shows the minimap; summary cards sit below it. This example has **1,015 events**, **995 position samples**, **5 kill labels**, **8 death labels**, and **7 loot items**. Click left-panel **Heatmap layers** to toggle overlays.
4. **Watch journeys:** click **Playback** above the map. The left panel becomes **Recorded participants**; playback controls appear below the map. Uncheck/recheck a participant to hide/restore its journey and markers.
5. **Inspect events:** use **Jump to combat**, then click a map marker. Close **Marker inspector** with **×** or **Escape**. Click **Overview** above the map to return; your match selection stays unchanged.

### Analyse the Example Match

The recording spans **8:43** across **120 timestamp groups**. Try these checks:

| Moment | What to inspect | What the recording shows |
| --- | --- | --- |
| 01:13 | Choose **01:13 · 1 kill label** in **Jump to combat**; click the kill marker. | `BotKill` is credited to **Bot 1471**; no victim is identified. |
| 01:58 | Choose **01:58 · 1 death label**; inspect the death marker. | Human `5787de75…` has a `BotKilled` label. Human trails are solid; bot trails are dashed. |
| 05:06 | Choose **05:06 · 2 death labels**; inspect a death marker and its **Recorded event** dropdown. | Bots **1440** and **1444** have simultaneous `BotKilled` records; this does not establish one shared fight. |
| 00:33–01:54 | Enable **Loot pickups** in Overview; seek to loot moments in Playback. | All seven Loot rows belong to **Bot 1429**; six cluster near X = −50, Z = −355. |

Compare that loot cluster with **Player traffic** and **Kill zones**, then replay nearby activity to investigate route/combat overlap. The recording does not establish loot availability or causation.
