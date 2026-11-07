"""Recheck submission insights against retained source recordings.

This is an independent PyArrow check in the optional exploration environment.
The production ETL remains Spark-only. Run from any directory with:
    .venv/bin/python "rough work/scripts/build_insight_evidence.py"
"""

from collections import Counter, defaultdict
import csv
import hashlib
import json
from pathlib import Path
from statistics import median

import pyarrow as pa
import pyarrow.parquet as pq

ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "rough work/analysis/submission_insights"
GRID_SIZE = 32
EXAMPLE_MATCH = "fbbc5d02-dd79-42fb-bba5-d768023891c8.nakama-0"


def write_csv(name, rows):
    with (OUTPUT / name).open("w", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=list(rows[0]), lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)


def main():
    maps = {item["id"]: item for item in json.loads((ROOT / "config/maps.json").read_text())}
    files = sorted((ROOT / "player_data").glob("February_*/*.nakama-0"))
    seen = set()
    events = []
    source_rows = 0
    for path in files:
        table = pq.read_table(path)
        source_rows += table.num_rows
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        if digest in seen:
            continue
        seen.add(digest)
        # Recover the stored integer before applying the accepted seconds convention.
        table = table.set_column(table.schema.get_field_index("ts"), "ts", table["ts"].cast(pa.int64()))
        for row_number, event in enumerate(table.to_pylist()):
            event["event"] = event["event"].decode("utf-8")
            event["actor_type"] = "bot" if event["user_id"].isdigit() else "human"
            event["source_path"] = path.relative_to(ROOT / "player_data").as_posix()
            event["source_row_number"] = row_number
            events.append(event)

    # The earlier executed notebook exported an independent count under this policy.
    with (ROOT / "rough work/analysis/focused_final_pass/duplicate_policy_event_counts.csv").open() as file:
        expected = {row["event"]: int(row["one_copy_per_file"]) for row in csv.DictReader(file)}
    counts = Counter(event["event"] for event in events)
    if counts != expected:
        raise ValueError("Source counts changed; review the notebook evidence before publishing insights.")

    starts = {}
    journeys = defaultdict(set)
    cells = defaultdict(lambda: {"samples": 0, "journeys": set(), "matches": set()})
    for event in events:
        match_id = event["match_id"]
        starts[match_id] = min(starts.get(match_id, event["ts"]), event["ts"])
        journey = (match_id, event["user_id"])
        journeys[event["map_id"], event["actor_type"]].add(journey)
        if event["event"] not in ("Position", "BotPosition"):
            continue
        config = maps[event["map_id"]]
        u = (event["x"] - config["origin_x"]) / config["world_scale"]
        image_y = 1 - (event["z"] - config["origin_z"]) / config["world_scale"]
        key = (event["map_id"], event["actor_type"], min(31, int(u * GRID_SIZE)), min(31, int(image_y * GRID_SIZE)))
        cell = cells[key]
        cell["samples"] += 1
        cell["journeys"].add(journey)
        cell["matches"].add(match_id)

    traffic = []
    for (map_id, actor, x, y), cell in sorted(cells.items()):
        config = maps[map_id]
        traffic.append({
            "map_id": map_id, "actor_type": actor, "cell_x": x, "cell_y": y,
            "movement_samples": cell["samples"], "recorded_journeys": len(cell["journeys"]),
            "matches": len(cell["matches"]), "map_actor_journeys": len(journeys[map_id, actor]),
            "world_x_min": config["origin_x"] + x / GRID_SIZE * config["world_scale"],
            "world_x_max": config["origin_x"] + (x + 1) / GRID_SIZE * config["world_scale"],
            "world_z_min": config["origin_z"] + (1 - (y + 1) / GRID_SIZE) * config["world_scale"],
            "world_z_max": config["origin_z"] + (1 - y / GRID_SIZE) * config["world_scale"],
        })
    ambrose = [row for row in traffic if row["map_id"] == "AmbroseValley" and row["actor_type"] == "human"]
    most_visited = sorted(ambrose, key=lambda row: (-row["recorded_journeys"], row["cell_x"], row["cell_y"]))[0]
    most_samples = sorted(ambrose, key=lambda row: (-row["movement_samples"], row["cell_x"], row["cell_y"]))[0]

    storms = [{
        "map_id": event["map_id"], "match_id": event["match_id"],
        "source_path": event["source_path"], "source_row_number": event["source_row_number"],
        "elapsed_seconds": event["ts"] - starts[event["match_id"]], "x": event["x"], "z": event["z"],
    } for event in events if event["event"] == "KilledByStorm"]
    storms.sort(key=lambda row: (row["elapsed_seconds"], row["match_id"]))
    loot = [{
        "actor_id": event["user_id"], "actor_type": event["actor_type"],
        "elapsed_seconds": event["ts"] - starts[event["match_id"]], "x": event["x"], "z": event["z"],
        "in_cluster": -55 <= event["x"] <= -40 and -360 <= event["z"] <= -350,
    } for event in events if event["match_id"] == EXAMPLE_MATCH and event["event"] == "Loot"]
    loot.sort(key=lambda row: row["elapsed_seconds"])
    report = {
        "method": {
            "policy": "Earliest byte-identical file copy; preserve every row within retained files.",
            "grid": "32 by 32, zero-based cells, image origin top-left; same method as exp.ipynb section 13.",
            "time": "Original timestamp integers as seconds, relative to the earliest retained record in each match.",
            "scope": "Descriptive source checks for the INSIGHTS draft; design actions are proposals, not measured outcomes.",
        },
        "dataset": {"supplied_files": len(files), "supplied_rows": source_rows, "retained_files": len(seen),
                    "retained_events": len(events), "matches": len(starts), "event_counts": dict(counts)},
        "traffic": {"most_visited_human_cell_ambrose": most_visited,
                    "highest_sample_human_cell_ambrose": most_samples},
        "storm": {"labels": len(storms), "matches": len({row["match_id"] for row in storms}),
                  "minimum_elapsed_seconds": min(row["elapsed_seconds"] for row in storms),
                  "median_elapsed_seconds": median(row["elapsed_seconds"] for row in storms),
                  "maximum_elapsed_seconds": max(row["elapsed_seconds"] for row in storms),
                  "labels_at_or_after_12_minutes": sum(row["elapsed_seconds"] >= 720 for row in storms)},
        "loot_example": {"match_id": EXAMPLE_MATCH, "rows": len(loot),
                         "actor_ids": sorted({row["actor_id"] for row in loot}),
                         "cluster_rows": sum(row["in_cluster"] for row in loot),
                         "cluster_world_bounds": {"x": [-55, -40], "z": [-360, -350]}},
    }
    OUTPUT.mkdir(parents=True, exist_ok=True)
    write_csv("traffic_cells.csv", traffic)
    write_csv("storm_deaths.csv", storms)
    write_csv("example_loot.csv", loot)
    (OUTPUT / "summary.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps({"dataset": report["dataset"], "traffic": report["traffic"],
                      "storm": report["storm"], "loot_example": report["loot_example"]}, indent=2))


if __name__ == "__main__":
    main()
