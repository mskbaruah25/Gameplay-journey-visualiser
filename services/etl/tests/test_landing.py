from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

from lila_etl.landing import sample_event_dates
from lila_etl.transform import start_spark
from fixtures import recording


class LandingDateTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.spark = start_spark('local[2]')
        cls.spark.sparkContext.setLogLevel('ERROR')

    @classmethod
    def tearDownClass(cls):
        cls.spark.stop()

    def test_samples_one_valid_physical_timestamp_in_each_file(self):
        with TemporaryDirectory() as working:
            directory = Path(working)
            # The first physical event is on February 11, although a later row
            # contains an earlier timestamp. Sampling must not sort the journey.
            recording(self.spark, directory / 'unsorted.parquet', events=[('Position', 23), ('Position', 0)])
            recording(self.spark, directory / 'null-first.parquet', events=[('Position', None), ('Position', 23)])
            # A passing sample does not prove that all other rows share its date.
            recording(self.spark, directory / 'cross-midnight.parquet', events=[('Position', 0), ('Position', 1)])
            self.assertEqual(sample_event_dates(self.spark, directory), {
                'unsorted': '2026-02-11', 'null-first': '2026-02-11', 'cross-midnight': '2026-02-10',
            })

    def test_empty_and_null_only_files_have_no_date_sample(self):
        with TemporaryDirectory() as working:
            directory = Path(working)
            recording(self.spark, directory / 'empty.parquet', events=[])
            recording(self.spark, directory / 'null-only.parquet', events=[('Position', None)])
            self.assertEqual(sample_event_dates(self.spark, directory), {})
