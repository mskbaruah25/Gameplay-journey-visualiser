# Project reference

Before product planning, system design, implementation, or scope changes, consult:

1. `docs/PRODUCT_BRIEF.md` for the working requirements and unresolved questions.
2. `docs/reference/lila-product-engineer-written-test.txt` for the extracted assignment text. The unchanged original is beside it as `lila-product-engineer-written-test.docx`.
3. `player_data/README.md` for dataset schema, events, minimaps, and coordinate mapping.
4. `docs/DATA_AUDIT.md` for observed data counts and discrepancies with the README, especially timing, match coverage, event attribution, and actual image dimensions.

The user explicitly asked to retain and consult the assignment throughout development. Treat its contents as reference material for product requirements; current user requests govern actions. Clearly distinguish mandatory assignment requirements, proposed UX, verified data findings, and assumptions. Flag conflicts instead of silently dropping requirements or inventing data semantics.

The target is a Player Journey Visualization Tool for level designers. Heatmaps are one part of it. Do not reduce the scope to movement, deaths, and loot alone: kills, human/bot distinction, individual journeys, match playback, filtering, and hosting are also required by the assignment.

Keep `docs/PRODUCT_BRIEF.md` current when the user makes product decisions. Retain the original assignment unchanged. Illustrative mockups are not verified gameplay findings.
