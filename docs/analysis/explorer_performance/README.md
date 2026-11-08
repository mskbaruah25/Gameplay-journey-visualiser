# Match Discovery and Playback Verification

Initially verified on 8 November 2026 against an isolated copy of the local
supplied-data database. The migration was subsequently applied to the live Neon
and original local databases at the user's request, before the web release.

## Changes

- Match discovery reads full-match and UTC-date summaries, published atomically
  with their events. Search and participant filters run on the server.
- The interface requests one page of 50 choices, preserves catalogue numbers
  and the active match, and resets filters when map/date changes.
- Playback indexes participant samples once. Binary lookup and cached SVG
  chunks retain every recorded position without one element per historical point.

## Automated Checks

| Check | Result |
| --- | --- |
| TypeScript and production build | Passed |
| API regression suite | 10 passed against development and production servers |
| ETL regression suite | 10 passed, including new summary assertions |
| Playback regression suite | 3 passed |
| Repeated migration | Passed; existing events unchanged |
| Summary reconciliation | All 1,595 scopes match independent event aggregates |
| Complete stored-event comparison | All 89,016 rows match the original database |

The ETL checks include an empty installation, copied files, unchanged reruns,
new participants in existing matches, distinct counts across midnight, and
preservation of published summaries after failed imports. Playback checks cover
simultaneous positions, backward seeking, post-death samples, exact gap handling,
and trail continuity across chunk boundaries.

## Browser Checks

- Initial loading made one match-list request with `limit=50&offset=0`.
- Paging, ID/number search, clear search, and the participant filter preserved
  the selected match and original numbering, including Match 114.
- Empty search results and an installation with no available dates remained
  usable. Returning to another map reset the search.
- The example recording retained all 995 positions across 16 participants at
  its final frame, using 112 SVG elements and 32 paths.
- Seeking, play/pause, speed selection, participant visibility, keyboard marker
  inspection, traffic heatmaps, and fullscreen controls passed.
- Pagination buttons fit a 390-pixel viewport. No browser console errors occurred.
- Production-build browser checks retained the example's 995 positions.

## Synthetic Playback Check

A browser-only mocked API response contained **50,000 positions across 100
participants and 500 timestamp groups**. It created no database records.

- The final frame retained all 50,000 samples using **1,300 SVG elements**,
  including 800 trail/point paths and 150 circles for current-marker graphics.
- Hiding a participant removed its journey. Seeking backward to the first group
  showed precisely 100 samples, with no future positions retained.

This verifies the rendering behavior of that fixture. It is not a frame-rate,
concurrent-user, ingestion-throughput, or five-billion-event capacity benchmark.

## Migration

Applied on 8 November 2026 after testing twice on a branch of the live production
data. Both live and local databases retain all 89,016 original event values and
contain 1,595 full-match/UTC-date summaries. Every live summary reconciles with
an independent event aggregate. The website role can read the new table and
cannot insert, update, or delete its rows. Public health, match count, and example
recording checks returned HTTP 200 with their expected values. The test branch
is retained for verification; its compute was suspended after testing.

Detailed execution reports remain in the ignored local verification folder.
Application deployment is a separate step from applying the migration.

Apply `002_match_summaries.sql` through the ETL `migrate` command before serving
the updated web application. It backfills existing data once; later runs use
`schema_migrations`. Separately managed read-only roles need SELECT access to
`match_summaries`. See the [development guide](../../DEVELOPMENT.md#api).
