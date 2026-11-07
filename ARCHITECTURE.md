# Player journey tool architecture

Next.js serves the interface and read-only JSON API. PostgreSQL is the serving database, with Neon chosen for deployment and an optional local container for development. Python and Spark perform ingestion in a separate container. MinIO stores Landing uploads, immutable source Parquet, affected-match processing artifacts, and run reports. Docker Compose starts storage, bucket initialization, migration, ETL, and the application; local demo upload is optional.

## Data flow

Uploaders write `landing/<date>/<recording>` objects directly to S3/MinIO. ETL samples one non-null timestamp per new object with Spark, applies the accepted seconds/UTC interpretation, and compares its date with the folder. Mismatches are logged and retained. It hashes and archives the exact downloaded bytes under `raw/<sha256>/<source-path>`. A bucket-local manifest records object versions and sample results for retries; it does not certify every row's date. The optional local loader only populates Landing.

ETL freezes the Raw file inventory, verifies hashes, and keeps the earliest source-folder copy of identical content. Spark reads downloaded originals in one batch, captures their physical Parquet row indexes, and joins source metadata. It recovers the source millisecond-labeled integers with `unix_millis` before applying the accepted seconds interpretation. Spark validates and transforms events and writes processed Parquet partitioned by each row's UTC date. New files cause affected matches to be reconstructed from all their retained recordings.

PostgreSQL has six application tables: `maps`, `matches`, `match_participants`, `events`, `source_files`, and `etl_runs`. Deterministic content/row IDs preserve repeated payloads and safe reruns. Spark writes temporary CSV transport files with UTC timestamps and stops before loading. PostgreSQL streams those files through `COPY` into a temporary staging table, publishing affected matches in one transaction. Failures leave prior events unchanged. An advisory lock prevents competing imports. Source paths and run versions preserve traceability.

## Coordinate and playback rules

World X/Z locate the point; Y remains elevation. For each map, subtract its X/Z origin and divide by its world scale. Image X is the normalized X fraction; image Y is one minus the normalized Z fraction. Draw these fractions against the actual image aspect ratio, rather than assuming 1024 square pixels. Native sizes are 4320 square, 2160 by 2158, and 9000 square.

Use the original timestamp integers as seconds and derive event dates explicitly in UTC. One playback frame contains every event at one timestamp. Playback advances through frames, with no generated intermediate positions. Positions after death labels remain visible. Human/bot IDs are scoped to a match, and markers distinguish them. The date filter selects event rows; omitting it from the API returns the full available match. Elapsed time uses the full match's first available event.

## Decisions and tradeoffs

- Keep original recordings, count each retained Loot row as one item, and credit kill labels to their recorded actor. No verified opponent link or respawn state is invented. Repeated combat counting remains unresolved; current totals explicitly count retained labels.
- Calculate metrics and heatmap grids directly from indexed events initially. Add rebuildable summary tables only if measurements justify them. Playback and overview read coherent database snapshots and use uncached API responses.
- Preserve raw originals while publishing only the first whole-file copy. Reject conflicting replacement snapshots at one source path until a replacement policy exists; support additional recordings under new paths.
- Download original Parquet through the S3 client, then use Spark for all Parquet reads/writes. This avoids S3A connector dependencies and an extra converted staging file. Physical row indexes preserve existing UUIDv5 event identities, including repeated payloads. Processed folders are per-run affected-match snapshots, not a globally additive export.
- Build a pinned historical MinIO source release for local reproducibility because its old public images are unavailable. Maintained AIStor licensing or another S3-compatible deployment remains a hosting choice. Authentication, final hosting, and deployment are not implemented by this backend step.
