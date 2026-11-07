# Graphite + Blue theme trial

The user chose this visual direction for branch `UI-1`. The interface uses
charcoal surfaces (`#101218` background, `#1B1F29` panels), neutral light text,
and blue (`#5B8DEF`) actions and selected controls. Colour roles live in
`apps/web/src/app/globals.css` and are shared with playback styling.

This covers navigation, fields, match search, statistics, legends, map tools,
fullscreen panels, playback transport, the timeline, and its timestamp label.
Gameplay colours, shapes, trails, and heatmap categories retain their meanings.
Marker outlines follow the neutral map canvas. No data, image assets, coordinate
mapping, API contracts, dependencies, or interaction rules changed.

## Verification

- TypeScript checking passed.
- The production Docker build passed on Node.js 22.
- The local web container was rebuilt and replaced, so both the development
  preview on 3002 and Docker application on 3101 show the trial.
- Browser checks confirmed the configured background, panel, and blue action
  colours in the rendered interface.
- Match search found the existing Ambrose Valley recording `fbbc5d02…` on
  12 February 2026 UTC. Heatmap selection worked and retained its gameplay colour.
- Playback seeking reached `Event 61 of 120` at `04:01`. The Play button was
  blue, while human markers remained green and bot markers remained cyan.
- Fullscreen Overview retained all five filters and its legend.
- Fullscreen Playback at 800 × 480 kept its controls and legend on screen.
- Browser console checks found no errors or warnings.

Calculated contrast ratios for the checked interface pairs were 14.53:1 for
primary text on panels, 7.25:1 for secondary text, 5.50:1 for subtle text,
5.71:1 for Play button text, and 4.76:1 for active navigation text. This is a
focused colour check, not an audit of every interface state or map pixel.

Screenshots, build logs, and contrast calculations remain local in the ignored
`rough work/verification/graphite_blue/` folder. The theme trial is local to
`UI-1`; it has not been pushed or deployed to the public hosted app.
