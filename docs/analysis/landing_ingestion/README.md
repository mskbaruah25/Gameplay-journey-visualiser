# Landing ingestion verification — 6 November 2026

The ingestion entry point is now `landing/<date>/<recording>` in MinIO/S3. The local upload helper only fills Landing. ETL samples one non-null physical timestamp per file using Spark, compares its seconds/UTC date with the date folder, and archives the exact bytes in the existing hash-based Raw layout. Date mismatches are recorded without discarding historical data. Processed rows retain the accepted UTC partitioning rule.

## Results

- All 10 ETL tests passed in the updated container image, including real isolated PostgreSQL/MinIO integration.
- Tests cover physical-order sampling, null timestamps, empty files, the limitation of a one-date sample across midnight, an empty installation, direct S3 uploads, immutable archive hashes, duplicate-file handling, retained loot multiplicity, incremental arrivals, and rollback after invalid transformed input.
- An unchanged integration rerun explicitly asserts that neither Landing nor downstream processing starts Spark.
- All eight read-only API checks passed against the running application on port 3101.
- Uploaded all 1,243 supplied originals to `landing/February_10/` through `landing/February_14/` without rewriting their contents.
- The first production-bucket run checked all 1,243 files. Eleven files had sampled dates different from their folder dates. This is a **file-sample count**, distinct from the earlier audit's 436 mismatching event rows. It does not establish that every other row matches its folder.
- All matching Raw archives already existed, so this upgrade wrote zero new Raw archives and processed zero gameplay rows. The integration test separately verifies promotion when Raw is initially empty.
- The next run reused all 1,243 Landing receipts, checked zero new files, and processed zero gameplay rows. It did not start Spark.
- Before/after event-ID and complete-event-value checksums match. The serving database retains 89,016 events, 796 matches, and 1,242 recorded participants.

## Evidence

- `rough work/verification/landing_ingestion/etl-tests.log`: complete ETL test output.
- `rough work/verification/landing_ingestion/api-tests.tap`: HTTP checks.
- `landing_upload.json`: supplied-file upload counts.
- `first_run.json`: full first Landing run report, including mismatch paths and dates.
- `unchanged_run.json`: cached-check rerun report.
- `reconciliation.json`: before/after database counts and checksums.
- Command and runtime logs are retained locally under `rough work/verification/landing_ingestion/`, which is excluded from GitHub. JSON reports remain beside this summary.

The normal image build selected a newer Python base and began reinstalling dependencies. It was deliberately stopped before downloading another Spark runtime because local disk space was low. A temporary source-only Docker build reused the existing tested `lila-etl:local` runtime and copied in the updated `services/etl/` directory. All tests and imports above ran from that updated image. Dependency requirements and the project Dockerfile are unchanged; a clean dependency rebuild was not repeated for this change. No unrelated containers or data volumes were removed.
