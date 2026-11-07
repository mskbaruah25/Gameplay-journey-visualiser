from pathlib import Path
from tempfile import TemporaryDirectory

from pyspark.sql import functions as F
from pyspark.sql.types import BinaryType, FloatType, LongType, StringType, StructField, StructType


HUMAN = '11111111-1111-4111-8111-111111111111'
FIRST_MATCH = 'test-match-a.nakama-0'
BASE_TIME = 1770767999  # 2026-02-10 23:59:59 UTC


def recording(spark, path: Path, actor=HUMAN, match=FIRST_MATCH, events=None, map_id='Lockdown'):
    if events is None:
        events = [('Position', 0), ('Loot', 1), ('Loot', 1), ('BotKill', 20),
                  ('BotKill', 20), ('BotKilled', 21), ('Position', 23)]
    schema = StructType([
        StructField('user_id', StringType()), StructField('match_id', StringType()),
        StructField('map_id', StringType()), StructField('x', FloatType()),
        StructField('y', FloatType()), StructField('z', FloatType()),
        StructField('raw_millis', LongType()), StructField('event', BinaryType()),
        StructField('fixture_order', LongType()),
    ])
    rows = [{'user_id': actor, 'match_id': match, 'map_id': map_id, 'x': float(index),
             'y': 20.0, 'z': 10.0, 'raw_millis': BASE_TIME + offset if offset is not None else None,
             'event': label.encode(), 'fixture_order': index}
            for index, (label, offset) in enumerate(events)]
    # The two kill rows and the two loot rows deliberately have identical payloads.
    for index in range(1, len(rows)):
        if rows[index]['event'] == rows[index - 1]['event'] and rows[index]['raw_millis'] == rows[index - 1]['raw_millis']:
            rows[index]['x'] = rows[index - 1]['x']
    path.parent.mkdir(parents=True, exist_ok=True)
    records = (spark.createDataFrame(rows, schema)
               .coalesce(1)
               .sortWithinPartitions('fixture_order')
               .withColumn('ts', F.timestamp_millis('raw_millis'))
               .drop('raw_millis', 'fixture_order'))
    previous_type = spark.conf.get('spark.sql.parquet.outputTimestampType')
    try:
        # Match the supplied dataset's millisecond Parquet annotation.
        spark.conf.set('spark.sql.parquet.outputTimestampType', 'TIMESTAMP_MILLIS')
        with TemporaryDirectory(prefix='fixture-', dir=path.parent) as working:
            output = Path(working) / 'parquet'
            records.write.parquet(str(output))
            # Spark writes a directory; ingestion expects one recording file.
            next(output.glob('part-*.parquet')).replace(path)
    finally:
        spark.conf.set('spark.sql.parquet.outputTimestampType', previous_type)
