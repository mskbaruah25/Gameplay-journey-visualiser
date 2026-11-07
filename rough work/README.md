# Data exploration and experiments

This folder shows the investigation behind the application and its data-handling
decisions. The notebooks, SQL, and supporting tables are included for assessment;
the application does not import them. The whole folder stays excluded from Docker
build contexts.

## Suggested reading order

1. Read the [accepted data decisions](../docs/DATA_NUANCES.md) for the current interpretation used by the application.
2. Open [the original exploration](notebooks/exp.ipynb) for schema checks, event metrics, coordinates, and the combat investigation.
3. Open [the focused final pass](notebooks/focused_final_pass.ipynb) for duplicate-file checks, timestamp validation, sampling gaps, and independent counts.
4. Inspect the [experimental SQL](queries/) and [supporting tables](analysis/) for detailed evidence.

## What the experiments established

- All recorded match spans were checked before accepting the timestamp integers as seconds.
- Whole-file copies and repeated event payloads were investigated separately.
- The killer/victim experiment tested matching timestamps and subsequent movement. It did **not** establish a universal rule or verified opponent identities.
- Sparse match coverage, midnight crossings, and positions after death labels were documented before deciding how to display the supplied records.

Saved outputs are retained. Some notebook sections contain historical assumptions
or alternative diagnostic policies. The accepted decisions in the linked document
and [product brief](../docs/PRODUCT_BRIEF.md) govern the application.

The earlier notebook backup, duplicate exploratory Python script, unfinished Word
journal, detailed logs, and development screenshots remain local and Git-ignored.
Verification summaries and selected reports are in [the project evidence](../docs/analysis/).

## Running the exploration locally

From the project root, install the optional exploration dependencies if needed:

```sh
.venv/bin/pip install -r "rough work/requirements.txt"
```

Run either maintained notebook using the existing virtual environment:

```sh
.venv/bin/python "rough work/scripts/execute_notebook.py" exp.ipynb
.venv/bin/python "rough work/scripts/execute_notebook.py" focused_final_pass.ipynb
```

The helper runs cells from the project root. The notebooks also find the project
when opened from their own folder, and write derived results under `analysis/`.
They require the supplied `player_data/`, Java 17+, and localhost socket access
for Spark and Jupyter. Old paths printed in saved outputs describe earlier runs;
the outputs have not been regenerated for repository organization.
