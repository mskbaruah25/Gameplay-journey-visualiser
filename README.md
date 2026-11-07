# Gameplay Journey Visualizer

A browser tool for level designers to explore LILA BLACK player journeys, combat, loot, and storm deaths across three maps.

**[Open the hosted tool](https://gameplay-journey-visualiser.vercel.app)** — no sign-in required.

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

1. **Choose a recording:** select a map, UTC date, and match. Search by match number or ID, check recorded human/bot counts, or filter for matches with multiple recorded participants.
2. **Explore Overview:** enable traffic, kill, or death heatmaps, adjust opacity, and review selected-match statistics. The map starts without overlays.
3. **Open Playback:** follow individual journeys, distinguish humans from bots, and toggle participant visibility. Separate markers identify kills, deaths, loot, and storm deaths.
4. **Control time:** play, pause, restart, or seek. Choose 1x, 1.25x, 1.5x, 1.75x, or 2x. Playback advances through recorded timestamps; simultaneous records stay together.
5. **Inspect combat and events:** click timeline indicators or use **Jump to combat** to seek to a kill, death, or storm death. Select a participant or event marker to pause and inspect its recorded actor, event label, elapsed/UTC time, and world coordinates. Simultaneous records can be inspected individually.
6. **Expand the map:** collapse the sidebar or statistics, toggle legends, or enter fullscreen. Heatmap controls, playback controls, combat navigation, and marker inspection remain available in their respective fullscreen views.

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

With Node.js 22 installed, run:

```sh
npm ci
npm run typecheck
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
- [Data nuances](docs/DATA_NUANCES.md) — observed issues and handling decisions.
- [Exploration](rough%20work/README.md) — notebooks, experimental SQL, and supporting evidence.
