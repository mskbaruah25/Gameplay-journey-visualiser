"""Prepare browser-sized visual assets. Does not read gameplay telemetry.

Optional regeneration: .venv/bin/python scripts/prepare_minimaps.py
Original minimaps are preserved. Requires Pillow from the exploration environment.
"""

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "apps/web/public/maps"


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for map_id, extension in [("AmbroseValley", "png"), ("GrandRift", "png"), ("Lockdown", "jpg")]:
        with Image.open(ROOT / f"player_data/minimaps/{map_id}_Minimap.{extension}") as image:
            image.thumbnail((1920, 1920), Image.Resampling.LANCZOS)
            image.convert("RGB").save(OUTPUT / f"{map_id}.webp", quality=88)
        print(f"Prepared {map_id}.webp")


if __name__ == "__main__":
    main()
