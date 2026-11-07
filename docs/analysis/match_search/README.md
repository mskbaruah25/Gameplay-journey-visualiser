# Match search verification

The Match field now includes a search input and clear button. Search filters
the complete loaded list for the selected map and UTC date by number, displayed
label, or partial/full ID, ignoring case and surrounding whitespace. Original
numbers remain stable. The current recording stays selected while searching,
even if it appears outside the results; selecting a result changes the map.
No API or telemetry rules changed, and no dependency was added.

## Verified behavior

- TypeScript checking and the production Next.js build passed.
- Ambrose Valley, 12 February 2026 UTC, contains 127 selectable matches.
- Searching `fbbc5d02`, `Match 114`, and `114` finds
  `Match 114 · fbbc5d02` with its original number.
- Searching the complete uppercase ID with surrounding spaces finds the same
  recording. Choosing it loads the corresponding match.
- Searching a nonexistent ID shows a no-results message and keeps the active
  recording under "Currently selected".
- Clear restores all 127 choices, preserves the active recording, and returns
  keyboard focus to the search input.
- Switching between Overview and Playback preserves the search and selection.
  Changing the date or map clears the query and shows the new list.
- At 390 × 844, the field fits without horizontal page overflow.
- Browser console checks found no errors or warnings.

Browser checks used the existing local preview and read-only database
connection. Screenshots and detailed logs remain local under the Git-ignored
`rough work/verification/match_search/` folder. This feature is committed
locally; pushing remains deferred under the user's earlier instruction.
