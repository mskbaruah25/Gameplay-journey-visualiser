"""Read original Parquet files with Spark and preserve their physical row identities."""

from pathlib import Path
from uuid import NAMESPACE_URL, uuid5

from pyspark.sql import functions as F
from pyspark.sql.types import StringType, TimestampType, TimestampNTZType


SOURCE_COLUMNS = {'user_id', 'match_id', 'map_id', 'x', 'y', 'z', 'ts', 'event'}


def read_sources(spark, sources: list[dict], directory: Path):
    """Read a batch and attach row counts/schema to its source-file records."""
    # A single input folder avoids a separate file-discovery task per path.
    events = spark.read.option('mergeSchema', 'true').parquet(str(directory))
    if set(events.columns) != SOURCE_COLUMNS:
        raise ValueError('Source recordings must contain exactly the eight expected columns.')
    if not isinstance(events.schema['ts'].dataType, (TimestampType, TimestampNTZType)):
        raise ValueError('A source timestamp column has changed type.')
    source_schema = {field.name: field.dataType.simpleString() for field in events.schema}

    # Capture the Parquet reader's zero-based physical row index before any join,
    # sorting, or repartitioning. Identical payloads still have different indexes.
    events = events.select(
        '*',
        F.col('_metadata.row_index').alias('source_row_number'),
        F.regexp_replace(F.col('_metadata.file_name'), r'\.parquet$', '').alias('source_file_id'),
    )
    row_counts = {
        row['source_file_id']: row['count']
        for row in events.groupBy('source_file_id').count().collect()
    }
    if set(row_counts) - {source['id'] for source in sources}:
        raise ValueError('The input folder contains recordings outside the selected inventory.')
    for source in sources:
        source['row_count'] = row_counts.get(source['id'], 0)
        source['source_schema'] = dict(source_schema)
        if source['row_count'] == 0:
            raise ValueError(f"Empty recording: {source['source_path']}")

    # Downloads use <source-file-id>.parquet names. Join the inventory once,
    # rather than starting a separate Spark read/job for every recording.
    inventory_rows = []
    for source in sources:
        participant_key = f"lila-participant:{source['expected_match_id']}:{source['expected_user_id']}"
        inventory_rows.append((
            source['id'], source['content_hash'],
            source['expected_user_id'], source['expected_match_id'],
            str(uuid5(NAMESPACE_URL, participant_key)),
        ))
    inventory = spark.createDataFrame(inventory_rows, [
        'source_file_id', 'content_hash', 'expected_user_id',
        'expected_match_id', 'participant_id',
    ])
    events = events.join(F.broadcast(inventory), 'source_file_id')

    def event_identifier(content_hash, row_number):
        return str(uuid5(NAMESPACE_URL, f'lila-event:{content_hash}:{row_number}'))

    # Keep the existing UUIDv5 format. This standard Python UDF does not use Arrow.
    make_event_id = F.udf(event_identifier, StringType(), useArrow=False)
    return (events
            # The source's timestamp label is milliseconds. Recover that integer
            # first; transform.py then applies our accepted seconds interpretation.
            .withColumn('raw_timestamp_value', F.unix_millis('ts'))
            .withColumn('id', make_event_id('content_hash', 'source_row_number'))
            .drop('ts', 'content_hash'))
