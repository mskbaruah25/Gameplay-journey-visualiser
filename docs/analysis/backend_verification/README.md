# Backend verification — 5 November 2026

These checks ran against the supplied data, through MinIO, Spark, PostgreSQL, and the production Next.js server. The source files were left unchanged. This is local verification; no Neon database or public deployment was changed.

Import/reconciliation reports remain beside this summary. Detailed HTTP output and development screenshots are retained locally under `rough work/verification/backend_verification/`, which is excluded from GitHub.

## Full import

| Check | Result |
| --- | --- |
| Raw files | 1,243 |
| Raw rows | 89,104 |
| Later identical whole-file copies | 1 file, containing 88 rows |
| Published events | 89,016 |
| Matches | 796 |
| Match-scoped recorded participants | 1,242 |
| Recorded match spans, in seconds | Minimum 13; median 382; maximum 890 |
| Unchanged rerun | 0 new files; 0 processed event rows |

The import also reconciled every event-label count with the retained-source audit. See [the full import report](full_import_report.json) and [the unchanged rerun report](unchanged_rerun_report.json). The full report lists affected matches because processing artifacts contain snapshots of those matches.

## Automated checks

- All four Python/Spark tests passed, including the PostgreSQL/MinIO integration test. They cover repeated loot, repeated combat flags, UTC midnight, preserved positions after death labels, actor classification by ID, copied files, stable IDs on rerun, additional recordings for an existing match, match-scoped bot identity, invalid maps, and failure rollback.
- All eight HTTP API tests passed against the complete imported dataset. They cover map metadata, all 796 matches, representative row counts, event pagination, simultaneous playback events, coordinate calculations on all three maps, heatmap count reconciliation, UTC filtering, and explicit invalid-input errors.
- TypeScript checking and the Next.js production build passed.
- The complete local Compose configuration passed validation.

## Browser checks

The connected interface loaded real recordings on Ambrose Valley, Grand Rift, and Lockdown. Date and match selection updated the displayed data. Heatmap selection and map zoom worked. Playback advanced through recorded timestamp groups, accepted the five speed controls, paused, and sought to the final frame. Hiding a participant removed that journey; showing it restored the journey. Returning to Overview cleared the selected layers. No browser warnings or errors were reported during these checks.

## Container checks

All three images built successfully with the active Docker engine. The complete Compose startup completed bucket initialization, SQL migration, upload of 1,243 raw files, Spark ingestion, and web startup. All four ETL tests passed inside the ETL image against isolated local test schemas/buckets. All eight API tests passed against the production web container.

[The container import report](container_full_import_report.json) reconciles with the earlier native run. [The reconciliation](container_reconciliation.json) confirms identical event IDs, counts, and recorded time spans. Restarting PostgreSQL and MinIO preserved their named-volume data. A second normal startup skipped all 1,243 uploads; [the unchanged container rerun](container_unchanged_rerun_report.json) processed zero new event rows and left 89,016 published events.

The running web address is `http://localhost:3101`; MinIO API/console use ports 19002/19003. These overrides are saved in the gitignored `.env`, leaving existing services on other ports untouched. No external database or deployment was changed.

## Connection follow-up

The host-run development preview on port 3000 now reads the same published local database as the Docker app on port 3101. Its missing database URL previously caused HTTP 503 responses. The URL is configured only in the gitignored `apps/web/.env.local`. All eight API tests pass against this development preview.

Three additional database-configuration tests cover direct Neon URL selection, local fallback, and rejection of a pooled Neon endpoint for ingestion. Together with the original four tests, all seven ETL tests pass inside the updated container. The web app applies its statement timeout inside read transactions so it does not depend on pooler session settings. Environment files are excluded from Docker build contexts.

Neon cloud authentication and project selection remain pending. No Neon database has been created or loaded; the local connection is verified.
