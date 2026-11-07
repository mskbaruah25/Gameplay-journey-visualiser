"""Coordinate file discovery, affected-match processing, and publication."""

from datetime import datetime, timezone
import logging
from pathlib import Path
from tempfile import TemporaryDirectory
from uuid import uuid4

from psycopg.types.json import Jsonb

from .config import RULE_VERSION
from .database import connect, migrate, prepare_database_files, publish
from .landing import promote_landing_files
from .source import read_sources
from .storage import ObjectStore, collection_date
from .transform import start_spark, transform_events


logger = logging.getLogger(__name__)


def run_pipeline(settings, rebuild=False):
    store = ObjectStore(settings)
    store.ensure_bucket()
    run_id = str(uuid4())
    report = {'run_id': run_id, 'rule_version': RULE_VERSION, 'status': 'running', 'combat_counting': 'retained_event_rows',
              'started_at': datetime.now(timezone.utc).isoformat()}
    spark = source_events = events = event_files = None
    with connect(settings.database_url) as connection:
        migrate(connection)
        # A second ingestion job must not make decisions from a half-finished registry.
        if not connection.execute('SELECT pg_try_advisory_lock(64821102) AS locked').fetchone()['locked']:
            raise RuntimeError('Another ingestion job is already running.')
        connection.execute('INSERT INTO etl_runs (id, rule_version, status) VALUES (%s,%s,\'running\')', (run_id, RULE_VERSION))
        try:
            with TemporaryDirectory(prefix='lila-etl-') as working:
                directory = Path(working)
                report['landing'] = {}
                promote_landing_files(store, settings, directory / 'landing', report['landing'])
                sources = store.list_sources()
                versions = {}
                for source in sources:
                    previous_hash = versions.setdefault(source['source_path'], source['content_hash'])
                    if previous_hash != source['content_hash']:
                        raise ValueError(
                            f"Conflicting versions of {source['source_path']}. "
                            'Use a new source path for additional recordings; replacement snapshots need an explicit replacement policy.'
                        )
                known = {row['object_key']: row for row in connection.execute('SELECT * FROM source_files WHERE bucket=%s', (store.bucket,))}
                missing = set(known) - {row['object_key'] for row in sources}
                if missing:
                    raise ValueError('Previously imported raw objects are missing. Refusing to silently retract their events.')
                previous = connection.execute("SELECT rule_version FROM etl_runs WHERE status='succeeded' ORDER BY finished_at DESC LIMIT 1").fetchone()
                rebuild = rebuild or (previous is not None and previous['rule_version'] != RULE_VERSION)
                affected = set()
                canonical = {}
                new_sources = []
                # The original folder date determines first-copy order, not the upload time.
                for source in sources:
                    source['collection_date'] = collection_date(source['source_path'], settings.dataset_year)
                sources.sort(key=lambda row: (row['collection_date'], row['source_path'], row['object_key']))
                for source in sources:
                    old = known.get(source['object_key'])
                    if old and (old['etag'] != source['etag'] or old['size_bytes'] != source['size_bytes']):
                        raise ValueError(f"An immutable raw object was changed: {source['source_path']}")
                    if old:
                        source['row_count'] = old['row_count']
                        source['source_schema'] = old['source_schema']
                    else:
                        # Verify every new object's bytes, including later copies.
                        new_sources.append(source)
                        affected.add(source['expected_match_id'])
                    first = canonical.setdefault(source['content_hash'], source)
                    if (first['expected_match_id'], first['expected_user_id']) != (source['expected_match_id'], source['expected_user_id']):
                        raise ValueError('Identical file contents have inconsistent actor/match filenames.')
                    source['duplicate_of'] = first['id'] if first is not source else None
                    source['status'] = 'duplicate' if source['duplicate_of'] else 'loaded'
                    if rebuild or (old and str(old['duplicate_of'] or '') != str(source['duplicate_of'] or '')):
                        affected.add(source['expected_match_id'])
                selected = [row for row in sources if not row['duplicate_of'] and row['expected_match_id'] in affected]
                report.update({
                    'source_files': len(sources),
                    'duplicate_files': sum(bool(row['duplicate_of']) for row in sources),
                    'new_files': sum(row['object_key'] not in known for row in sources),
                    'affected_matches': sorted(affected),
                    'processed_rows': 0,
                })
                # Verify every new object's bytes, including excluded file copies,
                # and fetch retained originals needed for affected matches once.
                downloads = {row['id']: row for row in new_sources}
                downloads.update({row['id']: row for row in selected})
                logger.info('Downloading %s Raw files for validation and processing.', len(downloads))
                store.download_files(list(downloads.values()), directory)
                if selected:
                    input_directory = directory / 'recordings'
                    input_directory.mkdir()
                    for source in selected:
                        # Group retained originals for one Spark folder read.
                        path = directory / f"{source['id']}.parquet"
                        path.replace(input_directory / path.name)
                    spark = start_spark(settings.spark_master, settings.spark_driver_memory)
                    spark.sparkContext.setLogLevel('WARN')
                    source_events = read_sources(spark, selected, input_directory).cache()
                    report['processed_rows'] = sum(row['row_count'] for row in selected)
                    events = transform_events(source_events).cache()
                    if events.count() != report['processed_rows']:
                        raise ValueError('A transformation changed event multiplicity.')
                    report['event_counts'] = {row['event_type']: row['count'] for row in events.groupBy('event_type').count().collect()}
                    report['repeated_combat_rows'] = events.filter('repeated_combat').count()
                    report['post_death_position_rows'] = events.filter('post_death_position').count()
                    output = directory / 'processed'
                    events.coalesce(2).write.partitionBy('event_date').mode('overwrite').parquet(str(output))
                    # These are affected-match snapshots, each identified by its run report.
                    report['processed_prefix'] = f'processed/{run_id}'
                    store.upload_directory(output, report['processed_prefix'])
                    event_files = directory / 'database_rows'
                    prepare_database_files(events, event_files)
                    # Publication only needs these local files. Release Spark and
                    # its workers before PostgreSQL starts loading the rows.
                    events.unpersist()
                    source_events.unpersist()
                    spark.stop()
                    spark = source_events = events = None
                else:
                    report['event_counts'] = {}
                # A byte-identical copy has the same schema and row count as the
                # retained file, so it does not need another Spark scan.
                for source in sources:
                    retained = canonical[source['content_hash']]
                    source['row_count'] = retained['row_count']
                    source['source_schema'] = dict(retained['source_schema'])
                report['source_rows'] = sum(row['row_count'] for row in sources)
                report['excluded_file_rows'] = sum(row['row_count'] for row in sources if row['duplicate_of'])
                report['status'] = 'succeeded'
                publish(connection, sources, event_files, sorted(affected), run_id, report)
                try:
                    store.write_report(run_id, report)
                except Exception:
                    # PostgreSQL is the publication authority; its report was already committed.
                    logger.exception('Database publication succeeded, but the report upload failed. The report remains in etl_runs.')
                return report
        except Exception as error:
            message = str(error) or type(error).__name__
            report.update(status='failed', error=message)
            connection.execute("UPDATE etl_runs SET status='failed', finished_at=now(), report=%s, error_message=%s WHERE id=%s", (Jsonb(report), message, run_id))
            try:
                store.write_report(run_id, report)
            except Exception:
                logger.exception('Could not upload the failed-run report.')
            raise
        finally:
            try:
                if events is not None:
                    events.unpersist()
                if source_events is not None:
                    source_events.unpersist()
                if spark is not None:
                    spark.stop()
            except Exception:
                # A terminated JVM must not replace the original failure with a
                # cleanup error or prevent releasing the ingestion lock.
                logger.warning('Could not clean up the Spark session.', exc_info=True)
            connection.execute('SELECT pg_advisory_unlock(64821102)')
