# Designer exploration improvements

Implemented on `extra-features`, 8 November 2026. This work adds the five
requested usability features without changing ETL rules or gameplay records.

## Implementation

| Feature | Behavior |
| --- | --- |
| Readable text | Supporting labels are at least 12px; primary controls use 13–14px. Mobile and fullscreen styles retain the minimum. |
| Collapsible panels | Sidebar and Overview statistics hide independently. Visible Show controls restore them and preserve selection/settings. |
| Participant discovery | Match options show recorded human/bot counts for the selected date. Search combines with a Multiple recorded participants checkbox. Original match numbering stays stable; the current match remains available outside filtered results. |
| Combat navigation | Three timeline lanes show kill labels, combat-death labels, and storm deaths. Clicking pauses and seeks to the exact timestamp group. An exact timestamp menu handles crowded markers. Simultaneous and repeated source records remain included. |
| Marker inspection | Current participant and event markers support mouse and keyboard activation. A scrollable inspector shows raw event type, full recorded actor ID/type, elapsed time, UTC timestamp, and world X/Y/Z. A selector exposes simultaneous records. Close/Escape returns focus to the marker; seeking/changing recordings clears the inspector. |

Coordinate display rounds to three decimals; the tooltip retains the numeric
value from the API. Y is elevation. Neither the timeline nor inspector infers
a victim, respawn, or missing participant. Heatmaps remain aggregate displays;
individual marker inspection is part of Playback.

The typography follows the supporting/body hierarchy in
[Carbon's productive typography guidance](https://v10.carbondesignsystem.com/guidelines/typography/productive/).
Optional panels stay accessible through explicit controls, applying
[progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/).

## Code organization

- `server/gameplay/queries.ts` adds date-scoped distinct participant counts to
  match options and metadata. The six-table schema is unchanged.
- `overview/components/explorer-sidebar.tsx` owns sidebar presentation;
  `match-selector.tsx` owns local search and participant filtering.
- `playback/components/combat-timeline.tsx` derives combat moments once per
  loaded recording and draws the timeline navigation.
- `playback/components/inspectable-marker.tsx`, `marker-inspector.tsx`, and
  `hooks/use-marker-inspection.ts` handle selection, details, and focus.
- Shared event classification is in `playback/event-details.ts`; workspace,
  combat timeline, and inspector styles live beside their features.

No dependency was added. The existing recording response supplies inspection
and navigation data; advancing playback does not request another SQL result.

## Verification

- TypeScript checking passed.
- The production Next.js build passed inside the web image.
- All nine API checks passed against the source preview, including the added
  participant-count test. The full listing accounts for all 89,016 retained
  events across 796 matches, of which 53 have multiple recorded participants.
  Cross-midnight date-scoped option
  counts agree with the corresponding Overview metrics.
- Ambrose Valley on 12 February 2026 has 127 choices. Its multiple-participant
  filter finds five choices. Searching/selecting `fbbc5d02…` displays
  `Match 114 · 1 human · 15 bots` and retains that number.
- At 1440px width, hiding both panels increased the tested map canvas from
  approximately 1054 × 407px to 1374 × 619px. Show controls restored both
  panels without changing the recording.
- Browser checks verified kill/death timeline jumps, the precise timestamp
  menu, pause-on-jump, inspector actor/coordinate agreement with the API,
  keyboard activation, focus return, simultaneous record selection, and
  clearing details after seeking.
- A real `KilledByStorm` record in `5a081fe4-9dfd-4fdc-bdb8-68b57b856b7c.nakama-0`
  on 10 February was reached through its timeline indicator and inspected.
- Fullscreen Playback retained its scrubber, all combat lanes, legend, and
  inspector. Fullscreen Overview retained shared heatmap filters.
- At 390 × 844, the tested layout had no horizontal page overflow. Sidebar
  collapse/reopen, keyboard marker activation, and inspector scrolling worked.
  The inspector's Close control stays visible while its contents scroll.
- The source-preview browser checks produced no application warnings or errors.

The machine ran out of disk space during container replacement. Docker reported
an internal read-only filesystem, and the first image had truncated generated
manifests. After the user freed space and authorized a Docker Desktop restart,
the application build/runtime stages were rebuilt. All 75 generated JSON files
in the replacement image parsed successfully. PostgreSQL, MinIO, and the web
app recovered; all nine API checks passed against port 3101. Browser checks on
that production container confirmed match counts/filtering, panel collapse,
combat seeking, and fullscreen marker inspection, with no console errors or
warnings. Dataset totals remained unchanged. No source data or volume was reset.

Screenshots and detailed logs remain local in the Git-ignored
`rough work/verification/extra_features/` folder. No push or public deployment
was performed.
