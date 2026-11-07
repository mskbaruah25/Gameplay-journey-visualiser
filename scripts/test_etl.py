"""Run focused ETL tests. Integration tests use an isolated temporary schema/bucket."""

from pathlib import Path
import sys
import unittest

root = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(root / 'services/etl'))
tests = unittest.defaultTestLoader.discover(str(root / 'services/etl/tests'))
result = unittest.TextTestRunner(verbosity=2).run(tests)
sys.exit(not result.wasSuccessful())
