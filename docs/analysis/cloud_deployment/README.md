# Cloud deployment verification — 7 November 2026

The designer flow is: choose map/date/match in the public Next.js interface,
read the corresponding Neon PostgreSQL records through the API, then display
heatmaps or recorded journeys and events during playback.

Public URL: https://gameplay-journey-visualiser.vercel.app

Vercel Hobby hosts the interface and API in `sin1`. Neon Free provides the
dedicated PostgreSQL 17 database and private S3-compatible bucket in Singapore.
The user authorized a new project in any suitable region while keeping hosting
free. No paid plan, domain purchase, or always-on Spark service was configured.

## Data reconciliation

All 1,243 originals were uploaded to Landing. The successful full import published
89,016 retained events across 796 matches and 1,242 match-scoped participants.
One later byte-identical file copy contributes the excluded 88 rows, out of
89,104 source rows. All eight event-label totals match the verified local data.
The existing 69 repeated-combat flags and 174 post-death position flags remain.

| Comparison with local baseline | Result |
| --- | --- |
| Event count, match count, participant count | Exact match |
| Every event-type count | Exact match |
| Ordered event IDs, MD5 | `86708a40de5fcffc97abd976522bd31f` |
| Ordered complete stored event rows, MD5 | `6f39fef6eda20a60edc82b5cde12ffec` |

The complete-row comparison uses `md5(string_agg(to_jsonb(events)::text, ','
ORDER BY id))` with the PostgreSQL session in UTC; identity comparison uses
`md5(string_agg(id::text, ',' ORDER BY id))`. These are reconciliation checksums,
not security signatures. Every field compared equal in the local and cloud
snapshots. The fresh cloud database occupies approximately 55.5 MiB.

An unchanged rerun discovered 1,243 files, reused all Landing checks, processed
zero new files and zero rows, and did not start Spark. Eleven sampled dates
differ from their source folders; they remain warnings under the accepted rule.

The first cloud attempt was stopped before any database publication because
serial small-file transfers were slow. It is explicitly marked failed in run
history. The successful retry reused 184 immutable Raw objects and archived the
remaining 1,059. Original-file transfers now use at most eight threads; source
ordering, Spark transformations, event IDs, and counting rules are unchanged.

## Verification results

| Boundary | Evidence |
| --- | --- |
| Container ETL | All 10 tests pass, including a transfer-worker hash failure that leaves previously published events unchanged |
| Production build | Vercel built the application successfully on Node.js 22; local TypeScript and production build checks also passed |
| Public access | Anonymous production health request returns `status: ok`, `database: connected`, and the last successful import time |
| API → database → response | All eight existing API tests pass against the public URL, covering counts, playback, coordinates on every map, heatmaps, UTC dates, and invalid requests |
| Response → interface | All three basemaps load with imported dates, match choices, and recorded playback steps; no alert or browser console error |
| Heatmaps | Traffic, kill, and death layers can be selected together; the multi-participant match shows 1 human, 15 bots, 995 position samples, and 1,015 total events |
| Playback | 120 timestamp groups span 08:43 in the tested match; play/pause, 2x speed, seek-to-end, and restart work |
| Journey visibility | Hiding the human changes rendered journey groups from 16 to 15; restoring it returns the journey |

The representative multi-participant match is
`fbbc5d02-dd79-42fb-bba5-d768023891c8.nakama-0`, on Ambrose Valley,
12 February 2026 UTC. Grand Rift and Lockdown also load their corresponding
images and non-empty playback timelines. The complete dataset remains governed
by the documented event-label and coverage limitations.

## Evidence files

- `landing_upload.json`: initial supplied-data upload counts.
- `full_import_report.json`: successful import, including date warnings and run ID.
- `unchanged_import_report.json`: successful zero-change rerun.
- `local_baseline.json` and `cloud_snapshot.json`: matching dataset snapshots.
- `reconciliation.json`: comparison results for every baseline field.
- `public_health.json`: anonymous production health response.
- `deployment_info.json`: non-secret resource and initial build identifiers.

Verbose ETL/API logs, browser traces, and overview/playback screenshots remain
local in the Git-ignored `rough work/verification/cloud_deployment/` folder.
Database URLs, passwords, storage credentials, `.env.cloud`, and Vercel local
configuration are excluded from Git. The web API role can SELECT and cannot
INSERT, UPDATE, or DELETE; ETL uses a separate direct owner connection.

Ingestion is a manual Docker job. No automatic cloud ingestion schedule is
claimed. The public app continues working when local containers are stopped.
