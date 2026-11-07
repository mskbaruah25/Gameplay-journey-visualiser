# Development

The application now has a PostgreSQL schema, object-storage ingestion, Spark transformations, read-only API routes, and database-backed overview/playback components. Neon remains the deployed database choice. A local PostgreSQL profile is provided so development does not require Neon credentials.

## Folder responsibilities

```text
config/maps.json                 Shared map configuration used to seed PostgreSQL
database/migrations/             Readable SQL schema and indexes
infrastructure/minio/            Pinned MinIO source-build container
services/etl/lila_etl/            Python ingestion code
  config.py                      Environment settings and transformation version
  storage.py                     Landing uploads, immutable archives, S3 operations
  landing.py                     Sample folder-date checks and promotion to Raw
  source.py                      Batch Spark reads and physical Parquet row identities
  transform.py                   Spark validation and gameplay transformations
  database.py                    SQL migrations, COPY staging, atomic publication
  pipeline.py                    New-file discovery and affected-match processing
  __main__.py                    Explicit command-line operations
services/etl/tests/              Transformation and isolated integration tests
apps/web/src/server/             PostgreSQL connections, validation, query functions
apps/web/src/app/api/            Thin read-only HTTP route handlers
apps/web/src/lib/                Shared API types and the browser fetch helper
apps/web/src/features/           Existing interface, now connected to gameplay APIs
```

The original recordings and assignment remain in their existing folders. Curated exploratory notebooks, experimental SQL, and supporting tables are versioned under `rough work/`. Backups, rough Word notes, and detailed development outputs remain Git-ignored there. Verification summaries and selected reconciliation/import reports remain in `docs/analysis/`. The ETL does not modify `player_data/`.

For local Python development, install the root `requirements.txt`; it includes the ETL requirements and Pillow for optional minimap regeneration. The separate `rough work/requirements.txt` retains the original notebook environment and is only needed for local exploration. No application or container imports from the rough-work archive.

## Start the local stack

Requires Docker Desktop with Compose 2.20 or newer and sufficient free disk space for the Spark and MinIO build images. The first build downloads Python/JVM dependencies and compiles the pinned MinIO release.

```sh
cp .env.example .env
docker compose up --build -d
```

The example environment enables the `local` profile. Compose starts local PostgreSQL, MinIO, private-bucket initialization, schema migration, a one-shot ETL run, and the web service. An empty bucket is a successful no-op. Upload files to Landing and run ETL again when ready. `seed` belongs to the optional `demo` profile and is not an ETL dependency. For a deterministic first demo import, use the three commands in the root README instead.

- Web: `http://localhost:3000`
- MinIO console: `http://localhost:9001`
- MinIO S3 endpoint: `http://localhost:9000`
- Local PostgreSQL: `localhost:55432`

This working directory has a gitignored `.env` using `WEB_PORT=3101`, `MINIO_API_PORT=19002`, and `MINIO_CONSOLE_PORT=19003`, because the default ports were already occupied. Those are the currently running ports; a fresh copy of `.env.example` uses the defaults above.

Local example credentials are in `.env.example`. Configure deployment credentials separately. MinIO and PostgreSQL use named volumes, so container replacement does not remove their data. Keep those volumes when stopping the stack.

```sh
docker compose down
```

### MinIO image choice

The old Community images could not be pulled from Docker Hub or Quay during development. `infrastructure/minio/Dockerfile` therefore builds the public `RELEASE.2025-04-22T22-12-26Z` source tag, retaining its license in the image. This is a reproducible local development choice; the Community edition is archived. Its maintenance status is described by [MinIO](https://www.min.io/pricing).

A maintained AIStor deployment requires its license and the appropriate server image/configuration. This repository does not invent a license or silently configure an account. Keep the S3 interface configurable when selecting deployed storage.

### Use Neon

Set `DATABASE_URL` to Neon's pooled connection string for the web app. Set `DATABASE_URL_UNPOOLED` to the direct connection string for migrations and ETL. Obtain both from the same project, branch, database, and role in Neon's Connect dialog, toggling connection pooling on or off. Keep the supplied TLS parameters. Set `COMPOSE_PROFILES=` to omit local PostgreSQL when using Neon.

The ETL's session advisory lock needs a direct connection; transaction pooling cannot preserve that session. The web app reads through the pooled URL and applies its query timeout inside each read transaction. See [Neon's pooled/direct connection guidance](https://neon.com/docs/connect/connection-pooling).

```dotenv
COMPOSE_PROFILES=
DATABASE_URL='postgresql://<role>:<password>@<endpoint>-pooler.<region>.aws.neon.tech/<database>?sslmode=require'
DATABASE_URL_UNPOOLED='postgresql://<role>:<password>@<endpoint>.<region>.aws.neon.tech/<database>?sslmode=require'
```

These are placeholders. Save real values only in the gitignored `.env`. For a host-run development server, also put the pooled `DATABASE_URL` in `apps/web/.env.local` and restart that server when changing database targets. Container images exclude environment files, and credentials are passed at runtime.

After configuring an empty database dedicated to this tool, start ingestion and the web app:

```sh
docker compose up -d --no-build
docker compose logs -f etl
```

A cloud connection is not yet verified: Neon authentication and the target project are still pending. The local data and containers remain available.

### Run the web app outside Docker

```sh
npm ci
```

The current host-run preview on port 3000 is connected through a gitignored `apps/web/.env.local`. To configure another host-run checkout, set `DATABASE_URL` there. For the provided local database, use `postgresql://lila:lila_local_only@127.0.0.1:55432/lila`. Then run:

```sh
npm run dev
```

Never prefix database or object-store credentials with `NEXT_PUBLIC_`.

## Ingestion commands

Each command has one responsibility. Storage initialization waits for authenticated S3 access. It is safe to repeat and leaves the bucket private.

```sh
docker compose run --rm --no-deps minio-init
docker compose run --rm --no-deps migrate
docker compose run --rm --no-deps seed
docker compose run --rm --no-deps etl
```

Upload original files directly through the MinIO console or any S3 client, using `landing/2026-02-15/<actor>_<match>.nakama-0`. No hash or local filesystem is required from the uploader. The CLI `upload <directory>` is an optional helper that mirrors a local date-organized directory into Landing; the Compose `seed` service uses it for the supplied dataset. Both ISO date folders and the supplied `February_10` style are supported; `DATASET_YEAR` supplies the year for the latter. Keep the actor/match filename convention. Re-run ETL for additional dates or recordings in existing matches.

```text
landing/February_10/<original-file>                 User-uploaded original
raw/<sha256>/February_10/<original-file>            Immutable archived bytes
manifests/landing.json                             Checked versions and sampled dates
processed/<run-id>/event_date=2026-02-10/           Transformed affected-match snapshot
reports/<run-id>.json                              ETL result, including Landing findings
```

Before promotion, Spark reads the timestamp column and selects the first non-null physical timestamp from each new file. Its original integer is recovered with `unix_millis` and interpreted as epoch seconds in UTC. ETL compares that one event date with the date folder immediately under `landing/`. This follows the one-date-per-file input contract; it does not validate every row's date. An empty/null-only recording fails. A mismatch records the object path and both dates in `report.landing.date_mismatches`, and is also logged. It does not reject the supplied historical recordings. Transformed rows still go to their own UTC date partitions, even across midnight.

The Landing manifest records each checked object's ETag, size, folder date, sample date, rule version, and Raw archive key. Unchanged versions reuse that receipt without Spark. Downloads use `If-Match` so concurrent replacement cannot silently change the checked bytes. The manifest records archival/check completion, not successful database publication; failed transformations can safely retry from Raw. Existing Raw objects are supported without requiring a Landing backfill. Missing archives can be restored from a matching Landing version; remaining missing/changed imported Raw objects cause a visible failure.

Raw object keys retain the form `raw/<sha256>/<original-relative-path>`. ETL does not overwrite existing Raw bytes. Conflicting contents under the same original source path are rejected, since silently appending or replacing a recording could change real event multiplicity. Landing is an upload area, not the immutable history: run ingestion to archive uploads before replacing them. Additional recordings use new source paths. In-place replacement snapshots need an explicit replacement policy.

For a later fragment with the same actor/match filename, a new path can be `landing/2026-02-10/batch-2/<original-recording-filename>`. The first folder below Landing still supplies the collection date; timestamps supply the event dates.

The registry selects one copy per content hash in chronological source-folder order, with path as the tie-break. It rebuilds all available source records for affected matches, rather than appending only the latest fragment. Events have deterministic content/row identities; repeated payloads within a file remain separate records. Re-running unchanged inputs processes zero event rows.

```sh
docker compose run --rm --no-deps etl run --rebuild
```

`--rebuild` reapplies the current rules to all available recordings. Update `RULE_VERSION` when transformation semantics change. That also triggers a complete rebuild on the next run.

### Published data and processing artifacts

PostgreSQL is the serving authority. A successful ETL transaction publishes source references, affected-match metadata, participants, events, and the run result together. Failed validation leaves existing gameplay events unchanged.

Processed Parquet is written under `processed/<run-id>/event_date=YYYY-MM-DD/`. Each run contains complete snapshots of its **affected matches**, not a full-dataset export. The report lists those matches. Do not union all historical run folders: that would count successive snapshots more than once. Failed/unpublished run artifacts are not serving data. Per-run reports live in `reports/<run-id>.json` and in PostgreSQL `etl_runs.report`.

The S3 client downloads original Parquet bytes without converting them. `source.py` reads the retained files together with Spark, captures `_metadata.row_index` before any joins or repartitioning, and joins their source-file inventory. These physical indexes preserve the existing content-hash/row-number UUIDv5 event IDs. Sorting by timestamp or generating partition-dependent row numbers would change those identities.

Spark's `unix_millis` recovers the original millisecond-labeled timestamp integers; `transform.py` then interprets those recovered integers as seconds under the accepted project rule. Source registry schemas now use Spark SQL type names. The original Parquet files and their physical timestamp annotations remain intact in MinIO.

Spark handles Parquet input, validation, coordinate joins, window calculations, event flags, and processed Parquet output. There is no separate converted input staging file and no PyArrow dependency in `services/etl/`. The root exploration environment retains PyArrow for the existing notebooks.

For database transport, Spark writes temporary CSV files with explicit UTC timestamps and then stops. PostgreSQL `COPY` reads those files in one-MiB byte chunks into its temporary staging table. This avoids collecting Spark rows into the Python driver while preserving the existing atomic serving transaction. These transport files are local, are deleted with the run's temporary directory, and are not the processed Parquet artifacts in MinIO.

Reader rule version `2026-11-06-v2` triggers one complete revalidation/rebuild when upgrading from the earlier reader. Landing has its own check version; adding it does not rebuild unchanged serving data. With unchanged Landing and Raw objects, a subsequent run processes zero rows without starting Spark.

The local driver heap defaults to `SPARK_DRIVER_MEMORY=512m`. Increase it for larger imports when the runtime has sufficient memory. Retained original files are grouped into one temporary input folder to avoid a discovery task for each individual path. Stopping Spark before the database load keeps its workers out of that phase's memory footprint.

## Data and interface conventions

- Recover the source timestamp integers and treat them as seconds. Derive event dates in UTC. Do not use the source folder as the gameplay date.
- A date selection filters event records in overview metrics, heatmaps, and playback. A match spanning midnight can be listed under both dates. Omitting the API date parameter returns its full available recording.
- Elapsed times remain relative to the first available event in the full match. A date-filtered recording may therefore start after elapsed zero.
- Match options sort by earliest recorded match time, then the original match ID. Default to the earliest available UTC date and first match for that map/date.
- Credit kill labels to their recorded actor. Count retained loot rows as items. Preserve repeated combat rows and expose totals as label counts while their distinct-action counting convention remains undecided.
- Preserve every position after death labels. No opponent identity, survival state, or respawn is inferred.
- Playback advances through distinct timestamp groups at two groups per second at 1x. All events at one timestamp appear together. The five accepted speed multipliers apply to this step rate.
- Human and bot markers use different colors and shapes. Individual participants can be hidden. Trails connect consecutive position samples only when their gap is at most 15 seconds; every sampled point is retained. This line-break threshold is a documented display default, not a gameplay finding.
- Heatmaps use a 32 by 32 grid by default, with counts calculated directly from events. Blur and within-layer intensity scaling are visual treatments. Traffic density counts position samples, not duration. Death zones include storm deaths; the storm layer also allows inspecting those separately.
- Leaderboards include recorded humans and bots, show all ties, and show no leader when the relevant count is zero. An empty database produces an explanatory empty state rather than synthetic matches.
- API responses use no-store caching. Each multi-query response reads one repeatable database snapshot. The initial API has no import/write routes or authentication implementation.

## API

| Route | Purpose |
|---|---|
| `GET /api/health` | Database connection and last successful import time |
| `GET /api/maps` | Map assets and actual image dimensions |
| `GET /api/dates?mapId=Lockdown` | Available UTC dates |
| `GET /api/matches?mapId=Lockdown&date=2026-02-10` | Paginated match choices |
| `GET /api/matches/<id>?date=2026-02-10` | Participants, metrics, and source-counting convention |
| `GET /api/matches/<id>/events` | Paginated detailed events |
| `GET /api/matches/<id>/playback` | Timestamp-grouped events plus recording metadata |
| `GET /api/matches/<id>/heatmap?layer=traffic` | Grid counts for one layer |

Dates are optional on the match-specific routes. Event/match listings accept `limit` and `offset`. Heatmap options include `gridSize` between 8 and 128 and optional `actorType=human` or `actorType=bot`. Layers are `traffic`, `kills`, `deaths`, `storm`, and `loot`. Invalid dates/options return 400, unknown matches return 404, and unavailable database data returns 503. Playback refuses responses above 100,000 events rather than silently truncating them; the paginated event endpoint remains available.

## Verification

```sh
npm run typecheck
npm run build
.venv/bin/python scripts/test_etl.py
```

The last command requires Java 17+ and the root virtual environment with its pinned requirements. Spark needs permission to open local sockets. Integration tests additionally use `LILA_TEST_DATABASE_URL`, `S3_ENDPOINT`, `S3_ACCESS_KEY`, and `S3_SECRET_KEY`. They create and remove only a uniquely named test schema and bucket. They cover Landing timestamp samples, the cross-midnight sampling limitation, empty installations, direct MinIO uploads, copied files, repeated loot, post-death positions, unchanged reruns without Spark, new recordings for an existing match, bot IDs reused across matches, and rollback after invalid input.

With the local Compose services running and the example database credentials, run all ETL tests inside the image:

```sh
docker compose run --rm --no-deps --entrypoint python \
  -e LILA_TEST_DATABASE_URL=postgresql://lila:lila_local_only@postgres:5432/lila \
  etl -m unittest discover -s services/etl/tests -v
```

After the supplied dataset has been imported and the web server is running, check the HTTP API:

```sh
LILA_API_URL=http://127.0.0.1:3000 npm run test:api
```

Change the URL if `WEB_PORT` is different. These HTTP tests expect the supplied dataset totals; the ETL tests use their own small fixtures.

On 5 November 2026, TypeScript checking, the production Next.js build, all seven Python/Spark tests (including PostgreSQL/MinIO integration), and all eight API tests passed. The full MinIO → Spark → PostgreSQL import published 89,016 retained events across 796 matches and 1,242 recorded participants. An unchanged rerun processed zero rows. Browser checks covered all three maps, heatmaps, filtering, playback, seeking, speed selection, and participant visibility. See [verification evidence](analysis/backend_verification/README.md). All three images built successfully, and complete Compose startup, all seven ETL tests, and all eight API tests also passed in the container setup. Restarting PostgreSQL and MinIO preserved the published events and raw files. Repeating startup skipped all 1,243 existing uploads and processed zero event rows.

On 6 November 2026, the Spark-only ETL refactor passed all eight ETL tests in a PyArrow-free image, all eight API checks, and a full container rebuild of the supplied dataset. Every event ID and stored event value matched the pre-refactor database. An unchanged container rerun processed zero rows. See [the refactor verification](analysis/spark_etl_refactor/README.md).

Later on 6 November, the Landing stage passed all 10 ETL tests and eight API checks. All 1,243 supplied files were uploaded under date-oriented Landing folders and sampled; 11 file samples differed from their folder dates and were retained with warnings. A subsequent run reused every receipt without Spark. Existing event IDs and values were unchanged, with 89,016 events still published. See [Landing verification](analysis/landing_ingestion/README.md), including the local image-build method used to conserve disk space.
