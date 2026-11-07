# Spark-only ETL verification — 6 November 2026

The user requested replacing PyArrow throughout the ETL. Spark now reads original Parquet files, recovers timestamp values, attaches physical source-row identities, performs transformations, and writes processed Parquet. Test fixtures are also generated with Spark. The ETL image does not contain PyArrow; existing exploration notebooks keep their separate dependencies.

Import/reconciliation reports remain beside this summary. Detailed test logs and HTTP output are retained locally under `rough work/verification/spark_etl_refactor/`, which is excluded from GitHub.

## What changed

- `source.py` reads one folder of retained original files and joins their source inventory. `_metadata.row_index` supplies each record's original zero-based Parquet position, including identical payloads. Existing UUIDv5 event identities are preserved.
- `unix_millis` recovers the integer stored under the misleading millisecond timestamp label. The accepted seconds interpretation is then applied in `transform.py`.
- The extra converted input staging file is removed. `transform.py` receives a Spark DataFrame directly.
- Spark writes temporary CSV files with explicit UTC timestamps for PostgreSQL `COPY`. It stops before the load; Python streams bytes in one-MiB chunks. The temporary files are deleted after the run.
- Source registry schemas use Spark SQL type names. Original Parquet bytes and timestamp annotations remain in MinIO.
- Reader version `2026-11-06-v2` triggers one complete revalidation when upgrading. Subsequent unchanged runs process zero event rows.

## Full-dataset comparison

The comparison uses the published database from before this refactor as the reference. It checks an ordered fingerprint of every event ID and another of all stored event values, including source identity, source row number, labels, raw timestamps, dates, coordinates, normalized coordinates, and diagnostic flags. The database also enforces that `occurred_at` equals the recovered epoch-seconds value.

| Check | Result |
| --- | --- |
| Raw files and rows | 1,243 files; 89,104 rows |
| Excluded copied file | 1 file; 88 rows |
| Published events | 89,016 |
| Matches | 796 |
| Match-scoped participants | 1,242 |
| Event identities | Exactly unchanged |
| Stored event values | Exactly unchanged |
| Unchanged rerun | Zero new files and zero processed rows |

See the [initial Spark reconciliation](reconciliation.json), [container reconciliation](container_reconciliation.json), [container full import report](container_full_import_report.json), and [container unchanged rerun report](container_unchanged_rerun_report.json).

## Runtime checks

The rebuilt image was checked with `importlib.util.find_spec('pyarrow')`: it returned `None`. Its Spark JVM heap was verified as 512 MiB, matching the configurable local default.

The initial full-container attempts exhausted Docker's shared memory during Spark-to-Python row collection. Both failed attempts left the published events intact. Replacing that transfer with Spark-written COPY files allowed the complete import to succeed without stopping any unrelated services. This is an execution change, not a change to gameplay interpretation.

The ETL suite covers direct/local database configuration, copied files, repeated loot, post-death samples, timestamp recovery, UTC midnight, actor classification, physical row identities despite unsorted timestamps/repartitioning, incremental arrivals, unchanged reruns, and validation rollback. HTTP checks cover all eight existing API cases; their output is saved in api-tests.tap (local archive: `rough work/verification/spark_etl_refactor/api-tests.tap`).

All eight ETL tests passed inside the final PyArrow-free image, and all eight HTTP API tests passed against the published dataset. The final container rerun processed zero new rows. See etl-tests.log (local archive: `rough work/verification/spark_etl_refactor/etl-tests.log`) and api-tests.tap (local archive: `rough work/verification/spark_etl_refactor/api-tests.tap`).
