from dataclasses import replace
import os
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch
from uuid import uuid4

import psycopg
from psycopg import sql
from psycopg.conninfo import make_conninfo
from minio.deleteobjects import DeleteObject

from lila_etl.config import Settings
from lila_etl.pipeline import run_pipeline
from lila_etl.storage import ObjectStore
from lila_etl.transform import start_spark
from fixtures import FIRST_MATCH, HUMAN, recording


@unittest.skipUnless(os.environ.get('LILA_TEST_DATABASE_URL'), 'Set LILA_TEST_DATABASE_URL to run isolated PostgreSQL/MinIO integration tests.')
class PipelineTests(unittest.TestCase):
    def write_recordings(self, recordings):
        # Finish fixture creation before the pipeline owns its Spark session.
        spark = start_spark('local[2]')
        spark.sparkContext.setLogLevel('ERROR')
        try:
            for path, options in recordings:
                recording(spark, path, **options)
        finally:
            spark.stop()

    def test_incremental_import_retries_duplicate_policy_and_failure_rollback(self):
        schema = 'test_' + uuid4().hex
        original_url = os.environ['LILA_TEST_DATABASE_URL']
        with psycopg.connect(original_url, autocommit=True) as admin:
            admin.execute(sql.SQL('CREATE SCHEMA {}').format(sql.Identifier(schema)))
        settings = replace(Settings.from_environment(),
            database_url=make_conninfo(original_url, options=f'-c search_path={schema}'),
            storage_bucket='lila-test-' + uuid4().hex)
        store = ObjectStore(settings)
        store.ensure_bucket()
        try:
            with TemporaryDirectory() as working:
                directory = Path(working)
                # A cloud installation can start before anybody uploads data.
                self.assertEqual(run_pipeline(settings)['processed_rows'], 0)
                first = directory / '2026-02-10' / f'{HUMAN}_{FIRST_MATCH}'
                self.write_recordings([(first, {})])
                duplicate = directory / '2026-02-11' / first.name
                duplicate.parent.mkdir()
                duplicate.write_bytes(first.read_bytes())
                self.assertEqual(store.upload_sources(directory)['uploaded_files'], 2)
                self.assertEqual(len(store.list_landing_sources(settings.dataset_year)), 2)
                self.assertEqual(store.list_sources(), [])
                first_run = run_pipeline(settings)
                self.assertEqual(first_run['processed_rows'], 7)
                self.assertEqual(first_run['duplicate_files'], 1)
                self.assertEqual(first_run['landing']['checked_files'], 2)
                self.assertEqual(first_run['landing']['archived_files'], 2)
                self.assertEqual(first_run['landing']['date_mismatches'], [{
                    'object_key': f'landing/2026-02-11/{first.name}',
                    'folder_date': '2026-02-11', 'sampled_event_date': '2026-02-10',
                }])
                for source in store.list_sources():
                    self.assertEqual(store.object_hash(source['object_key']), source['content_hash'])
                self.assertEqual(store.upload_sources(directory)['unchanged_files'], 2)
                with psycopg.connect(settings.database_url) as connection:
                    before = connection.execute('SELECT id FROM events ORDER BY id').fetchall()
                    self.assertEqual(len(before), 7)
                    self.assertEqual(connection.execute("SELECT count(*) FROM events WHERE event_type='Loot'").fetchone()[0], 2)
                    self.assertEqual(connection.execute("SELECT count(*) FROM events WHERE post_death_position").fetchone()[0], 1)
                    self.assertEqual(connection.execute("SELECT source_path FROM source_files WHERE status='loaded'").fetchone()[0], f'2026-02-10/{first.name}')
                    self.assertEqual(connection.execute('''
                        SELECT event_date::text, event_count, humans, bots FROM match_summaries
                        WHERE match_id=%s ORDER BY event_date NULLS FIRST
                    ''', (FIRST_MATCH,)).fetchall(), [
                        (None, 7, 1, 0), ('2026-02-10', 1, 1, 0), ('2026-02-11', 6, 1, 0),
                    ])
                # Neither Landing nor downstream processing should start Spark
                # when the object versions and rule versions are unchanged.
                with patch('lila_etl.landing.start_spark') as landing_spark, patch('lila_etl.pipeline.start_spark') as pipeline_spark:
                    repeated = run_pipeline(settings)
                    landing_spark.assert_not_called()
                    pipeline_spark.assert_not_called()
                self.assertEqual(repeated['processed_rows'], 0)
                self.assertEqual(repeated['landing']['checked_files'], 0)
                self.assertEqual(repeated['landing']['unchanged_files'], 2)
                with psycopg.connect(settings.database_url) as connection:
                    self.assertEqual(connection.execute('SELECT id FROM events ORDER BY id').fetchall(), before)
                    self.assertEqual(connection.execute('SELECT count(*) FROM match_summaries').fetchone()[0], 3)

                # The same bot ID in two matches creates two recorded participants.
                second_match = 'test-match-b.nakama-0'
                self.write_recordings([
                    (directory / '2026-02-11' / f'1428_{FIRST_MATCH}', {'actor': '1428', 'events': [('BotPosition', 4)]}),
                    (directory / '2026-02-12' / f'1428_{second_match}', {'actor': '1428', 'match': second_match, 'events': [('BotPosition', 30)]}),
                ])
                # Simulate a cloud uploader: write directly to MinIO without
                # using the optional local upload command or supplying a hash.
                for path in directory.rglob('1428_*'):
                    store.client.fput_object(store.bucket, f'landing/{path.relative_to(directory).as_posix()}', str(path))
                updated = run_pipeline(settings)
                self.assertEqual(updated['landing']['checked_files'], 2)
                self.assertEqual(set(updated['affected_matches']), {FIRST_MATCH, second_match})
                with psycopg.connect(settings.database_url) as connection:
                    self.assertEqual(connection.execute('SELECT count(*) FROM events').fetchone()[0], 9)
                    self.assertEqual(connection.execute("SELECT count(*) FROM match_participants WHERE source_user_id='1428'").fetchone()[0], 2)
                    summaries = connection.execute('''
                        SELECT match_id, event_date::text, event_count, humans, bots FROM match_summaries
                        ORDER BY match_id, event_date NULLS FIRST
                    ''').fetchall()
                    self.assertEqual([row[1:] for row in summaries if row[0] == FIRST_MATCH], [
                        (None, 8, 1, 1), ('2026-02-10', 1, 1, 0), ('2026-02-11', 7, 1, 1),
                    ])

                bad_match = 'test-invalid.nakama-0'
                self.write_recordings([
                    (directory / '2026-02-12' / f'{HUMAN}_{bad_match}', {'match': bad_match, 'map_id': 'UnknownMap'}),
                ])
                store.upload_sources(directory)
                with self.assertRaises(ValueError):
                    run_pipeline(settings)
                with psycopg.connect(settings.database_url) as connection:
                    self.assertEqual(connection.execute('SELECT count(*) FROM events').fetchone()[0], 9)
                    self.assertEqual(connection.execute("SELECT count(*) FROM etl_runs WHERE status='failed'").fetchone()[0], 1)
                    self.assertEqual(connection.execute('''
                        SELECT match_id, event_date::text, event_count, humans, bots FROM match_summaries
                        ORDER BY match_id, event_date NULLS FIRST
                    ''').fetchall(), summaries)

                # A failed worker must report the source hash error, rather than
                # letting a partially downloaded batch reach publication.
                corrupt_key = f"raw/{'0' * 64}/2026-02-12/{HUMAN}_test-corrupt.nakama-0"
                store.client.fput_object(store.bucket, corrupt_key, str(first))
                with self.assertRaisesRegex(ValueError, 'no longer match its hash'):
                    run_pipeline(settings)
                with psycopg.connect(settings.database_url) as connection:
                    self.assertEqual(connection.execute('SELECT count(*) FROM events').fetchone()[0], 9)
                    self.assertEqual(connection.execute("SELECT count(*) FROM etl_runs WHERE status='failed'").fetchone()[0], 2)
        finally:
            objects = [DeleteObject(item.object_name) for item in store.client.list_objects(store.bucket, recursive=True)]
            errors = list(store.client.remove_objects(store.bucket, objects))
            if not errors:
                store.client.remove_bucket(store.bucket)
            with psycopg.connect(original_url, autocommit=True) as admin:
                admin.execute(sql.SQL('DROP SCHEMA {} CASCADE').format(sql.Identifier(schema)))
