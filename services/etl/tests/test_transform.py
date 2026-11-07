from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from uuid import NAMESPACE_URL, uuid5

from lila_etl.source import read_sources
from lila_etl.transform import start_spark, transform_events
from fixtures import FIRST_MATCH, HUMAN, recording


class TransformationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.spark = start_spark('local[2]')
        cls.spark.sparkContext.setLogLevel('ERROR')

    @classmethod
    def tearDownClass(cls):
        cls.spark.stop()

    def transform(self, directory, actor=HUMAN, map_id='Lockdown'):
        source = {'id': '22222222-2222-4222-8222-222222222222', 'content_hash': 'a' * 64,
                  'source_path': '2026-02-11/example', 'expected_match_id': FIRST_MATCH, 'expected_user_id': actor}
        source_path = directory / f"{source['id']}.parquet"
        recording(self.spark, source_path, actor=actor, map_id=map_id)
        return transform_events(read_sources(self.spark, [source], directory))

    def test_preserves_multiplicity_seconds_dates_and_late_positions(self):
        with TemporaryDirectory() as working:
            rows = self.transform(Path(working)).collect()
        self.assertEqual(len(rows), 7)
        self.assertEqual(len({row.id for row in rows}), 7)
        self.assertEqual(sum(row.event_type == 'Loot' for row in rows), 2)
        self.assertEqual(sum(row.repeated_combat for row in rows), 2)
        self.assertEqual(sum(row.post_death_position for row in rows), 1)
        self.assertEqual({str(row.event_date) for row in rows}, {'2026-02-10', '2026-02-11'})
        self.assertEqual(max(row.raw_timestamp_value for row in rows) - min(row.raw_timestamp_value for row in rows), 23)
        self.assertTrue(all(row.actor_type == 'human' for row in rows))
        self.assertTrue(all(0 <= row.minimap_x <= 1 and 0 <= row.minimap_y <= 1 for row in rows))

    def test_actor_type_follows_id_even_with_plain_position_labels(self):
        with TemporaryDirectory() as working:
            rows = self.transform(Path(working), actor='1428').collect()
        self.assertTrue(all(row.actor_type == 'bot' for row in rows))

    def test_physical_row_ids_preserve_duplicates_and_unsorted_timestamps(self):
        source = {'id': '22222222-2222-4222-8222-222222222222', 'content_hash': 'a' * 64,
                  'source_path': '2026-02-11/example', 'expected_match_id': FIRST_MATCH, 'expected_user_id': HUMAN}
        samples = [('Position', 23), ('Loot', 1), ('Loot', 1), ('Position', 0)]
        with TemporaryDirectory() as working:
            directory = Path(working)
            recording(self.spark, directory / f"{source['id']}.parquet", events=samples)
            rows = read_sources(self.spark, [source], directory).repartition(3).collect()
        rows.sort(key=lambda row: row.source_row_number)
        self.assertEqual([row.raw_timestamp_value for row in rows], [1770768022, 1770768000, 1770768000, 1770767999])
        self.assertEqual([row.source_row_number for row in rows], [0, 1, 2, 3])
        self.assertEqual([row.id for row in rows], [
            str(uuid5(NAMESPACE_URL, f"lila-event:{source['content_hash']}:{index}")) for index in range(4)
        ])
        self.assertEqual(source['row_count'], 4)

    def test_unknown_map_is_rejected(self):
        with TemporaryDirectory() as working:
            with self.assertRaisesRegex(ValueError, 'map is unknown'):
                self.transform(Path(working), map_id='UnknownMap')
