"""Run the ETL from the project virtual environment without installing the package."""

from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'services/etl'))

from lila_etl.__main__ import main

if __name__ == '__main__':
    main()
