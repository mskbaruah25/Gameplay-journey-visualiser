# Architecture

Let’s follow a gameplay recording from its source file to the map. We prepare the data separately, so a level designer can open the tool and start exploring.

## Choosing Our Stack

- **Next.js, React, TypeScript:** we keep the interface/API together and share typed contracts. SVG overlays draw journeys, events, and heatmaps.
- **Neon PostgreSQL:** related tables organize maps, matches, participants, and events. Indexes make filtering efficient.
- **Python/Spark:** one batch pipeline validates and transforms Parquet. Private S3-compatible storage retains originals and processed files.
- **Deployment:** Vercel hosts the app; Neon provides database/storage. Docker Compose supports development and separate ingestion. The hosted tool works independently of our development machine.

## Following the Data

`Parquet → Landing → Raw archive → Spark → PostgreSQL → Next.js API → Browser`

1. **First, receive the files.** Uploads enter Landing. We archive originals unchanged so we can revisit them and trace each record’s source.
2. **Next, prepare the records.** Spark decodes labels, validates fields, and calculates coordinates. We keep the earliest identical file copy; file hashes and original row numbers preserve event identities. Processed Parquet follows UTC event dates.
3. **Then, publish the changes.** We rebuild affected matches and skip unchanged inputs. Updates commit together, so a failed import leaves existing events intact.
4. **Now, display the recording.** APIs return metrics, heatmap grids, and timestamp-grouped events from consistent database snapshots. Playback uses loaded records without requesting data for every frame.

## Placing a Player on the Map

We use world **X/Z** for the top-down position. **Y remains elevation.** Each map’s origin and scale come from [config/maps.json](config/maps.json):

```text
u = (x − origin_x) / scale; v = (z − origin_z) / scale
image_x = u × rendered_width; image_y = (1 − v) × rendered_height
```

The `1 − v` flips the vertical axis to match the image’s top-left origin. For example, Ambrose Valley’s `(−301.45, −355.55)` becomes approximately `(78, 890)` on a 1024×1024 reference image. We use the supplied maps’ actual aspect ratios when drawing overlays.

## Reading the Data Carefully

Before interpreting what we see, we need a few conventions:

- **Time:** we treat source integers as epoch seconds despite their millisecond label; recorded spans of 13–890 seconds support this choice. UTC event dates drive filters, including recordings that cross midnight.
- **Identity and counts:** UUIDs identify humans; numeric IDs identify bots within matches. Kill credit follows the recorded actor. Each Loot row counts as one item. Repeated combat rows remain included; unique-incident interpretation is unresolved.
- **Playback:** simultaneous records stay together. We skip between timestamps, avoid interpolation, break trails across gaps over 15 seconds, and retain post-death positions without inferring respawn.
- **Coverage:** we show recorded participants, not complete lobbies. Traffic counts samples, not time spent. Opponents, extraction outcomes, and storm boundaries remain unknown.

## Tradeoffs We Accepted

| Choice | What we gain / accept |
| --- | --- |
| Spark batch processing | One repeatable pipeline; extra runtime overhead for this small dataset. |
| Stored match summaries and indexed events | Fast catalogue queries; summaries publish atomically with events. Detailed metrics remain on demand. |
| Free hosting and manual ingestion | Independent web availability at low cost; uploads need an ETL run. |

The analysis and experiments behind these choices are in [Insights](INSIGHTS.md).

## TODO: Cloud Capacity Assessment

- [ ] **9 November 2026:** Estimate how much data the current design can handle on a minimal-cost Azure or AWS setup. Define the compute, database, and storage configuration and monthly cost. Assess total data volume, ingestion throughput, playback size, and concurrent usage. Document assumptions, bottlenecks, and the testing needed to validate the estimates.
