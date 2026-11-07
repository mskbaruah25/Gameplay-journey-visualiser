# Fullscreen UI verification — 7 November 2026

The user requested heatmap controls and a map legend in fullscreen Overview,
and the timestamp scrubber in fullscreen Playback.

The fullscreen container now includes the map and playback footer. The existing
playback controls stay mounted once, preserving their state and label targets.
A collapsible Overview panel reuses the sidebar's heatmap controls and state.
Its legend shows selected layer colours and explains relative density. The
panel and timeline are outside the draggable canvas, so controls work at any
map zoom level. No dependencies, API contracts, or data rules changed.

## Checks

- `npm run typecheck` passed.
- `npm run build` passed.
- A local production preview used the existing read-only Neon role and imported
  recordings, including Ambrose Valley match
  `fbbc5d02-dd79-42fb-bba5-d768023891c8.nakama-0` on 12 February 2026 UTC.
- Native browser fullscreen contains the Overview filters and legend. Traffic,
  kill, and death layers render; their colour keys follow the selection.
- Opacity set to 100% in fullscreen also updates the sidebar to 100% and the
  rendered overlay opacity to 1. No duplicate element IDs were present.
- Collapsing the panel works. Exiting fullscreen retains the selected layers.
  Reset clears the layers and restores opacity to 75%.
- Fullscreen Playback contains exactly one scrubber. Seeking to its last step
  reaches step 120 of 120 at 08:43 while zoomed to 125%, without panning the map.
- Restart and speed controls work. Exiting fullscreen preserves the recorded
  position, running playback, and selected 2x speed.
- At 800 × 480, the heatmap panel fits vertically with internal scrolling.
  Playback controls remain entirely on screen and do not overlap the map canvas.
- Browser console: zero errors or warnings during the checked flow.

Screenshots and verbose output remain local in the Git-ignored
`rough work/verification/fullscreen/` folder. Normal and fullscreen views use
the same recording, timestamp groups, and heatmap requests.
