# LILA BLACK Player Journey Tool

A Next.js and PostgreSQL application for exploring the supplied gameplay recordings. The backend and ETL implementation is now present: six application tables, MinIO storage, Python/Spark ingestion, read-only APIs, UTC date filtering, participant journeys, timestamp-step playback, event markers, metrics, and heatmap grids.

[Open the hosted tool](https://gameplay-journey-visualiser.vercel.app). The web app runs on Vercel Hobby; Neon Free provides PostgreSQL and private S3-compatible storage. Local Docker containers are only needed for development or running ingestion.

The ETL uses Spark for all Parquet reads and writes, including its test fixtures. Supporting notebooks, experimental SQL, and analysis tables are available in [the exploration folder](rough%20work/README.md). PyArrow is limited to that optional exploration environment.

## Using the tool

1. Select a map, UTC date, and match in the left panel.
2. In Overview, enable traffic, kill, or death heatmap layers and adjust opacity. The basemap starts with no overlays selected.
3. Switch to Playback to see recorded journeys and distinct event markers. The participant panel identifies humans and bots and lets you hide individual journeys.
4. Play, pause, restart, or seek to a recorded timestamp. Choose one of the five speeds from 1x to 2x. Playback steps through recorded moments rather than interpolating movement.

Filters show only the supplied recordings for that selection. Counts describe retained event labels and position samples; they do not imply a complete lobby or verified killer/victim relationships.

## Start locally

Requires Docker Desktop with Compose 2.20+ and enough free disk space for the build images. The first build compiles the pinned MinIO source release and installs Spark.

```sh
cp .env.example .env
docker compose up --build -d minio web
docker compose run --rm seed
docker compose run --rm etl
```

Open [the local application](http://localhost:3000) after ingestion succeeds. In this working directory, the saved gitignored `.env` uses [port 3101](http://localhost:3101) for the web app and ports 19002/19003 for MinIO, avoiding existing local services. The MinIO console is at [localhost:9001](http://localhost:9001). The example environment enables local PostgreSQL on port 55432. For Neon, configure the pooled connection as `DATABASE_URL`, the direct connection as `DATABASE_URL_UNPOOLED`, and leave `COMPOSE_PROFILES` empty. The local database is a development substitute, not a change to the deployed database choice.

`seed` is an optional demo upload. In a cloud workflow, upload originals directly to `landing/<date>/<recording>` in MinIO/S3, then run ETL. Spark compares one sampled UTC event date per file with the folder date, reports mismatches, and archives unchanged bytes under `raw/<sha256>/<source-path>`. Processed rows use their actual UTC dates. See [Landing ingestion details](docs/DEVELOPMENT.md#ingestion-commands).

## Code structure

```text
apps/web/src/app/api/            Thin Next.js HTTP handlers
apps/web/src/server/             SQL queries, connection pool, input validation
apps/web/src/features/           Overview, playback, heatmap and journey components
apps/web/src/lib/                Shared API contracts and browser request helper
database/migrations/            Six-table SQL schema and indexes
services/etl/lila_etl/           Object storage, source inspection, Spark, publication
services/etl/tests/              Transformation and isolated integration tests
infrastructure/minio/           Pinned source-built storage image
config/maps.json                Map origins, scales, assets, and dimensions
player_data/                    Unchanged supplied data and minimaps
docs/                           Requirements, reviewed audits, development guide
rough work/                     Supporting notebooks, experimental SQL, evidence
```

## Development and verification

The root `requirements.txt` installs the ETL development dependencies and Pillow for optional minimap regeneration. The complete original exploration dependency list is retained in `rough work/requirements.txt`.

```sh
npm ci
npm run typecheck
npm run build
.venv/bin/python scripts/test_etl.py
```

The current development preview on [port 3000](http://localhost:3000) is also connected to local PostgreSQL. For a host-run web app, put `DATABASE_URL` in the gitignored `apps/web/.env.local` and use `npm run dev`. Restart that process when changing database targets. The host URL for the example local database is `postgresql://lila:lila_local_only@127.0.0.1:55432/lila`.

See [the development guide](docs/DEVELOPMENT.md) for environment settings, ingestion commands, incremental behavior, testing, API routes, and MinIO image details. The [architecture notes](ARCHITECTURE.md) explain the data flow and decisions. The [product brief](docs/PRODUCT_BRIEF.md) retains the assignment requirements and working choices.

New cloud uploads appear after a successful ETL run; no automatic ingestion schedule is configured.

Verified locally: all three container images built, the complete Compose startup succeeded, the ETL and eight API tests passed inside the container setup, and TypeScript/build/browser checks passed. The import published 89,016 retained events across 796 matches. Storage restarts preserved the data; unchanged uploads and reruns processed zero new files/rows. See [initial verification](docs/analysis/backend_verification/README.md) and [Spark-only ETL verification](docs/analysis/spark_etl_refactor/README.md).

The subsequent Landing update passed all 10 ETL tests and eight API checks. All 1,243 supplied files were sampled, unchanged reruns reused the results without Spark, and published gameplay checksums were preserved. See [Landing verification](docs/analysis/landing_ingestion/README.md).

Cloud verification also passed all 10 ETL tests and eight public API checks. Neon contains the same 89,016 events, 796 matches, and 1,242 recorded participants, with identical event IDs and complete stored values. All three maps, heatmap controls, participant visibility, and playback were checked in the hosted browser. See [deployment evidence](docs/analysis/cloud_deployment/README.md).

## Data conventions

- Source timestamps are interpreted as seconds; filtering dates are UTC event dates.
- Keep the first byte-identical file copy. Preserve repeated rows inside retained files.
- Each retained Loot row counts as one item. Combat totals count retained labels while repeated-combat counting remains undecided.
- Participant identity is scoped to a match. Credit kill labels to the recorded actor.
- Plot supplied positions after death labels. No source-verified opponent identities are inferred.
- Playback advances between recorded timestamp groups; no intermediate positions are generated.
- Heatmaps count recorded events; traffic counts sampled positions rather than duration.

The original assignment and source data remain in their existing folders. The curated exploration is included under `rough work/`; backups, rough Word notes, and verbose development output remain Git-ignored. The whole folder is excluded from Docker builds. Saved notebook outputs are preserved; their input and export paths have been updated for the move.
