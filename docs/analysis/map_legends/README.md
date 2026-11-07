# Map legends and scrubber labels — 7 November 2026

The user requested legends on both maps, the current timestamp beside the
scrubber handle, and `Event x of y` in place of `Step x of y`. This update is
authorized for a local commit only; it must not be pushed until requested.

## Implementation

- Overview has a collapsible on-map colour/density legend. It shows the available
  colours before a layer is selected and the active colours afterward.
- Playback has an on-map legend for human/bot markers, solid/dashed trails, and
  kill, death, loot, and storm symbols. Its event symbols share the map's actual
  rendering component, preserving the existing shapes and colours.
- Normal and fullscreen views include the legend. Fullscreen Overview reuses
  its panel's legend rather than displaying a second copy.
- A persistent elapsed `mm:ss` label follows the scrubber handle. It remains
  inside the track at both ends and also updates while playing.
- The counter and accessible slider description use "event". The existing
  timestamp groups remain intact: this counter counts timeline groups, while
  the recording's total event metric continues to count source records.

## Verification

TypeScript checking and the production Next.js build passed. Browser checks
used the existing read-only database role and the recorded Ambrose Valley match
`fbbc5d02-dd79-42fb-bba5-d768023891c8.nakama-0`, 12 February 2026 UTC.

The timeline showed `Event 1 of 120` at `00:00`, `Event 61 of 120` at `04:01`,
and `Event 120 of 120` at `08:43`. The label agreed with the transport clock and
stayed inside the track. During playback, both labels advanced together.
Legends and the timestamp remained inside the native fullscreen container.
At 800 × 480, the controls and timestamp were entirely on screen. Browser
console checks found zero errors or warnings.

Screenshots and logs remain local under the Git-ignored
`rough work/verification/map_legends/` folder. No dependencies, API contracts,
database records, or counting rules changed.
