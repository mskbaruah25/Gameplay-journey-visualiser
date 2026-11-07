"""Check a sampled event date, then archive the original Landing objects in Raw."""

import logging
from pathlib import Path

from pyspark.sql import functions as F
from pyspark.sql.types import TimestampType, TimestampNTZType

from .storage import file_hash
from .transform import start_spark


logger = logging.getLogger(__name__)
LANDING_RULE_VERSION = '2026-11-06-v1'


def sample_event_dates(spark, directory: Path) -> dict:
    """Return the date of the first non-null physical timestamp in each file.

    This is a sample check under the one-date-per-file input contract. It does
    not establish that every row in a recording has the same date.
    """
    recordings = spark.read.option('mergeSchema', 'true').parquet(str(directory))
    if 'ts' not in recordings.columns or not isinstance(recordings.schema['ts'].dataType, (TimestampType, TimestampNTZType)):
        raise ValueError('Landing recordings need a Parquet timestamp column named ts.')
    timestamps = recordings.select(
        F.regexp_replace(F.col('_metadata.file_name'), r'\.parquet$', '').alias('file_id'),
        F.col('_metadata.row_index').alias('row_number'),
        F.unix_millis('ts').alias('raw_timestamp_value'),
    )
    # Ordering by physical row index makes the sample stable even when source
    # timestamps are unsorted. Only one event date per file is compared.
    samples = (timestamps.filter(F.col('raw_timestamp_value').isNotNull())
               .groupBy('file_id')
               .agg(F.min(F.struct('row_number', 'raw_timestamp_value')).alias('sample'))
               .withColumn('event_date', F.to_date(F.timestamp_seconds('sample.raw_timestamp_value'))))
    return {row.file_id: row.event_date.isoformat() for row in samples.collect()}


def promote_landing_files(store, settings, directory: Path, report: dict):
    """Called under the pipeline lock; receipts make unchanged reruns inexpensive."""
    sources = store.list_landing_sources(settings.dataset_year)
    report.update(rule_version=LANDING_RULE_VERSION, date_check='first_valid_timestamp_only',
                  discovered_files=len(sources), checked_files=0, archived_files=0,
                  unchanged_files=0, date_mismatches=[])
    if not sources:
        return

    manifest = store.read_landing_manifest()
    receipts = manifest['files']
    raw_keys = {source['object_key'] for source in store.list_sources()}
    pending = []
    for source in sources:
        receipt = receipts.get(source['object_key'], {})
        unchanged = (receipt.get('rule_version') == LANDING_RULE_VERSION
                     and receipt.get('etag') == source['etag']
                     and receipt.get('size_bytes') == source['size_bytes']
                     and receipt.get('folder_date') == source['folder_date']
                     and receipt.get('raw_object_key') in raw_keys)
        if unchanged:
            report['unchanged_files'] += 1
        else:
            pending.append(source)

    if pending:
        directory.mkdir()
        for source in pending:
            store.download_landing(source, directory)
        spark = start_spark(settings.spark_master, settings.spark_driver_memory)
        try:
            spark.sparkContext.setLogLevel('WARN')
            dates = sample_event_dates(spark, directory)
        finally:
            spark.stop()
        for source in pending:
            sampled_date = dates.get(source['id'])
            if sampled_date is None:
                raise ValueError(f"No valid timestamp to check in {source['object_key']}")
            path = directory / f"{source['id']}.parquet"
            content_hash = file_hash(path)
            raw_key = f"raw/{content_hash}/{source['source_path']}"
            if raw_key not in raw_keys:
                store.client.fput_object(store.bucket, raw_key, str(path), content_type='application/octet-stream')
                raw_keys.add(raw_key)
                report['archived_files'] += 1
            receipts[source['object_key']] = {
                'rule_version': LANDING_RULE_VERSION,
                'etag': source['etag'], 'size_bytes': source['size_bytes'],
                'raw_object_key': raw_key, 'content_hash': content_hash,
                'folder_date': source['folder_date'], 'sampled_event_date': sampled_date,
                'date_status': 'matched' if source['folder_date'] == sampled_date else 'mismatch',
            }
            report['checked_files'] += 1
        # Archive/check receipts are independent of database publication. A
        # downstream failure can safely reuse them when the run is retried.
        store.write_landing_manifest(manifest)

    for source in sources:
        receipt = receipts[source['object_key']]
        if receipt['date_status'] == 'mismatch':
            mismatch = {'object_key': source['object_key'], 'folder_date': receipt['folder_date'],
                        'sampled_event_date': receipt['sampled_event_date']}
            report['date_mismatches'].append(mismatch)
            logger.warning('Landing date mismatch for %s: folder=%s, sampled UTC event date=%s. Keeping the original file.',
                           source['object_key'], receipt['folder_date'], receipt['sampled_event_date'])
